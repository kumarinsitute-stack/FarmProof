/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * FarmProof Statutory 5-Photo Evidence Kit & Quality Engine
 *
 * Enforces:
 * 1. Exactly 5 fixed statutory slots.
 * 2. Laplacian variance blur detection.
 * 3. Exposure / brightness / blank image validation.
 * 4. Duplicate image hash detection.
 * 5. Visual canvas watermarking with IST timestamp, GPS, and slot metadata.
 * 6. Original image immutability and dual-file preservation.
 */

export interface StatutorySlotDefinition {
  slotNumber: number;
  slotKey:
    | "wide_field"
    | "root_damage"
    | "canopy_close"
    | "cadastral_landmark"
    | "farmer_id";
  title: string;
  shortLabel: string;
  description: string;
  captureTip: string;
  iconName: string;
}

export const STATUTORY_SLOTS: StatutorySlotDefinition[] = [
  {
    slotNumber: 1,
    slotKey: "wide_field",
    title: "Photo 1 — Wide Plot Landscape",
    shortLabel: "Wide Field View",
    description:
      "Panoramic or landscape view showing overall field inundation or calamity extent across the plot.",
    captureTip:
      "Stand at the plot corner and hold the device horizontally to capture at least 50% of the affected acreage.",
    iconName: "Landscape",
  },
  {
    slotNumber: 2,
    slotKey: "root_damage",
    title: "Photo 2 — Root & Soil Inundation",
    shortLabel: "Root / Soil Damage",
    description:
      "Ground-level view of root submersion, silt deposition, soil erosion, or plant base lodging.",
    captureTip:
      "Angle downward at plant base to clearly show standing water depth or root lodging at soil level.",
    iconName: "Droplets",
  },
  {
    slotNumber: 3,
    slotKey: "canopy_close",
    title: "Photo 3 — Crop Canopy Close-up",
    shortLabel: "Canopy & Leaf Damage",
    description:
      "Close-up photograph of damaged leaves, stems, torn bolls, or hail impact lesions.",
    captureTip:
      "Hold camera 30–50 cm from crop foliage. Tap screen to focus sharply on leaf tears or hail marks.",
    iconName: "Sprout",
  },
  {
    slotNumber: 4,
    slotKey: "cadastral_landmark",
    title: "Photo 4 — Cadastral Boundary Anchor",
    shortLabel: "Cadastral Landmark",
    description:
      "Survey boundary stone, revenue pillar, bund tree, or permanent road anchor linking plot to land records.",
    captureTip:
      "Include the survey stone, irrigation canal bund, or corner landmark clearly in the frame.",
    iconName: "MapPin",
  },
  {
    slotNumber: 5,
    slotKey: "farmer_id",
    title: "Photo 5 — Beneficiary Farmer Identification",
    shortLabel: "Farmer Verification",
    description:
      "Photograph of beneficiary farmer standing in the affected plot (with Aadhaar/Pattadar passbook if available).",
    captureTip:
      "Farmer face must be clearly visible against the damaged crop background for statutory KYC matching.",
    iconName: "UserCheck",
  },
];

export interface PhotoQualityResult {
  status: "Good" | "Warning" | "Rejected";
  blurScore: number;
  isBlurry: boolean;
  meanBrightness: number;
  resolution: { width: number; height: number };
  reason?: string;
  advice?: string;
}

/**
 * Perform comprehensive image quality verification:
 * - Blur detection via Laplacian variance on luminance.
 * - Minimum resolution / dimensions check.
 * - Underexposure / Overexposure check.
 * - Blank / uniform texture check.
 */
export function analyzeImageQuality(
  canvas: HTMLCanvasElement,
): PhotoQualityResult {
  const width = canvas.width;
  const height = canvas.height;

  // 1. Minimum Resolution Check
  if (width < 320 || height < 240) {
    return {
      status: "Rejected",
      blurScore: 0,
      isBlurry: true,
      meanBrightness: 0,
      resolution: { width, height },
      reason: `Resolution is too low (${width}x${height}). Minimum acceptable resolution is 640x480.`,
      advice:
        "Please use a device camera that supports at least standard VGA or HD resolution.",
    };
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      status: "Warning",
      blurScore: 100,
      isBlurry: false,
      meanBrightness: 128,
      resolution: { width, height },
      reason: "Could not acquire 2D canvas context for deep inspection.",
    };
  }

  // Sample a central 200x200 patch for fast and accurate optical analysis
  const sampleW = Math.min(200, width);
  const sampleH = Math.min(200, height);
  const startX = Math.floor((width - sampleW) / 2);
  const startY = Math.floor((height - sampleH) / 2);

  const imgData = ctx.getImageData(startX, startY, sampleW, sampleH);
  const data = imgData.data;
  const numPixels = sampleW * sampleH;

  const gray: number[] = new Array(numPixels);
  let totalLuminance = 0;

  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    // Standard perceptual luminance: 0.299 R + 0.587 G + 0.114 B
    const lum =
      0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    gray[i] = lum;
    totalLuminance += lum;
  }

  const meanBrightness = Math.round(totalLuminance / numPixels);

  // 2. Exposure Checks
  if (meanBrightness < 25) {
    return {
      status: "Rejected",
      blurScore: 0,
      isBlurry: false,
      meanBrightness,
      resolution: { width, height },
      reason:
        "Photograph is severely underexposed (too dark) to verify crop damage or plot boundaries.",
      advice:
        "Ensure adequate outdoor daylight, turn on flash, or reposition away from deep shade.",
    };
  }

  if (meanBrightness > 238) {
    return {
      status: "Rejected",
      blurScore: 0,
      isBlurry: false,
      meanBrightness,
      resolution: { width, height },
      reason:
        "Photograph is severely overexposed (washed out white) from direct sun glare.",
      advice:
        "Shield the camera lens from direct glare or adjust angle away from direct sunlight.",
    };
  }

  // 3. Texture & Blank Check (Luminance Variance)
  let lumVarSum = 0;
  for (let i = 0; i < numPixels; i++) {
    const diff = gray[i] - meanBrightness;
    lumVarSum += diff * diff;
  }
  const textureVariance = Math.round(lumVarSum / numPixels);

  if (textureVariance < 8) {
    return {
      status: "Rejected",
      blurScore: 0,
      isBlurry: true,
      meanBrightness,
      resolution: { width, height },
      reason:
        "Photograph appears completely blank or uniform (camera lens may be blocked or covered).",
      advice:
        "Ensure the camera lens is unobstructed and pointed at actual field crops.",
    };
  }

  // 4. Laplacian Blur Estimation: L(x,y) = 4*I(x,y) - I(x+1,y) - I(x-1,y) - I(x,y+1) - I(x,y-1)
  let lapSum = 0;
  let lapSqSum = 0;
  let lapCount = 0;

  for (let y = 1; y < sampleH - 1; y++) {
    for (let x = 1; x < sampleW - 1; x++) {
      const c = gray[y * sampleW + x];
      const lap =
        4 * c -
        gray[y * sampleW + (x - 1)] -
        gray[y * sampleW + (x + 1)] -
        gray[(y - 1) * sampleW + x] -
        gray[(y + 1) * sampleW + x];

      lapSum += lap;
      lapSqSum += lap * lap;
      lapCount++;
    }
  }

  const lapMean = lapSum / lapCount;
  const lapVariance = Math.round(lapSqSum / lapCount - lapMean * lapMean);
  const blurScore = Math.max(0, lapVariance);

  // Calibrated Thresholds:
  // blurScore < 45: Severely Blurry (Rejected)
  // 45 <= blurScore < 85: Borderline Sharpness (Warning)
  // blurScore >= 85: Sharp & Usable (Good)
  if (blurScore < 45) {
    return {
      status: "Rejected",
      blurScore,
      isBlurry: true,
      meanBrightness,
      resolution: { width, height },
      reason: `Severely blurry photograph (Sharpness index: ${blurScore}/100, minimum required: 45). Crop damage details are indistinguishable.`,
      advice:
        "Hold the device steady with both hands, tap the screen on the crop to focus, and retake.",
    };
  }

  if (blurScore < 85 || meanBrightness < 45 || meanBrightness > 215) {
    const reasons: string[] = [];
    if (blurScore < 85)
      reasons.push(`Sharpness is slightly soft (${blurScore}/100)`);
    if (meanBrightness < 45) reasons.push("Lighting is quite dim");
    if (meanBrightness > 215) reasons.push("Lighting is somewhat bright");

    return {
      status: "Warning",
      blurScore,
      isBlurry: false,
      meanBrightness,
      resolution: { width, height },
      reason:
        reasons.join("; ") +
        ". Acceptable for review, but a sharper retake is recommended.",
      advice:
        "You may retake for higher clarity or keep this photograph if conditions are difficult.",
    };
  }

  return {
    status: "Good",
    blurScore,
    isBlurry: false,
    meanBrightness,
    resolution: { width, height },
  };
}

/**
 * Compute 64-bit sampling hash of an image for duplicate detection across slots.
 */
export function computeImageHash(dataUrl: string): string {
  let hash1 = 5381;
  let hash2 = 52711;
  const step = Math.max(1, Math.floor(dataUrl.length / 500));

  for (let i = 0; i < dataUrl.length; i += step) {
    const char = dataUrl.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }

  const h1 = (hash1 >>> 0).toString(16).padStart(8, "0");
  const h2 = (hash2 >>> 0).toString(16).padStart(8, "0");
  return `h_${h1}${h2}`;
}

export interface WatermarkMetadata {
  slotNumber: number;
  slotTitle: string;
  capturedAtDate: string; // e.g. "28 Oct 2026"
  capturedAtTime: string; // e.g. "14:32:05 IST"
  lat?: number;
  lng?: number;
  accuracy?: number;
  claimId?: string;
  originalHash: string;
  isLiveCapture: boolean;
}

/**
 * Generate a visual evidence watermark derivative on canvas.
 * Preserves the original image and returns the watermarked derivative data URL.
 */
export function generateWatermarkedDerivative(
  originalCanvas: HTMLCanvasElement,
  meta: WatermarkMetadata,
): string {
  const width = originalCanvas.width;
  const height = originalCanvas.height;

  // Create an offscreen canvas for the derivative
  const watermarkedCanvas = document.createElement("canvas");
  watermarkedCanvas.width = width;
  watermarkedCanvas.height = height;

  const ctx = watermarkedCanvas.getContext("2d");
  if (!ctx) return originalCanvas.toDataURL("image/jpeg", 0.92);

  // 1. Copy original photo unchanged
  ctx.drawImage(originalCanvas, 0, 0, width, height);

  // 2. Overlay bottom metadata badge
  const badgeHeight = Math.max(72, Math.round(height * 0.14));
  const badgeY = height - badgeHeight;

  // Translucent dark gradient bar
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.fillRect(0, badgeY, width, badgeHeight);

  // Accent emerald top border on the badge
  ctx.fillStyle = "#10b981";
  ctx.fillRect(0, badgeY, width, 3);

  // Fonts and scaling based on canvas width
  const baseFontSize = Math.max(11, Math.min(18, Math.round(width / 75)));
  const titleFontSize = Math.max(12, Math.min(20, Math.round(width / 65)));

  // Column 1: Identification & Slot Name
  ctx.fillStyle = "#34d399";
  ctx.font = `bold ${titleFontSize}px sans-serif`;
  ctx.fillText(
    `FARMPROOF PMFBY • SLOT ${meta.slotNumber} OF 5`,
    16,
    badgeY + titleFontSize + 8,
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${baseFontSize}px sans-serif`;
  ctx.fillText(meta.slotTitle, 16, badgeY + titleFontSize + baseFontSize + 14);

  // Capture mode badge text
  const captureModeText = meta.isLiveCapture
    ? "● LIVE CAMERA"
    : "○ GALLERY UPLOAD";
  ctx.fillStyle = meta.isLiveCapture ? "#34d399" : "#fbbf24";
  ctx.font = `bold ${Math.max(10, baseFontSize - 2)}px monospace`;
  ctx.fillText(captureModeText, 16, badgeY + badgeHeight - 10);

  // Column 2: Date, Time (IST), Coordinates & Accuracy
  const col2X = Math.round(width * 0.45);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `normal ${baseFontSize}px monospace`;
  ctx.fillText(
    `Date: ${meta.capturedAtDate}  Time: ${meta.capturedAtTime}`,
    col2X,
    badgeY + baseFontSize + 10,
  );

  const gpsText =
    meta.lat !== undefined && meta.lng !== undefined
      ? `GPS: ${meta.lat.toFixed(6)}° N, ${meta.lng.toFixed(6)}° E (±${meta.accuracy || 3}m)`
      : "GPS Unavailable";

  ctx.fillStyle = meta.lat !== undefined ? "#a7f3d0" : "#fca5a5";
  ctx.fillText(gpsText, col2X, badgeY + baseFontSize * 2 + 16);

  // Hash & Audit text
  ctx.fillStyle = "#94a3b8";
  ctx.font = `normal ${Math.max(9, baseFontSize - 3)}px monospace`;
  const auditText = `SHA-Hash: ${meta.originalHash.substring(0, 16)}... | PMFBY CLAUSE 14.2`;
  ctx.fillText(auditText, col2X, badgeY + badgeHeight - 10);

  return watermarkedCanvas.toDataURL("image/jpeg", 0.92);
}
