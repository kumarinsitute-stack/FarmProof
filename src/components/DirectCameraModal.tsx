import React, { useState, useEffect, useRef } from "react";
import { CapturedPhoto } from "../types";
import {
  StatutorySlotDefinition,
  analyzeImageQuality,
  computeImageHash,
  generateWatermarkedDerivative,
  PhotoQualityResult,
} from "../services/evidenceKit";
import {
  Camera,
  X,
  RefreshCw,
  Check,
  RotateCcw,
  AlertTriangle,
  SwitchCamera,
  ShieldCheck,
  CheckCircle2,
  UploadCloud,
  Info,
  AlertCircle,
} from "lucide-react";

interface DirectCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoUploaded: (photo: CapturedPhoto) => void;
  targetSlot: StatutorySlotDefinition;
  existingSlotPhoto?: CapturedPhoto;
  existingPhotos?: CapturedPhoto[];
  currentGps?: { lat: number; lng: number; accuracy: number } | null;
}

export const DirectCameraModal: React.FC<DirectCameraModalProps> = ({
  isOpen,
  onClose,
  onPhotoUploaded,
  targetSlot,
  existingSlotPhoto,
  existingPhotos = [],
  currentGps,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<{
    title: string;
    message: string;
    instruction: string;
  } | null>(null);

  // Snapshot preview state
  const [originalSnapshotUrl, setOriginalSnapshotUrl] = useState<string | null>(
    null,
  );
  const [watermarkedSnapshotUrl, setWatermarkedSnapshotUrl] = useState<
    string | null
  >(null);
  const [snapshotHash, setSnapshotHash] = useState<string | null>(null);
  const [qualityResult, setQualityResult] = useState<PhotoQualityResult | null>(
    null,
  );
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);

  // Stop all camera media tracks cleanly
  const stopTracks = (mediaStream: MediaStream | null) => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Track stop warning:", e);
        }
      });
    }
  };

  // Start the device camera stream directly with rear camera preference
  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    setCameraLoading(true);
    setCameraError(null);
    setUploadSuccessMsg(null);
    setDuplicateError(null);

    // Stop any existing stream before starting new one
    stopTracks(stream);
    setStream(null);

    // Check mediaDevices support
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraLoading(false);
      setCameraError({
        title: "Camera Hardware API Unsupported",
        message:
          "Your browser or current connection does not support the MediaDevices Camera API.",
        instruction:
          "Direct live camera access requires HTTPS or localhost in modern mobile and desktop browsers.",
      });
      return;
    }

    try {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        // ignore device enumeration failure
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setCameraLoading(false);
    } catch (err: any) {
      setCameraLoading(false);
      let title = "Camera Access Denied";
      let message = "Could not start live device camera stream.";
      let instruction =
        "Please allow camera permission in your browser address bar.";

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        title = "Camera Permission Blocked";
        message =
          "Camera permission was denied or blocked by your browser settings.";
        instruction: 'Desktop: Click the padlock (🔒) icon in your browser address bar and set Camera to "Allow". Mobile: Open Chrome Menu > Settings > Site settings > Camera > Allow.';
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        title = "No Optical Camera Detected";
        message: "No video capture hardware was detected on this device.";
        instruction: "Please connect a USB webcam or access FarmProof on a mobile smartphone with an integrated camera.";
      } else if (
        err.name === "NotReadableError" ||
        err.name === "TrackStartError"
      ) {
        title = "Camera In Use By Another Application";
        message =
          "The device camera is currently locked by another application or background process.";
        instruction =
          'Close other camera applications (Teams, Zoom, WhatsApp) and click "Retry Camera".';
      } else {
        message = err.message || message;
      }

      setCameraError({ title, message, instruction });
    }
  };

  const toggleFacing = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setOriginalSnapshotUrl(null);
      setWatermarkedSnapshotUrl(null);
      setQualityResult(null);
      setDuplicateError(null);
      startCamera(facingMode);
    } else {
      stopTracks(stream);
      setStream(null);
      setOriginalSnapshotUrl(null);
      setWatermarkedSnapshotUrl(null);
      setQualityResult(null);
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
      canvas = document.createElement("canvas");
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Draw raw live frame
    ctx.drawImage(video, 0, 0, width, height);
    const rawDataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // 2. Compute original image hash for duplicate detection
    const hash = computeImageHash(rawDataUrl);
    setSnapshotHash(hash);

    // 3. Duplicate check across other statutory slots
    const isDuplicate = existingPhotos.some(
      (p) => p.slotNumber !== targetSlot.slotNumber && p.hash === hash,
    );
    if (isDuplicate) {
      const dupSlot = existingPhotos.find(
        (p) => p.slotNumber !== targetSlot.slotNumber && p.hash === hash,
      );
      setDuplicateError(
        `Duplicate Image Detected: This photograph matches an image already attached to Slot #${dupSlot?.slotNumber || "another slot"}. Each statutory slot must be a distinct physical perspective.`,
      );
    } else {
      setDuplicateError(null);
    }

    // 4. Perform rigorous Optical Quality Analysis (Blur, Exposure, Resolution, Blank)
    const quality = analyzeImageQuality(canvas);
    setQualityResult(quality);

    // 5. Generate watermarked derivative derivative canvas
    const todayDateStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const nowTimeStr = new Date().toLocaleTimeString("en-GB") + " IST";

    const watermarkedDataUrl = generateWatermarkedDerivative(canvas, {
      slotNumber: targetSlot.slotNumber,
      slotTitle: targetSlot.title,
      capturedAtDate: todayDateStr,
      capturedAtTime: nowTimeStr,
      lat: currentGps?.lat,
      lng: currentGps?.lng,
      accuracy: currentGps?.accuracy,
      originalHash: hash,
      isLiveCapture: true,
    });

    setOriginalSnapshotUrl(rawDataUrl);
    setWatermarkedSnapshotUrl(watermarkedDataUrl);

    // Pause video while reviewing
    try {
      video.pause();
    } catch {
      // ignore
    }
  };

  // Retake photo: discard snapshot and re-engage live video
  const handleRetake = () => {
    setOriginalSnapshotUrl(null);
    setWatermarkedSnapshotUrl(null);
    setQualityResult(null);
    setDuplicateError(null);
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

  // Use Photo: upload both original and watermarked derivative to server
  const handleUsePhoto = async () => {
    if (!originalSnapshotUrl || !watermarkedSnapshotUrl || !qualityResult)
      return;
    if (duplicateError || qualityResult.status === "Rejected") return;

    setIsUploading(true);
    setUploadSuccessMsg(null);

    try {
      // Upload 1: Original Unmodified Photo
      const rawUploadResp = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `slot_${targetSlot.slotNumber}_raw_${Date.now()}.jpg`,
          type: "image/jpeg",
          data: originalSnapshotUrl,
        }),
      });
      if (!rawUploadResp.ok)
        throw new Error(
          "Failed to upload original image to persistent storage",
        );
      const rawUploadResult = await rawUploadResp.json();

      // Upload 2: Watermarked Derivative
      const wmUploadResp = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `slot_${targetSlot.slotNumber}_watermarked_${Date.now()}.jpg`,
          type: "image/jpeg",
          data: watermarkedSnapshotUrl,
        }),
      });
      if (!wmUploadResp.ok)
        throw new Error(
          "Failed to upload watermarked derivative to persistent storage",
        );
      const wmUploadResult = await wmUploadResp.json();

      const todayDateStr = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const nowTimeStr = new Date().toLocaleTimeString("en-GB") + " IST";

      // Preserving replacement audit if replacing an existing slot
      const replacedAudit = existingSlotPhoto
        ? [
            ...(existingSlotPhoto.replacedAudit || []),
            {
              previousUrl: existingSlotPhoto.url,
              replacedAt: new Date().toISOString(),
              reason: "Retaken via direct camera",
            },
          ]
        : undefined;

      const verifiedPhoto: CapturedPhoto = {
        id: Date.now(),
        slotNumber: targetSlot.slotNumber,
        slotKey: targetSlot.slotKey,
        label: targetSlot.title,
        url: wmUploadResult.url, // Display URL is watermarked derivative
        originalUrl: rawUploadResult.url, // Original immutable copy
        watermarkedUrl: wmUploadResult.url,
        timestamp: nowTimeStr,
        date: todayDateStr,
        gps: currentGps
          ? `${currentGps.lat.toFixed(6)}° N, ${currentGps.lng.toFixed(6)}° E`
          : "GPS: Location Unavailable",
        accuracyMeters: currentGps?.accuracy || 0,
        tamperChecked: true,
        sampleType: targetSlot.slotKey,
        detectedDamage: `Live statutory capture verified (Sharpness: ${qualityResult.blurScore}/100)`,
        isLiveCapture: true,
        captureMethod: "live_camera",
        blurScore: qualityResult.blurScore,
        isBlurry: qualityResult.isBlurry,
        qualityStatus: qualityResult.status,
        qualityReason: qualityResult.reason,
        hash: snapshotHash || undefined,
        replacedAudit,
      };

      onPhotoUploaded(verifiedPhoto);
      setUploadSuccessMsg(
        `✓ Photo for Slot #${targetSlot.slotNumber} successfully verified & attached!`,
      );
      setIsUploading(false);

      setTimeout(() => {
        handleClose();
      }, 700);
    } catch (err: any) {
      setIsUploading(false);
      alert(
        `Photo upload failed: ${err.message || "Network error"}. Please retry.`,
      );
    }
  };

  const handleClose = () => {
    stopTracks(stream);
    setStream(null);
    setOriginalSnapshotUrl(null);
    setWatermarkedSnapshotUrl(null);
    setQualityResult(null);
    setDuplicateError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/80 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              #{targetSlot.slotNumber}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                <Camera className="w-3.5 h-3.5" />
                <span>
                  Statutory 5-Photo Kit • Slot {targetSlot.slotNumber} of 5
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {targetSlot.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasMultipleCameras && !watermarkedSnapshotUrl && (
              <button
                type="button"
                onClick={toggleFacing}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Switch between front and rear cameras"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Close camera modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Capture Instruction Tip */}
        <div className="bg-slate-950/40 px-5 py-2.5 border-b border-slate-800 text-xs text-slate-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{targetSlot.captureTip}</span>
        </div>

        {/* Main Viewport */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] sm:min-h-[420px] overflow-hidden">
          {cameraLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white gap-3 bg-slate-950/80">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <span className="text-xs font-semibold">
                Initializing optical camera sensor...
              </span>
            </div>
          )}

          {cameraError && (
            <div className="p-6 text-center max-w-md space-y-3 z-30">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">
                {cameraError.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {cameraError.message}
              </p>
              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-[11px] text-emerald-300 text-left">
                <strong>How to fix:</strong> {cameraError.instruction}
              </div>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
              >
                Retry Camera
              </button>
            </div>
          )}

          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover ${watermarkedSnapshotUrl ? "hidden" : "block"}`}
          />

          {/* Reviewing Snapshot (Shows Watermarked Derivative) */}
          {watermarkedSnapshotUrl && (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <img
                src={watermarkedSnapshotUrl}
                alt="Captured Snapshot Review"
                className="w-full h-full object-contain max-h-[60vh]"
              />

              {/* Quality & Duplicate Overlays */}
              <div className="absolute top-3 left-3 right-3 z-20 space-y-2">
                {duplicateError && (
                  <div className="p-3 rounded-2xl bg-rose-900/90 border border-rose-500 text-white text-xs flex items-start gap-2.5 shadow-lg backdrop-blur-md">
                    <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        Duplicate Image Blocked
                      </span>
                      <span>{duplicateError}</span>
                    </div>
                  </div>
                )}

                {qualityResult && (
                  <div
                    className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 shadow-lg backdrop-blur-md ${
                      qualityResult.status === "Good"
                        ? "bg-emerald-950/90 border-emerald-400 text-emerald-100"
                        : qualityResult.status === "Warning"
                          ? "bg-amber-950/90 border-amber-400 text-amber-100"
                          : "bg-rose-950/90 border-rose-500 text-rose-100"
                    }`}
                  >
                    {qualityResult.status === "Good" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle
                        className={`w-5 h-5 shrink-0 mt-0.5 ${qualityResult.status === "Warning" ? "text-amber-400" : "text-rose-400"}`}
                      />
                    )}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">
                          {qualityResult.status === "Good"
                            ? "Quality Status: Verified Sharp (Accepted)"
                            : qualityResult.status === "Warning"
                              ? "Quality Status: Warning (Retake Recommended)"
                              : "Quality Status: Rejected (Too Blurry or Unusable)"}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/40">
                          Sharpness: {qualityResult.blurScore}/100
                        </span>
                      </div>
                      {qualityResult.reason && (
                        <p className="text-[11px] opacity-90">
                          {qualityResult.reason}
                        </p>
                      )}
                      {qualityResult.advice && (
                        <p className="text-[10px] opacity-80 italic">
                          {qualityResult.advice}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alignment Framing Crosshair Guide */}
          {!watermarkedSnapshotUrl && !cameraLoading && !cameraError && (
            <div className="absolute inset-8 pointer-events-none border-2 border-dashed border-emerald-400/40 rounded-2xl flex items-center justify-center">
              <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 absolute top-0 left-0"></div>
              <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 absolute top-0 right-0"></div>
              <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 absolute bottom-0 left-0"></div>
              <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 absolute bottom-0 right-0"></div>
              <span className="text-[11px] font-mono text-emerald-300/80 bg-slate-950/60 px-3 py-1 rounded-full">
                Center {targetSlot.shortLabel} inside box
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800">
          {uploadSuccessMsg && (
            <div className="mb-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{uploadSuccessMsg}</span>
            </div>
          )}

          {!watermarkedSnapshotUrl ? (
            /* Live Camera Capture Trigger */
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                <span>Hold steady &amp; ensure good lighting</span>
              </div>

              <button
                type="button"
                onClick={handleTakeSnapshot}
                disabled={cameraLoading || Boolean(cameraError)}
                className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs flex items-center gap-2.5 shadow-lg active:scale-95 transition"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Snapshot</span>
              </button>
            </div>
          ) : (
            /* Review Mode Actions */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isUploading}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Photo</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleUsePhoto}
                  disabled={
                    isUploading ||
                    Boolean(duplicateError) ||
                    qualityResult?.status === "Rejected"
                  }
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md ${
                    isUploading ||
                    Boolean(duplicateError) ||
                    qualityResult?.status === "Rejected"
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Securing &amp; Uploading Evidence...</span>
                    </>
                  ) : qualityResult?.status === "Rejected" ? (
                    <span>Cannot Save: Quality Rejected (Retake)</span>
                  ) : duplicateError ? (
                    <span>Cannot Save: Duplicate Image</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {existingSlotPhoto
                          ? "Save & Replace Slot"
                          : "Save & Attach to Slot"}
                      </span>
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
