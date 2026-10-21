import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Download, Maximize2, 
  Minimize2, ExternalLink, Presentation, FileText, CheckCircle2,
  Layers, Sparkles, Monitor
} from 'lucide-react';

interface PresentationViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlide?: number;
}

interface SlideMetadata {
  number: number;
  title: string;
  subtitle: string;
  keyPoints: string[];
}

const SLIDES_DATA: SlideMetadata[] = [
  {
    number: 1,
    title: "Problem & Solution: Bridging the 72-Hour Evidence Gap in PMFBY",
    subtitle: "Moving agricultural insurance from slow village averages to verified farm-level proof within statutory timelines",
    keyPoints: [
      "~86% of Indian farmers are small and marginal with thin financial buffers",
      "72-Hour Mandatory SLA: Localized calamity loss must be intimated within 72 hours under PMFBY Clause 14.2",
      "Village Average Fallacy: Area-yield approach ignores severe localized crop damage",
      "Informal Debt Trap: Delayed claim settlement forces reliance on high-interest lenders"
    ]
  },
  {
    number: 2,
    title: "Prototype Overview: Functional High-Fidelity MVP",
    subtitle: "What was built during Sprint to convert the solution concept into a tested reality",
    keyPoints: [
      "Farmer Intimation App: Interactive mobile PWA running on any browser",
      "Evidence & Weather Engine: Automated multi-source corroboration pipeline",
      "PMFBY Officer Dashboard: Institutional review & DBT authorization portal",
      "Cadastral Surveyor Module: Ground verification and boundary integrity matching"
    ]
  },
  {
    number: 3,
    title: "How It Works: 6-Step End-to-End User & System Architecture",
    subtitle: "From disaster event to direct bank transfer under PMFBY Clause 14.2 localized calamity provisions",
    keyPoints: [
      "01 Damage Event (Hour 0): Inundation or hailstorm damages standing crop",
      "02 Report Loss (Hour 0-24): Farmer selects peril and pins cadastral plot",
      "03 Guided Capture (Hour 24-48): 5 geotagged live photos (camera only, no gallery picker)",
      "04 Multi-Source Triangulation (Hour 48): Weather match, vision AI scoring, parcel check",
      "05 Surveyor Ground Verification (Hour 48-72): Rapid on-site inspection",
      "06 Sanction & Payout (Day 7): Direct Benefit Transfer (DBT) to Aadhaar bank account"
    ]
  },
  {
    number: 4,
    title: "Prototype: 4 Fully Implemented Interface Views",
    subtitle: "Production-grade UI adhering to Ministry of Agriculture web portal standards and farmer usability guidelines",
    keyPoints: [
      "Screen 1: PMFBY Scheme Profile Hub — Scheme regulations, guidelines, multilingual support",
      "Screen 2: Peril & Cadastral Mapping — Plot coordinate lock, interactive Leaflet map",
      "Screen 3: Geotagged Camera HUD — In-browser camera capture with GPS & timestamp overlay",
      "Screen 4: Institutional Review Portal — Claim docket, surveyor routing, sanction workflow"
    ]
  },
  {
    number: 5,
    title: "Prototype in Action: Video Demonstration & User Journey",
    subtitle: "Step-by-step test journey simulating farmer Ramesh Reddy intimating a 1.2 ha inundated paddy plot in Warangal",
    keyPoints: [
      "Farmer onboarding and Aadhaar-seeded profile verification",
      "Peril selection (Inundation / Flooding) and plot pin",
      "Direct browser camera capture of damaged crop canopy",
      "Automated weather data cross-check and surveyor assignment"
    ]
  },
  {
    number: 6,
    title: "Prototype Access: Live Application, Links & Codebase",
    subtitle: "Complete evaluator access with zero setup required, accessible across mobile, tablet, and desktop",
    keyPoints: [
      "Live Application: FarmProof prototype running locally and on web",
      "Full Codebase: Modular React, TypeScript, Leaflet, Node/Express",
      "Test Credentials: Pre-configured Farmer, Surveyor, and Officer accounts",
      "Architecture Documentation: Complete developer and operational guide"
    ]
  },
  {
    number: 7,
    title: "Development During IMPACT TANK: 7-Day Sprint Milestones",
    subtitle: "Prototyped and built from scratch during the competition period following the suggested timeline",
    keyPoints: [
      "Day 1: Problem Definition & PMFBY Clause 14.2 operational regulatory study",
      "Day 2: Architecture & Low-Fidelity Wireframes for mobile and web",
      "Day 3-4: Core App Development (Camera API, Leaflet maps, auth portals)",
      "Day 5: Weather Cross-Check & AI Damage Rubric Integration",
      "Day 6: Officer & Surveyor Portal Implementation",
      "Day 7: End-to-end integration testing, polish, and prototype deck compilation"
    ]
  },
  {
    number: 8,
    title: "Current Limitations & Next Steps: Post-Sprint Scaling Roadmap",
    subtitle: "Honest appraisal of prototype scope boundaries and the path to field deployment",
    keyPoints: [
      "Low-bandwidth offline sync via service workers and IndexedDB",
      "Direct integration with State Land Records APIs (Bhoomi / Dharani portal)",
      "Offline edge ML models for crop loss scoring in zero-connectivity environments",
      "Integration with National Crop Insurance Portal (NCIP / PMFBY) production gateways"
    ]
  }
];

export const PresentationViewerModal: React.FC<PresentationViewerModalProps> = ({
  isOpen,
  onClose,
  initialSlide = 1
}) => {
  const [currentSlide, setCurrentSlide] = useState<number>(initialSlide);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  const totalSlides = SLIDES_DATA.length;
  const currentMeta = SLIDES_DATA[currentSlide - 1];

  const goToSlide = useCallback((n: number) => {
    if (n >= 1 && n <= totalSlides) {
      setImgLoaded(false);
      setCurrentSlide(n);
    }
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    goToSlide(currentSlide > 1 ? currentSlide - 1 : totalSlides);
  }, [currentSlide, totalSlides, goToSlide]);

  const handleNext = useCallback(() => {
    goToSlide(currentSlide < totalSlides ? currentSlide + 1 : 1);
  }, [currentSlide, totalSlides, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToSlide(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToSlide(totalSlides);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, handleNext, handlePrev, goToSlide, onClose, totalSlides]);

  if (!isOpen) return null;

  const currentSlideSrc = `/prototype_deck_slides/Slide${currentSlide}.JPG`;
  const pptxDownloadUrl = `/FarmProof_Round3_Prototype_Deck.pptx`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-hidden">
      <div 
        className={`bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen 
            ? 'w-full h-full rounded-none border-none' 
            : 'w-full max-w-6xl max-h-[94vh] h-[92vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="bg-slate-900/95 border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center shadow-xs shrink-0">
              <Presentation className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/80">
                  Impact Tank &apos;26 Round 3 • Prototype Deck
                </span>
                <span className="text-slate-500 text-xs hidden sm:inline">•</span>
                <span className="text-xs font-mono font-bold text-emerald-400 hidden sm:inline">
                  Slide {currentSlide} of {totalSlides}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight line-clamp-1 mt-0.5">
                {currentMeta.title}
              </h2>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {/* Download PPTX Button */}
            <a
              href={pptxDownloadUrl}
              download="FarmProof_Round3_Prototype_Deck.pptx"
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              title="Download FarmProof_Round3_Prototype_Deck.pptx"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PPTX</span>
              <span className="sm:hidden font-mono text-[10px]">PPTX</span>
            </a>

            {/* Open Raw PPT in New Tab */}
            <a
              href={currentSlideSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Open full resolution slide in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Toggle Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition hidden sm:flex"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
              title="Close presentation viewer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Slide Viewer Canvas */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden select-none">
          {/* Main Slide Image */}
          <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
            <img
              src={currentSlideSrc}
              alt={`Slide ${currentSlide}: ${currentMeta.title}`}
              onLoad={() => setImgLoaded(true)}
              className={`max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-opacity duration-200 ${
                imgLoaded ? 'opacity-100' : 'opacity-20'
              }`}
            />

            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-mono gap-2">
                <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                <span>Rendering original slide {currentSlide}...</span>
              </div>
            )}
          </div>

          {/* Previous Slide Floating Button */}
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-slate-900/80 hover:bg-emerald-600 text-white flex items-center justify-center backdrop-blur-sm border border-slate-700/60 shadow-xl transition active:scale-95 group"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition" />
          </button>

          {/* Next Slide Floating Button */}
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-slate-900/80 hover:bg-emerald-600 text-white flex items-center justify-center backdrop-blur-sm border border-slate-700/60 shadow-xl transition active:scale-95 group"
            title="Next Slide (Right Arrow or Space)"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Floating Slide Counter Pill */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/80 text-white font-mono text-xs border border-slate-700 backdrop-blur-md shadow-lg pointer-events-none">
            Slide <span className="text-emerald-400 font-bold">{currentSlide}</span> / {totalSlides}
          </div>
        </div>

        {/* Slide Summary / Key Takeaways Drawer */}
        <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 text-xs text-slate-300 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-amber-400 font-bold">Slide {currentSlide}:</span>
              <span className="font-bold text-white line-clamp-1">{currentMeta.subtitle}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
              <span>Use ◄ / ► arrow keys to flip</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
            {currentMeta.keyPoints.map((pt, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/60">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{pt}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Slide Thumbnails Strip */}
        <div className="bg-slate-950 border-t border-slate-800 px-3 py-2.5 overflow-x-auto shrink-0 flex items-center gap-2 scrollbar-thin scrollbar-thumb-slate-700">
          {SLIDES_DATA.map((slide) => {
            const isSelected = slide.number === currentSlide;
            return (
              <button
                key={slide.number}
                type="button"
                onClick={() => goToSlide(slide.number)}
                className={`group relative rounded-xl overflow-hidden shrink-0 border-2 transition-all flex flex-col items-center ${
                  isSelected 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105' 
                    : 'border-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'
                }`}
                style={{ width: '92px' }}
                title={`Jump to Slide ${slide.number}: ${slide.title}`}
              >
                <img
                  src={`/prototype_deck_slides/Slide${slide.number}.JPG`}
                  alt={`Slide ${slide.number}`}
                  className="w-full h-13 object-cover bg-black"
                />
                <span className={`text-[9px] font-mono py-0.5 w-full text-center font-bold ${
                  isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                }`}>
                  Slide {slide.number}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
