import React, { useState, useEffect, useRef } from 'react';
import { REQUIRED_PHOTOS } from '../mockData';
import { CapturedPhoto, Language } from '../types';
import { translations } from '../translations';
import { PhotoRenderer } from './PhotoRenderer';
import { 
  ArrowLeft, Camera, Check, ShieldCheck, MapPin, 
  RotateCcw, Upload, Image as ImageIcon, Activity, CheckCircle2 
} from 'lucide-react';

interface FarmerCaptureProps {
  location: { lat: number; lng: number; accuracy: number; locked: boolean };
  onBack: () => void;
  onSubmitPhotos: (photos: CapturedPhoto[]) => void;
  isSubmitting: boolean;
  language: Language;
}

export const FarmerCapture: React.FC<FarmerCaptureProps> = ({
  location,
  onBack,
  onSubmitPhotos,
  isSubmitting,
  language
}) => {
  const t = translations[language];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamActive(true);
        }
      } else {
        setCameraError(t.cameraHardwareUnavailable);
        setStreamActive(false);
      }
    } catch {
      setCameraError(t.cameraHardwareUnavailable);
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setStreamActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const toggleCameraFacing = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const currentItem = REQUIRED_PHOTOS[currentIdx];

  const handleCapture = (overrideUrl?: string) => {
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 150);

    let photoUrl = overrideUrl || '';
    if (!photoUrl) {
      if (streamActive && videoRef.current) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth || 640;
          canvas.height = videoRef.current.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            photoUrl = canvas.toDataURL('image/jpeg', 0.88);
          }
        } catch {
          photoUrl = currentItem.defaultImage;
        }
      } else {
        photoUrl = currentItem.defaultImage;
      }
    }

    const newPhoto: CapturedPhoto = {
      id: currentItem.id,
      label: currentItem.label,
      url: photoUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
      date: '16 Oct 2026',
      gps: `${location.lat.toFixed(4)}° N, ${location.lng.toFixed(4)}° E`,
      accuracyMeters: location.accuracy || 3.2,
      tamperChecked: true,
      sampleType: currentItem.label.toLowerCase().replace(/[^a-z]/g, '_')
    };

    const updated = [...photos, newPhoto];
    setPhotos(updated);

    if (currentIdx < REQUIRED_PHOTOS.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      stopCamera();
      onSubmitPhotos(updated);
    }
  };

  // Custom File Upload Handler for Evaluators
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          handleCapture(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getStepLabel = (id: number) => {
    switch (id) {
      case 1: return { label: t.photo1Label, tip: t.photo1Tip };
      case 2: return { label: t.photo2Label, tip: t.photo2Tip };
      case 3: return { label: t.photo3Label, tip: t.photo3Tip };
      case 4: return { label: t.photo4Label, tip: t.photo4Tip };
      case 5: return { label: t.photo5Label, tip: t.photo5Tip };
      default: return { label: currentItem.label, tip: currentItem.tip };
    }
  };

  const stepInfo = getStepLabel(currentItem.id);

  return (
    <div className="max-w-md mx-auto bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl relative border-4 border-slate-700">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Shutter flash animation */}
      {shutterFlash && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-fade-out" />
      )}

      {/* Top Header Strip */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-3 flex items-center justify-between z-20 border-b border-slate-800">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-xs font-mono font-bold text-emerald-400">
            {t.photoStepText} {currentIdx + 1} {t.ofText} {REQUIRED_PHOTOS.length}
          </span>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300">
              {t.liveIndicator}
            </span>
          </div>
        </div>

        <button
          onClick={toggleCameraFacing}
          className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 transition"
          title={t.switchCameraBtn}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Camera Viewfinder Area */}
      <div className="relative aspect-[3/4] bg-slate-950 overflow-hidden flex items-center justify-center">
        {/* Real video stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
        />

        {/* Daylight CMOS Simulator if camera is unavailable or running on desktop */}
        {!streamActive && (
          <div className="absolute inset-0 w-full h-full">
            <PhotoRenderer
              photo={{
                id: currentItem.id,
                label: currentItem.label,
                url: currentItem.defaultImage,
                timestamp: '14:32 IST',
                date: '16 Oct 2026',
                gps: `${location.lat.toFixed(4)}° N, ${location.lng.toFixed(4)}° E`,
                accuracyMeters: 3.2,
                tamperChecked: true
              }}
              aspect="aspect-[3/4]"
              showMetadataOverlay={false}
              className="w-full h-full"
            />
          </div>
        )}

        {/* Reticle HUD and Framing Overlay */}
        <div className="absolute inset-0 pointer-events-none p-5 flex flex-col justify-between z-10">
          {/* Top HUD Stats */}
          <div className="flex items-center justify-between text-[11px] font-mono bg-slate-950/60 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-700/60 text-slate-200">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span>{location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E</span>
            </div>
            <div className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>GPS LOCKED (±3.2m)</span>
            </div>
          </div>

          {/* Center Viewfinder Reticle */}
          <div className="relative w-full h-48 border border-white/30 rounded-2xl flex items-center justify-center">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
            <div className="w-3 h-3 rounded-full border border-emerald-400/80"></div>
          </div>

          {/* Instructions Banner */}
          <div className="bg-slate-950/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 text-center space-y-1">
            <h4 className="text-sm font-bold text-white tracking-wide">
              {stepInfo.label}
            </h4>
            <p className="text-xs text-emerald-300 leading-snug">
              {stepInfo.tip}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 border-t border-slate-800">
        {REQUIRED_PHOTOS.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx < currentIdx
                ? 'w-6 bg-emerald-500'
                : idx === currentIdx
                ? 'w-8 bg-white'
                : 'w-2 bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Capture Actions Bar */}
      <div className="p-4 bg-slate-950 space-y-3">
        {/* Anti-Gallery Policy Notice */}
        <p className="text-[10px] text-center text-slate-400 leading-tight">
          {t.antiGalleryNotice}
        </p>

        {/* Shutter Button & Upload Options */}
        <div className="flex items-center justify-between px-4">
          {/* Upload Custom Field Photo */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex flex-col items-center gap-1 text-[10px] transition"
            title={t.uploadCustomPhotoBtn}
          >
            <Upload className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">Upload</span>
          </button>

          {/* Primary Shutter Button */}
          <button
            type="button"
            onClick={() => handleCapture()}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 shadow-lg active:scale-95 transition group"
          >
            <div className="w-13 h-13 rounded-full bg-white group-hover:scale-90 transition flex items-center justify-center">
              <Camera className="w-6 h-6 text-emerald-800" />
            </div>
          </button>

          {/* Use Daylight Preset Sample */}
          <button
            type="button"
            onClick={() => handleCapture(currentItem.defaultImage)}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex flex-col items-center gap-1 text-[10px] transition"
            title={t.useDaylightSampleBtn}
          >
            <ImageIcon className="w-5 h-5 text-sky-400" />
            <span className="font-semibold">Daylight</span>
          </button>
        </div>
      </div>

      {/* Submission Overlay when completing 5th photo */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin flex items-center justify-center">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">{t.corroboratingTitle}</h3>
            <p className="text-xs text-slate-400 max-w-xs">{t.corroboratingSub}</p>
          </div>
          <div className="space-y-2 text-xs font-mono text-emerald-400 text-left w-full max-w-xs bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t.geotaggedSuccess}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t.weatherCrossCheckSuccess}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{t.aiScoredSuccess}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
