import React from 'react';
import { ViewMode, Language, Theme, User } from '../types';
import { translations } from '../translations';
import { 
  Phone, ShieldCheck, FileText, 
  Building2, User as UserIcon, LogOut,
  Sun, Moon
} from 'lucide-react';

interface NavbarProps {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser: User | null;
  onLogout: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  view,
  setView,
  language,
  setLanguage,
  currentUser,
  onLogout,
  theme,
  toggleTheme,
}) => {
  const t = translations[language];

  const handleFarmerNav = () => {
    if (currentUser?.role === 'farmer') {
      setView('farmer_dashboard');
    } else {
      setView('farmer_login');
    }
  };

  const handleStaffNav = () => {
    if (currentUser?.role === 'officer') {
      setView('officer_dashboard');
    } else if (currentUser?.role === 'surveyor') {
      setView('surveyor_dashboard');
    } else {
      setView('staff_login');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs">
      {/* 1. Official Government of India Tricolor Strip */}
      <div className="h-1.5 w-full flex tricolor-strip">
        <div className="h-full w-1/3 bg-[#FF9933]"></div>
        <div className="h-full w-1/3 bg-white border-y border-slate-200 tricolor-white"></div>
        <div className="h-full w-1/3 bg-[#138808]"></div>
      </div>

      {/* 2. Top Ministry & Helpline Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-8 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-600 font-medium">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-600/20 text-amber-900 flex items-center justify-center font-serif text-[10px] font-bold">
            🇮🇳
          </div>
          <span className="font-semibold text-slate-800">
            {language === 'HI' ? 'कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार' : language === 'TE' ? 'వ్యవసాయ మరియు రైతు సంక్షేమ మంత్రిత్వ శాఖ, భారత ప్రభుత్వం' : 'Ministry of Agriculture & Farmers Welfare, Government of India'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <Phone className="w-3.5 h-3.5 text-emerald-700" />
            <span>Kisan Helpline: <strong className="font-mono text-emerald-900">14447</strong></span>
          </div>
          <div className="hidden sm:block text-slate-300">|</div>
          <div className="hidden sm:block text-slate-500 font-mono">
            PMFBY Clause 14.2 Localized Calamities
          </div>
        </div>
      </div>

      {/* 3. Main Government Portal Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Logo and Scheme Name */}
        <div 
          onClick={() => setView('role_select')}
          className="flex items-center gap-3 cursor-pointer group"
          title="Return to Government Scheme Profile"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex flex-col items-center justify-center font-bold shadow-xs border border-emerald-600 group-hover:scale-105 transition">
            <ShieldCheck className="w-5 h-5 text-emerald-200" />
            <span className="text-[8px] font-mono tracking-tighter uppercase font-black text-amber-300">PMFBY</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none group-hover:text-emerald-800 transition">
                {t.appName}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                Official
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
              {t.portalSubtitle}
            </p>
          </div>
        </div>

        {/* Navigation & User Session Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Main Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setView('role_select')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                view === 'role_select'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t.schemeProfile}</span>
            </button>

            {/* Farmer Portal Entry */}
            <button
              type="button"
              onClick={handleFarmerNav}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                view === 'farmer_login' || view === 'farmer_dashboard' || view === 'farmer_report' || view === 'farmer_capture' || view === 'farmer_tracker'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 text-emerald-700" />
              <span>Farmer Portal</span>
            </button>

            {/* Officer & Surveyor Portal Entry */}
            <button
              type="button"
              onClick={handleStaffNav}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                view === 'staff_login' || view === 'officer_dashboard' || view === 'surveyor_dashboard'
                  ? 'bg-slate-900 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Staff Portal</span>
            </button>
          </nav>

          {/* User Session Badge (When Logged In) */}
          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-100 pl-3 pr-1.5 py-1 rounded-xl border border-slate-200">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser.name}
                </span>
                <span className={`text-[9px] font-mono font-bold uppercase ${
                  currentUser.role === 'officer' ? 'text-emerald-700' :
                  currentUser.role === 'surveyor' ? 'text-amber-700' :
                  'text-sky-700'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-white transition"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setView('farmer_login')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition shadow-2xs"
              >
                Farmer Login
              </button>
              <button
                type="button"
                onClick={() => setView('staff_login')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition shadow-2xs"
              >
                Staff Login
              </button>
            </div>
          )}

          {/* 3-Language Segmented Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => setLanguage('EN')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                language === 'EN'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('HI')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                language === 'HI'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
            <button
              type="button"
              onClick={() => setLanguage('TE')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                language === 'TE'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              తెలుగు
            </button>
          </div>

          {/* Theme Toggle Button (Sun / Moon) */}
          <button
            type="button"
            onClick={toggleTheme}
            id="theme-toggle-btn"
            className="p-2 rounded-xl border transition flex items-center justify-center cursor-pointer shadow-2xs group bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
            title={theme === 'dark' ? t.themeToggleLight : t.themeToggleDark}
            aria-label={theme === 'dark' ? t.themeToggleLight : t.themeToggleDark}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform group-hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 transition-transform group-hover:-rotate-12" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
