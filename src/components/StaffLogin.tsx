import React, { useState } from 'react';
import { ViewMode, Language, User } from '../types';
import { api } from '../api';
import { translations } from '../translations';
import { 
  Building2, ShieldCheck, Lock, Mail, ArrowRight, 
  AlertCircle, CheckCircle2, RefreshCw, ChevronRight
} from 'lucide-react';
import { DemoSelectorHeader } from './DemoSelectorHeader';

interface StaffLoginProps {
  setView: (view: ViewMode) => void;
  language: Language;
  onLoginSuccess: (user: User) => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({
  setView,
  language,
  onLoginSuccess
}) => {
  const t = translations[language];
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedDemoRole, setSelectedDemoRole] = useState<'officer' | 'surveyor' | null>(null);

  const isDemoMode = import.meta.env.MODE !== 'production' || import.meta.env.VITE_DEMO_MODE !== 'false';

  const handleUseDemo = (role: 'officer' | 'surveyor') => {
    if (role === 'officer') {
      setIdentifier('officer@farmproof.gov.in');
      setPassword('Officer@2026');
      setSelectedDemoRole('officer');
    } else {
      setIdentifier('surveyor@farmproof.gov.in');
      setPassword('Surveyor@2026');
      setSelectedDemoRole('surveyor');
    }
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await api.login(identifier, password, 'staff');
      onLoginSuccess(res.user);

      // Role-aware routing: Strictly directed according to authorized staff role verified by server
      if (res.user.role === 'surveyor') {
        setView('surveyor_dashboard');
      } else if (res.user.role === 'officer') {
        setView('officer_dashboard');
      } else {
        throw new Error('Unauthorized role for staff portal.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Staff authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-12 px-2 sm:px-4">
      {/* Official Government Staff Header */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 sm:px-8 py-7 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>{t.staffGovtBadge}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {t.staffLoginHeader}
              </h1>
              <p className="text-xs text-slate-300 font-medium">
                {t.staffLoginSub}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0 text-white">
              <Building2 className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-amber-50/80 border-b border-amber-200/60 px-6 sm:px-8 py-3 text-xs text-amber-900 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            {t.staffSecurityNotice}
          </span>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Access Denied</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                {t.staffIdentifierLabel}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="staff-identifier-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (selectedDemoRole) setSelectedDemoRole(null);
                  }}
                  placeholder={t.staffIdentifierPlaceholder}
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                {t.securityPasswordLabel}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="staff-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (selectedDemoRole) setSelectedDemoRole(null);
                  }}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800"
                />
              </div>
            </div>

            <button
              id="staff-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.verifyingStaff}</span>
                </>
              ) : (
                <>
                  <span>{t.authenticateStaffBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Compact Demo Staff Account Selector */}
            {isDemoMode && (
              <div className="pt-4 border-t border-dashed border-slate-200">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  {/* Header */}
                  <DemoSelectorHeader
                    icon="🛡️"
                    heading={t.exploreDemoStaffHeading}
                    badgeText={t.demoStaffBadge}
                    badgeVariant="staff"
                    description={t.demoStaffDesc}
                  />

                  {/* Compact Horizontal Account Rows */}
                  <div className="divide-y divide-slate-100">
                    {/* Row 1: Officer */}
                    <div
                      id="demo-officer-row"
                      onClick={() => handleUseDemo('officer')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleUseDemo('officer'); }}
                      className={`group flex items-center justify-between px-3.5 sm:px-4 py-2.5 transition-colors cursor-pointer text-left select-none ${
                        selectedDemoRole === 'officer'
                          ? 'bg-slate-900 text-white'
                          : 'hover:bg-slate-50/80 text-slate-900'
                      }`}
                    >
                      {/* Left: Avatar Initials + Name + Email */}
                      <div className="flex items-center gap-2.5 min-w-0 mr-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 transition-transform group-hover:scale-105 ${
                          selectedDemoRole === 'officer'
                            ? 'bg-slate-800 text-amber-400 border border-slate-700'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          SS
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-xs truncate ${selectedDemoRole === 'officer' ? 'text-white' : 'text-slate-900'}`}>
                              S. Sharma (MAO)
                            </span>
                            <span className={`font-mono text-[10px] shrink-0 ${selectedDemoRole === 'officer' ? 'text-slate-400' : 'text-slate-500'}`}>
                              officer@farmproof.gov.in
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Badge + Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          selectedDemoRole === 'officer'
                            ? 'bg-slate-800 text-amber-300 border-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {t.demoOfficerBadge}
                        </span>

                        <button
                          type="button"
                          tabIndex={-1}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                            selectedDemoRole === 'officer'
                              ? 'bg-amber-400 text-slate-950 shadow-2xs'
                              : 'bg-slate-100 group-hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {selectedDemoRole === 'officer' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-slate-950" />
                              <span>{t.demoAccountActive}</span>
                            </>
                          ) : (
                            <>
                              <span>{t.useAccountAction}</span>
                              <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Surveyor */}
                    <div
                      id="demo-surveyor-row"
                      onClick={() => handleUseDemo('surveyor')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleUseDemo('surveyor'); }}
                      className={`group flex items-center justify-between px-3.5 sm:px-4 py-2.5 transition-colors cursor-pointer text-left select-none ${
                        selectedDemoRole === 'surveyor'
                          ? 'bg-slate-900 text-white'
                          : 'hover:bg-slate-50/80 text-slate-900'
                      }`}
                    >
                      {/* Left: Avatar Initials + Name + Email */}
                      <div className="flex items-center gap-2.5 min-w-0 mr-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 transition-transform group-hover:scale-105 ${
                          selectedDemoRole === 'surveyor'
                            ? 'bg-slate-800 text-amber-400 border border-slate-700'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          KR
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-xs truncate ${selectedDemoRole === 'surveyor' ? 'text-white' : 'text-slate-900'}`}>
                              K. Ramesh (CFS)
                            </span>
                            <span className={`font-mono text-[10px] shrink-0 ${selectedDemoRole === 'surveyor' ? 'text-slate-400' : 'text-slate-500'}`}>
                              surveyor@farmproof.gov.in
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Badge + Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          selectedDemoRole === 'surveyor'
                            ? 'bg-slate-800 text-amber-300 border-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {t.demoSurveyorBadge}
                        </span>

                        <button
                          type="button"
                          tabIndex={-1}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                            selectedDemoRole === 'surveyor'
                              ? 'bg-amber-400 text-slate-950 shadow-2xs'
                              : 'bg-slate-100 group-hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {selectedDemoRole === 'surveyor' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-slate-950" />
                              <span>{t.demoAccountActive}</span>
                            </>
                          ) : (
                            <>
                              <span>{t.useAccountAction}</span>
                              <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Selection Confirmation Bar */}
                  {selectedDemoRole && (
                    <div className="px-3.5 py-2 bg-slate-100 border-t border-slate-200 text-slate-800 text-[11px] flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {t.demoStaffSelectedConfirmation
                          .replace('{name}', selectedDemoRole === 'officer' ? 'S. Sharma' : 'K. Ramesh')
                          .replace('{role}', selectedDemoRole === 'officer' ? t.demoOfficerBadge : t.demoSurveyorBadge)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Return to Farmer Portal */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setView('farmer_login')}
          className="text-xs font-semibold text-slate-600 hover:text-emerald-700 transition inline-flex items-center gap-1.5 cursor-pointer"
        >
          <span>{t.switchToFarmerPrompt}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
