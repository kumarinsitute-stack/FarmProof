import React, { useState } from 'react';
import { Claim, CapturedPhoto, Language } from '../types';
import { translations } from '../translations';
import { PhotoRenderer } from './PhotoRenderer';
import { RealLeafletMap } from './RealLeafletMap';
import { 
  CheckCircle2, Clock, ShieldCheck, MapPin, 
  CloudRain, ArrowRight, Phone, Check, AlertCircle, FileText,
  Building2, ChevronRight
} from 'lucide-react';

interface FarmerTrackerProps {
  claim: Claim;
  onViewInOfficer: () => void;
  onLodgeNew: () => void;
  language: Language;
}

export const FarmerTracker: React.FC<FarmerTrackerProps> = ({
  claim,
  onViewInOfficer,
  onLodgeNew,
  language
}) => {
  const t = translations[language];
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);

  const isApproved = claim.status === 'Approved' || claim.payoutStatus === 'Disbursed to Bank';
  const isOfficerReview = claim.status === 'Officer Review' || claim.status === 'Under Review' || isApproved;

  const steps = [
    {
      title: t.step1Title,
      done: true,
      desc: t.step1Desc,
      time: claim.submissionTime || "16 Oct, 14:32"
    },
    {
      title: t.step2Title,
      done: true,
      desc: t.step2Desc,
      time: "Same visit"
    },
    {
      title: t.step3Title,
      done: claim.weatherMatch === "Match",
      desc: claim.weatherDetails || t.step3Desc,
      time: "Open-Meteo Radar"
    },
    {
      title: t.step4Title,
      done: isApproved,
      active: !isApproved && isOfficerReview,
      desc: isApproved ? (language === 'HI' ? 'अधिकारी द्वारा साक्ष्य सत्यापित' : language === 'TE' ? 'అధికారి ఆధారాలను ధృవీకరించారు' : 'Officer verified evidence pack') : t.step4Desc,
      time: "Days 1 to 3"
    },
    {
      title: isApproved ? t.step5Title : claim.status === 'Flagged' ? (language === 'HI' ? 'निर्णय: क्षेत्रीय निरीक्षण' : language === 'TE' ? 'నిర్ణయం: క్షేత్ర తనిఖీ' : 'Decision: Spot-Check Required') : (language === 'HI' ? 'निर्णय प्रक्रिया' : language === 'TE' ? 'నిర్ణయం' : 'Decision'),
      done: isApproved,
      active: isApproved,
      desc: isApproved ? `${language === 'HI' ? 'स्वतः स्वीकृत: एआई विश्वास' : language === 'TE' ? 'ఆటో-ఆమోదం: AI నమ్మకం' : 'Auto-approved: AI confidence'} ${claim.aiConfidence}% & ${language === 'HI' ? 'मौसम मिलान' : language === 'TE' ? 'వాతావరణ సరిపోలిక' : 'weather match'}` : (language === 'HI' ? 'अंतिम अधिकारी स्वीकृति लंबित' : language === 'TE' ? 'అధికారి ఆమోదం కోసం వేచి ఉంది' : 'Pending final officer sanction'),
      time: "Insurer SLA"
    },
    {
      title: t.step6Title,
      done: claim.payoutStatus === 'Disbursed to Bank',
      active: isApproved && claim.payoutStatus !== 'Disbursed to Bank',
      desc: `₹${claim.estimatedPayoutInr.toLocaleString('en-IN')} ${language === 'HI' ? 'प्रत्यक्ष लाभ अंतरण (डीबीटी) द्वारा बैंक खाते में भेजा जा रहा है' : language === 'TE' ? 'DBT ద్వారా బ్యాంకు ఖాతాకు జమ అవుతుంది' : 'Direct Benefit Transfer to Bank Account'}`,
      time: claim.payoutStatus === 'Disbursed to Bank' ? "Transferred" : "Processing DBT"
    }
  ];

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 space-y-0">
      {/* Top Mobile App Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">
              PMFBY Clause 14.2 Tracking
            </span>
            <h1 className="text-xl font-black tracking-tight mt-0.5">
              {t.myClaimTitle}
            </h1>
            <p className="text-xs text-emerald-100 font-mono font-semibold mt-0.5">
              {t.claimIdPrefix} {claim.id}
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono border shadow-2xs ${
            isApproved 
              ? 'bg-emerald-950/80 text-emerald-200 border-emerald-400' 
              : 'bg-amber-950/80 text-amber-200 border-amber-400'
          }`}>
            {claim.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Estimated Compensation Card */}
        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/50 border border-emerald-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {t.estimatedLossPayoutLabel}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-0.5">
              ₹{claim.estimatedPayoutInr.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {claim.crop} • {claim.cause} • {claim.plotSize}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200">
              {claim.payoutStatus === 'Disbursed to Bank' ? 'DBT DISBURSED' : 'PFMS SEEDED'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              A/C: XXXX-XXXX-2847 (SBI)
            </span>
          </div>
        </div>

        {/* 6-Stage Timeline */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>{t.timelineHeader}</span>
          </h2>

          <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50">
            {steps.map((st, i) => (
              <div key={i} className="flex items-start gap-3.5 relative group">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div
                    className={`absolute left-3.5 top-7 w-0.5 h-10 transition-colors ${
                      st.done ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}

                {/* Step Circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold z-10 transition ${
                    st.done
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : st.active
                      ? 'bg-amber-500 text-white animate-pulse ring-4 ring-amber-200'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {st.done ? <Check className="w-4 h-4 stroke-[3]" /> : i + 1}
                </div>

                <div className="flex-1 pb-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${st.done ? 'text-slate-900' : st.active ? 'text-amber-900' : 'text-slate-500'}`}>
                      {st.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{st.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5 Geotagged Evidence Photos Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>{t.evidencePhotosHeader}</span>
            </h2>
            <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {t.verifiedBadge}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {claim.photos.map((p) => (
              <div key={p.id} className="space-y-1">
                <PhotoRenderer
                  photo={p}
                  aspect="aspect-[4/3]"
                  showMetadataOverlay={true}
                  onZoom={(photo) => setSelectedPhoto(photo)}
                />
                <span className="text-[10px] font-medium text-slate-600 block truncate px-1">
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cadastral Land Plot Map */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>{t.plotCadastreInspectorHeader}</span>
            </span>
            <span className="font-mono text-slate-500 text-[10px]">
              Survey 412/A • {claim.plotSize}
            </span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
            <RealLeafletMap
              lat={claim.lat}
              lng={claim.lng}
              accuracy={3.2}
              interactive={false}
              height="h-44"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <a
            href="tel:14447"
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <Phone className="w-4 h-4 text-emerald-700" />
            <span>{t.talkToHelplineBtn}</span>
          </a>

          <button
            type="button"
            onClick={onLodgeNew}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <FileText className="w-4 h-4 text-slate-700" />
            <span>{t.reportAnotherClaimBtn}</span>
          </button>

          <button
            type="button"
            onClick={onViewInOfficer}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <Building2 className="w-4 h-4" />
            <span>{t.openOfficerPortalShortBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
