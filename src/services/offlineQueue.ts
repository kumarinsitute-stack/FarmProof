/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * FarmProof Offline & Low-Connectivity Service
 * Provides local draft persistence, upload queuing, retry, duplicate detection,
 * blur estimation, and 72-hour statutory window SLA countdown tracking.
 */

import { CapturedPhoto, Claim } from '../types';

export interface QueuedEvidenceItem {
  id: number;
  label: string;
  dataUrl: string;
  name: string;
  gps: string;
  accuracyMeters: number;
  timestamp: string;
  date: string;
  isLiveCapture: boolean;
  captureMethod: 'live_camera' | 'gallery_upload';
  blurScore?: number;
  isBlurry?: boolean;
  hash: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  uploadedUrl?: string;
  retryCount: number;
  error?: string;
}

const DRAFT_STORAGE_KEY = 'farmproof_claim_draft_v1';
const QUEUE_STORAGE_KEY = 'farmproof_evidence_queue_v1';

// Fast string hash generator for duplicate detection
export function computeImageHash(dataUrl: string): string {
  let hash = 0;
  // Sample 2000 characters across the string to be fast and deterministic
  const step = Math.max(1, Math.floor(dataUrl.length / 2000));
  for (let i = 0; i < dataUrl.length; i += step) {
    const char = dataUrl.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `img-hash-${Math.abs(hash)}-${dataUrl.length}`;
}

// Client-side image blur & quality detection using Laplacian gradient variance
export function analyzeImageClarity(canvas: HTMLCanvasElement): { isBlurry: boolean; blurScore: number; reason?: string } {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { isBlurry: false, blurScore: 150 };

    // Work on a small sample box (e.g. 160x160) for instantaneous speed
    const sampleW = Math.min(160, canvas.width);
    const sampleH = Math.min(160, canvas.height);
    const startX = Math.floor((canvas.width - sampleW) / 2);
    const startY = Math.floor((canvas.height - sampleH) / 2);

    const imgData = ctx.getImageData(startX, startY, sampleW, sampleH);
    const data = imgData.data;

    // Convert to grayscale luminance
    const gray: number[] = new Array(sampleW * sampleH);
    for (let i = 0; i < gray.length; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // Compute Laplacian gradient: L(x,y) = 4*I(x,y) - I(x+1,y) - I(x-1,y) - I(x,y+1) - I(x,y-1)
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < sampleH - 1; y++) {
      for (let x = 1; x < sampleW - 1; x++) {
        const center = gray[y * sampleW + x];
        const lap =
          4 * center -
          gray[y * sampleW + (x - 1)] -
          gray[y * sampleW + (x + 1)] -
          gray[(y - 1) * sampleW + x] -
          gray[(y + 1) * sampleW + x];

        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }

    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    const blurScore = Math.round(variance);

    // Threshold: images with gradient variance below 85 typically lack sharp crop edges or focus
    const isBlurry = blurScore < 85;

    return {
      isBlurry,
      blurScore,
      reason: isBlurry
        ? 'Image appears out-of-focus or lacking sharp edge contrast. Retake with better lighting or tap to focus.'
        : undefined
    };
  } catch (e) {
    return { isBlurry: false, blurScore: 120 };
  }
}

// 72-Hour PMFBY Statutory Mandate SLA Window Calculator
export function calculate72HourSla(submissionOrIncidentDate?: string): {
  remainingHours: number;
  remainingMinutes: number;
  isUrgent: boolean; // < 24 hours left
  isCritical: boolean; // < 12 hours left
  isExpired: boolean;
  formattedText: string;
} {
  let startTime = Date.now();
  if (submissionOrIncidentDate) {
    const parsed = Date.parse(submissionOrIncidentDate);
    if (!isNaN(parsed)) {
      startTime = parsed;
    }
  }

  // 72 hours window in milliseconds
  const windowMs = 72 * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, Date.now() - startTime);
  const remainingMs = windowMs - elapsedMs;

  if (remainingMs <= 0) {
    return {
      remainingHours: 0,
      remainingMinutes: 0,
      isUrgent: true,
      isCritical: true,
      isExpired: true,
      formattedText: '72h Statutory Window Expired (Special Officer Condonation Required)'
    };
  }

  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  return {
    remainingHours,
    remainingMinutes,
    isUrgent: remainingHours < 24,
    isCritical: remainingHours < 12,
    isExpired: false,
    formattedText: `${remainingHours}h ${remainingMinutes}m remaining in statutory window`
  };
}

export const offlineService = {
  // --- Local Draft Management ---
  saveClaimDraft(draft: Record<string, any>): void {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        ...draft,
        _savedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Could not save draft to localStorage:', e);
    }
  },

  getClaimDraft(): Record<string, any> | null {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  loadDraft(): Record<string, any> | null {
    return this.getClaimDraft();
  },

  clearClaimDraft(): void {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
  },

  clearDraft(): void {
    this.clearClaimDraft();
  },

  // --- Evidence Upload Queue ---
  getQueue(): QueuedEvidenceItem[] {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveQueue(items: QueuedEvidenceItem[]): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not persist evidence queue:', e);
    }
  },

  enqueuePhoto(photo: {
    id: number;
    label: string;
    dataUrl: string;
    name: string;
    gps: string;
    accuracyMeters: number;
    timestamp: string;
    date: string;
    isLiveCapture: boolean;
    captureMethod: 'live_camera' | 'gallery_upload';
    blurScore?: number;
    isBlurry?: boolean;
  }): QueuedEvidenceItem {
    const items = this.getQueue();
    const hash = computeImageHash(photo.dataUrl);

    // Check duplicate
    const isDuplicate = items.some((item) => item.hash === hash);
    if (isDuplicate) {
      throw new Error(`Duplicate Evidence Detected: This photograph matches an image already captured in your evidence set.`);
    }

    const newItem: QueuedEvidenceItem = {
      ...photo,
      hash,
      status: 'pending',
      retryCount: 0
    };

    items.push(newItem);
    this.saveQueue(items);
    return newItem;
  },

  removeQueueItem(id: number): void {
    const items = this.getQueue().filter((item) => item.id !== id);
    this.saveQueue(items);
  },

  clearQueue(): void {
    try {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch {
      // ignore
    }
  },

  // Process all pending items in the upload queue
  async processQueue(
    uploadFn: (name: string, dataUrl: string) => Promise<{ url: string }>
  ): Promise<{ uploaded: number; failed: number }> {
    const items = this.getQueue();
    if (items.length === 0) return { uploaded: 0, failed: 0 };

    let uploadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 'uploaded') {
        uploadedCount++;
        continue;
      }

      item.status = 'uploading';
      this.saveQueue(items);

      try {
        const result = await uploadFn(item.name, item.dataUrl);
        item.status = 'uploaded';
        item.uploadedUrl = result.url;
        item.error = undefined;
        uploadedCount++;
      } catch (err: any) {
        item.status = 'failed';
        item.retryCount += 1;
        item.error = err?.message || 'Network upload failed';
        failedCount++;
      }

      this.saveQueue(items);
    }

    return { uploaded: uploadedCount, failed: failedCount };
  }
};
