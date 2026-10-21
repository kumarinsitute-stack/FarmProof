import React, { useState } from 'react';
import { ViewMode, Language, User } from '../types';
import { translations } from '../translations';
import { RealLeafletMap } from './RealLeafletMap';
import { PresentationViewerModal } from './PresentationViewerModal';
import { 
  ShieldCheck, Clock, Camera, Search, Building2, 
  ChevronRight, ArrowRight, CheckCircle2, User as UserIcon, FileText, 
  Phone, Landmark, Check, HelpCircle, Presentation, Download, 
  ExternalLink, Layers, Monitor, Sparkles
} from 'lucide-react';

interface RoleSelectProps {
  setView: (view: ViewMode) => void;
  language: Language;
  currentUser?: User | null;
  onOpenPresentation?: () => void;
}

export const RoleSelect: React.FC<RoleSelectProps> = ({ setView, language, currentUser, onOpenPresentation }) => {
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('PMFBY/TS/WR/2026/89401');
  const [isSearched, setIsSearched] = useState(true);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showPresentation, setShowPresentation] = useState<boolean>(false);

  const handleOpenPresentation = () => {
    if (onOpenPresentation) {
      onOpenPresentation();
    } else {
      setShowPresentation(true);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearched(true);
  };

  const faqs = [
    {
      q: language === 'HI' 
        ? 'फसल नुकसान की सूचना देने के लिए 72 घंटे की समयसीमा क्यों अनिवार्य है?' 
        : language === 'TE' 
        ? 'పంట నష్ట సమాచారాన్ని 72 గంటల్లోపు ఎందుకు ఇవ్వాలి?' 
        : 'Why is the 72-hour reporting window mandatory under PMFBY Clause 14.2?',
      a: language === 'HI'
        ? 'नियम 14.2 के अनुसार स्थानीय आपदा (ओलावृष्टि, बाढ़, भूस्खलन) के तुरंत बाद खेत स्तर पर साक्ष्य जुटाना अनिवार्य है ताकि बीमा कंपनियां और सर्वेक्षक वास्तविक क्षति का सत्यापन कर सकें।'
        : language === 'TE'
        ? 'నిబంధన 14.2 ప్రకారం వడగండ్లు, వరదలు వంటి స్థానిక విపత్తులు జరిగిన వెంటనే పొలం వద్ద ఆధారాలు నమోదు చేయాలి. దీనివల్ల సర్వేయర్లు మరియు బీమా కంపెనీలు సకాలంలో నష్టాన్ని నిర్ధారించి పరిహారం అందించగలరు.'
        : 'Under Clause 14.2 for localized calamities, immediate farm-level evidence is required to assess physical trauma (lodging, tears) before environmental decay, enabling rapid surveyor verification without starting from zero.'
    },
    {
      q: language === 'HI'
        ? '5 तस्वीरों का साक्ष्य प्रोटोकॉल क्या है?'
        : language === 'TE'
        ? '5 ఫోటోల ఆధారాల నియమావళి ఏమిటి?'
        : 'What is the required 5-photo evidence protocol?',
      a: language === 'HI'
        ? '1. विस्तृत दृश्य (पूरे खेत का नुकसान), 2. क्षतिग्रस्त पत्तियों का क्लोज-अप, 3. 1मी x 1मी क्वाड्रैट पौधों की गिनती, 4. सीमा एवं राजस्व पहचान चिन्ह, और 5. स्वस्थ फसल से तुलना।'
        : language === 'TE'
        ? '1. పొలం విస్తృత దృశ్యం, 2. దెబ్బతిన్న ఆకుల సమీప దృశ్యం, 3. 1మీ x 1మీ క్వాడ్రాట్ మొక్కల లెక్కింపు, 4. పొలం సరిహద్దు మైలురాయి, మరియు 5. ఆరోగ్యకరమైన పక్క పొలంతో పోలిక.'
        : '1. Wide Plot View (macro lodging), 2. Close-up of Damaged Leaves (tear/hail marks), 3. Plant Count Sample (1m x 1m quadrat stem tally), 4. Boundary & Landmark (cadastral survey anchor), and 5. Undamaged Comparison (baseline control).'
    },
    {
      q: language === 'HI'
        ? 'मुआवजा राशि बैंक खाते में कैसे भेजी जाती है?'
        : language === 'TE'
        ? 'పరిహార మొత్తం రైతు ఖాతాకు ఎలా జమ అవుతుంది?'
        : 'How is the insurance compensation disbursed?',
      a: language === 'HI'
        ? 'सर्वेक्षक एवं कृषि अधिकारी द्वारा सत्यापन के बाद, दावा सीधे पीएफएमएस (PFMS) के माध्यम से किसान के आधार से जुड़े बैंक खाते में प्रत्यक्ष लाभ अंतरण (DBT) द्वारा भेजा जाता है।'
        : language === 'TE'
        ? 'అధికారి ఆమోదం పొందిన తర్వాత, పరిహారం మొత్తం నేరుగా PFMS ద్వారా రైతు ఆధార్ అనుసంధాన బ్యాంక్ ఖాతాకు డైరెక్ట్ బెనిఫిట్ ట్రాన్స్‌ఫర్ (DBT) ద్వారా జమ చేయబడుతుంది.'
        : 'Upon officer sanction, the assessed compensation is transferred directly to the farmer’s Aadhaar-seeded Jan Dhan or bank account via the Public Financial Management System (PFMS) DBT gateway.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6 px-2 sm:px-4 space-y-6">
      {/* 1. Official Government Scheme Profile Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>{t.govtBadge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t.prototypeTitle}
            </h1>
            <p className="text-sm font-semibold text-emerald-800">
              {t.prototypeSubtitle}
            </p>
          </div>

          <div className="flex flex-col sm:items-end justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
              {t.schemeCodeLabel}
            </span>
            <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
              {t.schemeCodeVal}
            </div>
            <span className="mt-2 px-2.5 py-1 rounded-lg bg-emerald-800 text-white font-mono font-semibold text-[11px] shadow-2xs">
              {t.seasonTag}
            </span>
            <button
              type="button"
              onClick={handleOpenPresentation}
              className="mt-2.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition group"
              title="View original PowerPoint presentation slides"
            >
              <Presentation className="w-3.5 h-3.5 text-amber-700 group-hover:scale-110 transition" />
              <span>Original Slide Deck</span>
            </button>
          </div>
        </div>

        {/* Scheme Operational Pillars */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>{t.guidelinesTitle}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-medium block text-[11px]">{t.governingRuleLabel}</span>
              <span className="font-bold text-slate-900 block mt-0.5">{t.governingRuleVal}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{t.governingRuleSub}</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-amber-800 font-medium block text-[11px]">{t.intimationWindowLabel}</span>
              <span className="font-black text-amber-900 block mt-0.5 font-mono text-sm">{t.intimationWindowVal}</span>
              <span className="text-[10px] text-amber-700 block mt-0.5">{t.intimationWindowSub}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-800 font-medium block text-[11px]">{t.evidenceProtocolLabel}</span>
              <span className="font-bold text-emerald-900 block mt-0.5">{t.evidenceProtocolVal}</span>
              <span className="text-[10px] text-emerald-700 block mt-0.5">{t.evidenceProtocolSub}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-medium block text-[11px]">{t.settlementMethodLabel}</span>
              <span className="font-bold text-slate-900 block mt-0.5">{t.settlementMethodVal}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{t.settlementMethodSub}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">{t.schemeObjectiveTitle}: </span>
            {t.schemeObjectiveDesc}
          </div>
        </div>
      </div>

      {/* 2. FarmProof Project Presentation Showcase Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-md border border-slate-700/80 space-y-6 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold font-mono">
              <Presentation className="w-4 h-4 text-amber-400" />
              <span>IMPACT TANK &apos;26 • ROUND 3 PROTOTYPE DECK</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              FarmProof Project Presentation
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore our original Impact Tank &apos;26 Round 3 prototype presentation. Download the original FarmProof Round 3 prototype presentation preserving all 8 original slides, 72-hour reporting rule, 5-photo live camera evidence kit, and institutional verification architecture.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-slate-300">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>8 Original Slides</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Unaltered Formatting &amp; Order</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Original .pptx Available</span>
              </span>
            </div>
          </div>

          {/* Action Buttons: Download PPTX & View Slides */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-72">
            <a
              href="/FarmProof_Round3_Prototype_Deck.pptx"
              download="FarmProof_Round3_Prototype_Deck.pptx"
              className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-md hover:shadow-emerald-500/20 transition group"
              title="Download FarmProof_Round3_Prototype_Deck.pptx"
            >
              <Download className="w-4 h-4 text-emerald-100 group-hover:translate-y-0.5 transition" />
              <span>Download PPTX</span>
            </a>

            <button
              type="button"
              onClick={handleOpenPresentation}
              className="py-3 px-5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2.5 border border-slate-600/60 shadow-sm transition"
            >
              <Presentation className="w-4 h-4 text-amber-400" />
              <span>View Presentation Slides</span>
            </button>
          </div>
        </div>

        {/* Mini Slides Strip Preview */}
        <div 
          onClick={handleOpenPresentation}
          className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 cursor-pointer group hover:text-white transition"
          title="Click to launch interactive slide viewer"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-emerald-400">Slides Overview:</span>
            <span className="text-[11px] text-slate-300 hidden sm:inline">
              1. 72h Evidence Gap • 2. Functional MVP • 3. 6-Step Workflow • 4. 4 Implemented Screens • 5. Test Journey • 6. Evaluator Access • 7. 7-Day Sprint • 8. Post-Sprint Roadmap
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition">
            <span>Open Viewer</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* 3. Beneficiary Farmer & Land Policy Verification Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t.farmerProfileHeader}
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900">
                {t.farmerNameLocation}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-mono bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{t.aadhaarVerifiedTag}</span>
            </span>
          </div>
        </div>

        {/* Policy Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPolicyPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition"
          >
            {t.searchBtn}
          </button>
        </form>

        {/* Farmer Cadastre Cards & Real Interactive Map */}
        {isSearched && (
          <div className="grid md:grid-cols-3 gap-5 pt-2">
            {/* Registered Land Records */}
            <div className="space-y-2.5 text-xs font-mono md:col-span-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-sans font-medium">{t.policyNoLabel}</span>
                <span className="font-bold text-slate-900 text-xs">PMFBY/TS/WR/2026/89401</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-sans font-medium">{t.cadastralSurveyLabel}</span>
                <span className="font-bold text-slate-900 text-xs">Survey No. 412/A (Khasra 884)</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-sans font-medium">{t.insuredCropLabel}</span>
                <span className="font-bold text-emerald-800 text-xs">Paddy (Kharif Season)</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-sans font-medium">{t.sumInsuredLabel}</span>
                <span className="font-bold text-slate-900 text-xs">₹50,400 (₹42,000 / ha)</span>
              </div>
            </div>

            {/* Embedded Cadastral Plot Map */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Registered Cadastral Boundary (Warangal Rural)</span>
                <span className="text-[11px] text-emerald-700 font-mono font-semibold">17.9689° N, 79.5941° E</span>
              </div>
              <div className="rounded-2xl overflow-hidden border border-slate-200 h-56 shadow-inner">
                <RealLeafletMap
                  lat={17.9689}
                  lng={79.5941}
                  accuracy={3.2}
                  interactive={true}
                  height="h-56"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Three Main Action Workflows / Portals */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Card 1: Start 72h Loss Report */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 flex flex-col justify-between hover:border-emerald-600 transition shadow-xs group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition">
              <Camera className="w-6 h-6" />
            </div>

            <div>
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                {t.launchFarmerTag}
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                {t.launchFarmer}
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {t.launchFarmerSub}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold font-mono block leading-none">{t.slaWindowLeft}</span>
                <span className="text-[10px] text-amber-800 mt-0.5 block">{t.slaWindowNotice}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (currentUser?.role === 'farmer') {
                setView('farmer_dashboard');
              } else {
                setView('farmer_login');
              }
            }}
            className="mt-6 w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <span>{currentUser?.role === 'farmer' ? 'Open Farmer Dashboard' : 'Farmer Login & New Claim'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 2: Track Existing Claim */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 flex flex-col justify-between hover:border-sky-600 transition shadow-xs group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition">
              <Search className="w-6 h-6" />
            </div>

            <div>
              <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">
                {t.trackExistingTag}
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                {t.trackExisting}
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {t.trackExistingSub}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2.5 font-mono">
              <CheckCircle2 className="w-5 h-5 text-sky-700 shrink-0" />
              <div>
                <span className="font-bold block leading-none">Claim: FP-2041</span>
                <span className="text-[10px] text-sky-800 mt-0.5 block">Status: Officer Review (Warangal)</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (currentUser?.role === 'farmer') {
                setView('farmer_dashboard');
              } else {
                setView('farmer_login');
              }
            }}
            className="mt-6 w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <span>{currentUser?.role === 'farmer' ? 'Track My Applications' : 'Farmer Login to Track Claims'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 3: Officer Review Portal */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 flex flex-col justify-between hover:border-slate-600 transition shadow-xs group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition">
              <Building2 className="w-6 h-6" />
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Officer & Surveyor Portal
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Staff Authentication
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Dedicated government portal for Mandal Agricultural Officers and Cadastral Surveyors.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-800 flex items-center gap-2.5 font-mono">
              <Building2 className="w-5 h-5 text-slate-600 shrink-0" />
              <div>
                <span className="font-bold block leading-none">Staff Access Only</span>
                <span className="text-[10px] text-slate-600 mt-0.5 block">Official Gov ID & Credentials Required</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (currentUser?.role === 'officer') {
                setView('officer_dashboard');
              } else if (currentUser?.role === 'surveyor') {
                setView('surveyor_dashboard');
              } else {
                setView('staff_login');
              }
            }}
            className="mt-6 w-full py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <span>
              {currentUser?.role === 'officer' ? 'Open Officer Dashboard' : currentUser?.role === 'surveyor' ? 'Open Surveyor Dashboard' : 'Officer & Surveyor Login'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Operational FAQs & Guidelines Accordion */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          <span>Operational Guidelines & Frequently Asked Questions</span>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="border border-slate-200 rounded-2xl overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-900 flex items-center justify-between gap-3"
              >
                <span>{faq.q}</span>
                <ChevronRight className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${activeFaq === idx ? 'rotate-90' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="p-4 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 5. Statutory Help & Helpline Strip */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shadow-2xs">
        <div className="flex items-center gap-3">
          <Phone className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <span className="font-bold text-slate-900">{t.helplineText}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-semibold text-emerald-800">
          <span>Warangal Rural District Cell</span>
          <span>•</span>
          <span>PMFBY Portal v2.4</span>
        </div>
      </div>

      {/* Presentation Slide Deck Viewer Modal */}
      <PresentationViewerModal
        isOpen={showPresentation}
        onClose={() => setShowPresentation(false)}
      />
    </div>
  );
};
