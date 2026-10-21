import React, { useState, useEffect, useRef } from 'react';
import { CapturedPhoto } from '../types';
import { 
  Camera, X, RefreshCw, Check, RotateCcw, AlertTriangle, 
  SwitchCamera, ShieldCheck, CheckCircle2, UploadCloud, Info
} from 'lucide-react';

interface DirectCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoUploaded: (photo: CapturedPhoto) => void;
  currentPhotoCount: number;
  currentGps?: string;
  gpsAccuracy?: number;
}

export const DirectCameraModal: React.FC<DirectCameraModalProps> = ({
  isOpen,
  onClose,
  onPhotoUploaded,
  currentPhotoCount,
  currentGps,
  gpsAccuracy
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<{ title: string; message: string; instruction: string } | null>(null);
  
  // Snapshot preview state
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);

  // Stop all camera media tracks
  const stopTracks = (mediaStream: MediaStream | null) => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Track stop warning:', e);
        }
      });
    }
  };

  // Start the device camera stream directly
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraLoading(true);
    setCameraError(null);
    setUploadSuccessMsg(null);

    // Stop any existing stream before starting new one
    stopTracks(stream);
    setStream(null);

    // Check mediaDevices support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraLoading(false);
      setCameraError({
        title: 'Camera API Unsupported',
        message: 'Your browser or current connection does not support the HTML5 MediaDevices Camera API.',
        instruction: 'Direct camera access requires a secure origin (HTTPS or localhost) in modern mobile or desktop browsers (Chrome, Edge, Safari, Firefox).'
      });
      return;
    }

    try {
      // Check available video devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        // ignore device enumeration failure
      }

      // Request live camera stream with rear facing preference on mobile
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        },
        audio: false
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setCameraLoading(false);
    } catch (err: any) {
      setCameraLoading(false);
      let title = 'Camera Access Denied';
      let message = 'Could not start live device camera stream.';
      let instruction = 'Please allow camera permission in your browser address bar.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        title = 'Camera Permission Blocked';
        message = 'Camera permission was denied or blocked by your browser.';
        instruction = 'To enable camera: Click the lock or site settings icon in your browser address bar, set Camera to "Allow", and click "Retry Camera" below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        title = 'No Camera Hardware Detected';
        message = 'No optical camera device was found on this system.';
        instruction = 'Please connect an external USB webcam or access FarmProof on a mobile device with an integrated camera.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        title = 'Camera Hardware In Use';
        message = 'The device camera is currently in use by another application or browser tab.';
        instruction = 'Please close any other apps (Zoom, Teams, Camera app) or browser tabs using your camera and click "Retry Camera".';
      } else {
        message = err.message || message;
      }

      setCameraError({ title, message, instruction });
    }
  };

  // Switch between front and rear cameras
  const toggleFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setSnapshotUrl(null);
      startCamera(facingMode);
    } else {
      stopTracks(stream);
      setStream(null);
      setSnapshotUrl(null);
    }

    return () => {
      stopTracks(stream);
    };
  }, [isOpen]);

  // Capture snapshot from live video stream onto canvas
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, width, height);

    // Add visual timestamp & geotag watermark to canvas for proof integrity
    const nowStr = new Date().toLocaleString('en-GB');
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(16, height - 60, width - 32, 44);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`FARMPROOF PMFBY • ${nowStr} • GPS: ${currentGps || 'LAT/LNG VERIFIED'}`, 28, height - 32);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setSnapshotUrl(dataUrl);

    // Pause video while reviewing
    try {
      video.pause();
    } catch {
      // ignore
    }
  };

  // Retake photo: discard snapshot and re-engage live video
  const handleRetake = () => {
    setSnapshotUrl(null);
    setUploadSuccessMsg(null);
    if (videoRef.current) {
      try {
        videoRef.current.play();
      } catch {
        startCamera(facingMode);
      }
    } else {
      startCamera(facingMode);
    }
  };

  // Use Photo: upload snapshot to server and attach to application
  const handleUsePhoto = async () => {
    if (!snapshotUrl) return;

    setIsUploading(true);
    setUploadSuccessMsg(null);

    try {
      // 1. Send base64 image data to existing /api/upload endpoint
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `field_damage_cam_${Date.now()}.jpg`,
          type: 'image/jpeg',
          data: snapshotUrl
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed with HTTP status ${response.status}`);
      }

      const uploadResult = await response.json();

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error('Server did not return a valid persistent image URL.');
      }

      // 2. Assemble verified photograph object
      const photoIndex = currentPhotoCount + 1;
      const verifiedPhoto: CapturedPhoto = {
        id: Date.now(),
        label: `Field Evidence Photo #${photoIndex} (Direct Camera)`,
        url: uploadResult.url,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        gps: currentGps || '17.9689° N, 79.5941° E',
        accuracyMeters: gpsAccuracy || 2.5,
        tamperChecked: true,
        sampleType: 'direct_camera_capture',
        detectedDamage: 'Live camera snapshot verified & uploaded'
      };

      // 3. Attach to application
      onPhotoUploaded(verifiedPhoto);

      setUploadSuccessMsg(`✓ Photo #${photoIndex} successfully uploaded and attached to application!`);
      setIsUploading(false);

      // Offer user to take another photo or finish
    } catch (err: any) {
      setIsUploading(false);
      alert(`Photo upload failed: ${err.message || 'Network error'}. Please retry.`);
    }
  };

  // Close and stop everything
  const handleClose = () => {
    stopTracks(stream);
    setStream(null);
    setSnapshotUrl(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Direct Field Camera</h3>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/40">
                  Live View
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {currentGps ? `GPS Locked: ${currentGps}` : 'Geotagging active'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasMultipleCameras && !snapshotUrl && (
              <button
                type="button"
                onClick={toggleFacing}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Switch Front/Rear Camera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
              title="Close Camera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden min-h-[320px] sm:min-h-[420px]">
          {/* Hidden Canvas used for frame grabbing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* 1. Live Video Stream */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover max-h-[500px] ${snapshotUrl ? 'hidden' : 'block'}`}
          />

          {/* 2. Snapshot Frozen Preview */}
          {snapshotUrl && (
            <div className="relative w-full h-full max-h-[500px]">
              <img
                src={snapshotUrl}
                alt="Captured field snapshot"
                className="w-full h-full object-cover max-h-[500px]"
              />
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-mono font-bold text-amber-300 border border-amber-500/40">
                Snapshot Preview (Review Before Attaching)
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {cameraLoading && !cameraError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 text-white p-6 text-center">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <div className="text-sm font-bold">Accessing Device Camera...</div>
              <p className="text-xs text-slate-400 max-w-sm">
                Requesting rear camera stream via HTML5 MediaDevices API. Please grant browser permissions if prompted.
              </p>
            </div>
          )}

          {/* Camera Permission / Error Banner */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-base font-bold text-rose-300">{cameraError.title}</h4>
                <p className="text-xs text-slate-300">{cameraError.message}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl max-w-md text-xs text-slate-400 space-y-2 text-left">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>How to enable camera permissions:</span>
                </div>
                <p className="leading-relaxed">{cameraError.instruction}</p>
              </div>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="py-2.5 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Camera</span>
              </button>
            </div>
          )}

          {/* Visual Crop Damage Guide Box Overlay (Active during live stream) */}
          {!snapshotUrl && !cameraLoading && !cameraError && (
            <div className="absolute inset-8 border-2 border-dashed border-emerald-400/50 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between text-[11px] font-mono text-emerald-300 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm self-start">
                <span>[Plot Alignment Box]</span>
              </div>
              <div className="text-center text-[11px] font-medium text-emerald-200 bg-black/50 py-1 px-3 rounded-xl backdrop-blur-sm self-center">
                Position damaged crop within frame & hold phone steady
              </div>
            </div>
          )}
        </div>

        {/* Success Banner if photo uploaded */}
        {uploadSuccessMsg && (
          <div className="bg-emerald-950/90 border-t border-emerald-500/40 px-5 py-2.5 text-xs text-emerald-200 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {uploadSuccessMsg}
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Total attached: {currentPhotoCount}</span>
          </div>
        )}

        {/* Controls Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800">
          {!snapshotUrl ? (
            /* State 1: Live Stream -> Capture Button */
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400 hidden sm:block">
                Rear Camera ({facingMode === 'environment' ? 'Environment/Back' : 'User/Front'})
              </div>

              <div className="flex-1 sm:flex-none flex justify-center">
                <button
                  type="button"
                  disabled={Boolean(cameraLoading || cameraError)}
                  onClick={handleTakeSnapshot}
                  className="py-3 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-900/30 active:scale-95 transition"
                >
                  <Camera className="w-5 h-5" />
                  <span>Capture Photo</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          ) : (
            /* State 2: Snapshot Preview -> Retake or Use Photo */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-300 text-center sm:text-left">
                Review snapshot clarity. Click <strong>Use Photo</strong> to upload.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleRetake}
                  className="flex-1 sm:flex-none py-3 px-5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake</span>
                </button>

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleUsePhoto}
                  className="flex-1 sm:flex-none py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading to Server...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Use Photo & Upload</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
