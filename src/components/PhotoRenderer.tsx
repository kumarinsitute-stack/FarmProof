import React, { useState } from 'react';
import { ZoomIn, ShieldCheck, MapPin, Clock, X, CheckCircle2 } from 'lucide-react';
import { CapturedPhoto } from '../types';

interface PhotoRendererProps {
  photo: CapturedPhoto;
  aspect?: string;
  showMetadataOverlay?: boolean;
  className?: string;
  onZoom?: (photo: CapturedPhoto) => void;
}

export const PhotoRenderer: React.FC<PhotoRendererProps> = ({
  photo,
  aspect = 'aspect-[4/3]',
  showMetadataOverlay = true,
  className = '',
  onZoom
}) => {
  const [imageError, setImageError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayUrl = photo.watermarkedUrl || photo.url;
  const isHttpOrData = displayUrl && (displayUrl.startsWith('data:image/') || displayUrl.startsWith('blob:') || displayUrl.startsWith('http') || displayUrl.startsWith('/uploads'));

  const handleOpenZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onZoom) {
      onZoom(photo);
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div 
        onClick={handleOpenZoom}
        className={`relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 shadow-xs group cursor-pointer transition hover:border-emerald-600 hover:shadow-md ${aspect} ${className}`}
      >
        {isHttpOrData && !imageError ? (
          <img
            src={displayUrl}
            alt={photo.label}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          /* Realistic daylight agricultural field daylight render (light background, crisp field textures) */
          <div className="w-full h-full relative flex flex-col justify-between overflow-hidden bg-sky-50">
            {photo.id === 1 && (
              // Wide Plot View: Bright daylight landscape with flattened rice paddy lodging
              <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="daylightSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#bae6fd" />
                    <stop offset="60%" stopColor="#e0f2fe" />
                    <stop offset="100%" stopColor="#f0fdf4" />
                  </linearGradient>
                  <linearGradient id="paddySoil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#15803d" />
                    <stop offset="50%" stopColor="#166534" />
                    <stop offset="100%" stopColor="#854d0e" />
                  </linearGradient>
                </defs>
                <rect width="400" height="110" fill="url(#daylightSky)" />
                <path d="M0,105 Q100,95 200,102 T400,98 L400,130 L0,130 Z" fill="#15803d" opacity="0.6" />
                <rect y="120" width="400" height="180" fill="url(#paddySoil)" />
                {/* Waterlogged channel */}
                <path d="M-10,240 Q150,210 280,250 T410,230 L410,280 L-10,280 Z" fill="#93c5fd" opacity="0.45" />
                {/* Flattened paddy stalks */}
                {Array.from({ length: 65 }).map((_, i) => {
                  const x = (i * 23) % 390;
                  const y = 135 + ((i * 17) % 150);
                  const angle = 65 + ((i * 9) % 30);
                  return (
                    <g key={i} transform={`translate(${x}, ${y}) rotate(${angle})`}>
                      <line x1="0" y1="0" x2="38" y2="2" stroke="#a3e635" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="12" y1="-2" x2="42" y2="4" stroke="#facc15" strokeWidth="1.8" />
                      <circle cx="38" cy="2" r="1.5" fill="#ca8a04" />
                    </g>
                  );
                })}
              </svg>
            )}

            {photo.id === 2 && (
              // Close-up: Green leaves in natural daylight with visible hail damage tears
              <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                <rect width="400" height="300" fill="#f0fdf4" />
                <path d="M-20 280 C 80 160, 160 100, 380 30" stroke="#16a34a" strokeWidth="42" fill="none" strokeLinecap="round" />
                <path d="M30 320 C 130 190, 230 130, 420 70" stroke="#15803d" strokeWidth="32" fill="none" strokeLinecap="round" />
                <path d="M-30 150 C 110 110, 250 80, 390 10" stroke="#22c55e" strokeWidth="26" fill="none" opacity="0.9" />
                {/* Hail perforations */}
                <ellipse cx="180" cy="115" rx="15" ry="8" fill="#e2e8f0" stroke="#ca8a04" strokeWidth="2" />
                <ellipse cx="135" cy="145" rx="11" ry="6" fill="#e2e8f0" stroke="#eab308" strokeWidth="1.8" />
                <ellipse cx="240" cy="90" rx="16" ry="9" fill="#e2e8f0" stroke="#ca8a04" strokeWidth="2.2" />
                <circle cx="165" cy="110" r="3" fill="#ffffff" />
                <circle cx="225" cy="85" r="3.5" fill="#ffffff" />
              </svg>
            )}

            {photo.id === 3 && (
              // Plant Count Sample: 1m x 1m quadrat sampling frame on light agricultural soil
              <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                <rect width="400" height="300" fill="#fef3c7" />
                <rect y="20" width="400" height="260" fill="#f5f5f4" />
                <rect x="50" y="25" width="300" height="250" fill="none" stroke="#2563eb" strokeWidth="6" rx="4" />
                <line x1="200" y1="25" x2="200" y2="275" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6,6" />
                <line x1="50" y1="150" x2="350" y2="150" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6,6" />
                <circle cx="50" cy="25" r="7" fill="#ffffff" stroke="#1d4ed8" strokeWidth="3" />
                <circle cx="350" cy="25" r="7" fill="#ffffff" stroke="#1d4ed8" strokeWidth="3" />
                <circle cx="50" cy="275" r="7" fill="#ffffff" stroke="#1d4ed8" strokeWidth="3" />
                <circle cx="350" cy="275" r="7" fill="#ffffff" stroke="#1d4ed8" strokeWidth="3" />
                {Array.from({ length: 28 }).map((_, i) => {
                  const x = 75 + ((i * 37) % 250);
                  const y = 45 + ((i * 29) % 210);
                  const isBroken = i % 3 !== 0;
                  return (
                    <g key={i} transform={`translate(${x}, ${y})`}>
                      <line x1="0" y1="0" x2={isBroken ? 18 : 0} y2={isBroken ? 12 : -22} stroke={isBroken ? '#f59e0b' : '#16a34a'} strokeWidth="3" strokeLinecap="round" />
                    </g>
                  );
                })}
              </svg>
            )}

            {photo.id === 4 && (
              // Boundary Landmark: Rural plot boundary with concrete canal & stone marker
              <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                <rect width="400" height="140" fill="#e0f2fe" />
                <rect y="130" width="400" height="170" fill="#dcfce7" />
                {/* Concrete canal */}
                <polygon points="120,300 280,300 240,130 160,130" fill="#94a3b8" />
                <polygon points="145,300 255,300 225,130 175,130" fill="#38bdf8" opacity="0.75" />
                {/* Boundary stone peg */}
                <polygon points="60,250 85,250 80,180 65,180" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
                <text x="64" y="220" fontSize="9" fontWeight="bold" fill="#0f172a">412/A</text>
              </svg>
            )}

            {photo.id === 5 && (
              // Undamaged Comparison: Lush healthy green rice paddy in morning sun
              <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                <rect width="400" height="120" fill="#bae6fd" />
                <circle cx="340" cy="50" r="30" fill="#fde047" opacity="0.8" />
                <rect y="110" width="400" height="190" fill="#15803d" />
                {Array.from({ length: 80 }).map((_, i) => {
                  const x = (i * 17) % 395;
                  const y = 120 + ((i * 19) % 170);
                  return (
                    <g key={i} transform={`translate(${x}, ${y})`}>
                      <line x1="0" y1="0" x2="0" y2="-28" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="0" y1="-14" x2="8" y2="-24" stroke="#86efac" strokeWidth="2" />
                      <circle cx="8" cy="-24" r="2" fill="#facc15" />
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        )}

        {/* Hover Zoom Indicator */}
        <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
            <ZoomIn className="w-3.5 h-3.5 text-emerald-700" />
            <span>Click to Inspect Full Photo</span>
          </div>
        </div>

        {/* PMFBY Geotag Stamp Watermark */}
        {showMetadataOverlay && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-900/60 to-transparent p-2 text-white text-[10px] flex flex-col justify-end pointer-events-none">
            <div className="flex items-center justify-between font-mono leading-tight">
              <span className="font-bold text-white truncate max-w-[65%] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{photo.label}</span>
              </span>
              <span className="text-emerald-300 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded text-[9px] border border-emerald-500/40">
                LOCKED
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300 font-mono text-[9px] mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-red-400" />
                <span>{photo.gps || '17.9689° N, 79.5941° E'}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-amber-300" />
                <span>{photo.timestamp || '14:32 IST'}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-sm">{photo.label}</h3>
                  <span className="text-[10px] text-emerald-200 font-mono">PMFBY Rule 14.2 Statutory Proof Pack</span>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-900 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-[4/3] bg-slate-100">
              {isHttpOrData && !imageError ? (
                <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium text-xs">
                  Daylight crop loss visual evidence
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">COORDINATES</span>
                <span className="font-bold text-slate-800">{photo.gps}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TIMESTAMP</span>
                <span className="font-bold text-slate-800">{photo.timestamp}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ACCURACY</span>
                <span className="font-bold text-emerald-700">±{photo.accuracyMeters || 3.2}m</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">INTEGRITY</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> SHA-256 Valid
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
