import React from 'react';
import { PerilType, CropType, Language } from '../types';
import { translations } from '../translations';
import { RealLeafletMap } from './RealLeafletMap';
import { Clock, MapPin, Camera, ChevronRight, ShieldCheck, AlertTriangle } from 'lucide-react';

interface FarmerReportProps {
  peril: PerilType;
  setPeril: (peril: PerilType) => void;
  crop: CropType;
  setCrop: (crop: CropType) => void;
  location: { lat: number; lng: number; accuracy: number; locked: boolean };
  onLocationChange: (lat: number, lng: number) => void;
  onStartCapture: () => void;
  language: Language;
}

export const FarmerReport: React.FC<FarmerReportProps> = ({
  peril,
  setPeril,
  crop,
  setCrop,
  location,
  onLocationChange,
  onStartCapture,
  language
}) => {
  const t = translations[language];

  const perilItems: { type: PerilType; label: string; desc: string }[] = [
    { 
      type: 'Hail', 
      label: t.perilHail, 
      desc: language === 'HI' ? 'ओलावृष्टि से पत्तियों व तनों की क्षति' : language === 'TE' ? 'వడగండ్ల వల్ల కాండం మరియు ఆకుల నష్టం' : 'Severe leaf shredding & lodging' 
    },
    { 
      type: 'Flood', 
      label: t.perilFlood, 
      desc: language === 'HI' ? 'खेत में पानी भरने से जड़ सड़न' : language === 'TE' ? 'వరద నీరు నిలవడం వల్ల ముంపు' : 'Prolonged inundation & waterlogging' 
    },
    { 
      type: 'Drought', 
      label: t.perilDrought, 
      desc: language === 'HI' ? 'वर्षा की कमी व शुष्कता' : language === 'TE' ? 'వర్షాభావం వల్ల పంట ఎండిపోవడం' : 'Severe rainfall deficit & wilting' 
    },
    { 
      type: 'Pest', 
      label: t.perilPest, 
      desc: language === 'HI' ? 'कीट व बीमारी का प्रकोप' : language === 'TE' ? 'చీడపీడల తీవ్ర దాడి' : 'Epidemic attack on panicles' 
    }
  ];

  const cropItems: { type: CropType; label: string }[] = [
    { type: 'Paddy (Kharif)', label: language === 'HI' ? 'धान (खरीफ)' : language === 'TE' ? 'వరి (ఖరీఫ్)' : 'Paddy (Kharif)' },
    { type: 'Cotton', label: language === 'HI' ? 'कपास (Cotton)' : language === 'TE' ? 'పత్తి (Cotton)' : 'Cotton' },
    { type: 'Maize', label: language === 'HI' ? 'मक्का (Maize)' : language === 'TE' ? 'మొక్కజొన్న (Maize)' : 'Maize' },
    { type: 'Chilli', label: language === 'HI' ? 'मिर्च (Chilli)' : language === 'TE' ? 'మిర్చి (Chilli)' : 'Chilli' }
  ];

  return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 space-y-0">
      {/* Top Header Strip */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-200 text-[10px] font-bold border border-emerald-500/40 uppercase tracking-wider">
              PMFBY Clause 14.2
            </div>
            <h1 className="text-xl font-black tracking-tight mt-1">
              {t.reportTitle}
            </h1>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">
              {t.reportStep1}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-xs text-white border border-white/20">
            FP
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 72h Statutory SLA Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3.5 text-amber-900 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-800 font-bold">
            <Clock className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <div className="text-lg font-black text-amber-900 leading-tight font-mono">{t.slaWindowLeft}</div>
            <div className="text-xs text-amber-800 mt-0.5">{t.slaWindowNotice}</div>
          </div>
        </div>

        {/* Peril Selector */}
        <div>
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2 flex items-center justify-between">
            <span>{t.perilQuestion}</span>
            <span className="text-[10px] text-slate-500 lowercase font-normal">Select 1</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {perilItems.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setPeril(item.type)}
                className={`p-3 rounded-2xl text-left border transition ${
                  peril === item.type
                    ? 'bg-emerald-50 border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>{item.label}</span>
                  {peril === item.type && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                  {item.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Crop Variety Selector */}
        <div>
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
            {t.cropLabel}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {cropItems.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setCrop(item.type)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                  crop === item.type
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cadastral Map & GPS Location */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>{t.markPlotLabel}</span>
            </label>
            <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E
            </span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
            <RealLeafletMap
              lat={location.lat}
              lng={location.lng}
              accuracy={location.accuracy}
              interactive={true}
              onLocationChange={onLocationChange}
              height="h-52"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
            <span>{t.mapInstruction}</span>
            <span className="font-mono text-slate-600 font-semibold">{t.plotCadastreSub}</span>
          </div>
        </div>

        {/* Proceed to Camera Capture Button */}
        <button
          type="button"
          onClick={onStartCapture}
          className="w-full py-4 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition group"
        >
          <Camera className="w-5 h-5 group-hover:scale-110 transition" />
          <span>{t.startCaptureBtn}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
