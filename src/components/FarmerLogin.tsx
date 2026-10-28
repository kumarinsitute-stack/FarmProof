import React, { useState } from 'react';
import { ViewMode, Language, User } from '../types';
import { api } from '../api';
import { translations } from '../translations';
import { 
  ShieldCheck, Phone, Lock, User as UserIcon, ArrowRight, 
  CheckCircle2, AlertCircle, Building2, Landmark, MapPin, 
  KeyRound, HelpCircle, RefreshCw, ChevronRight, FileText,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { DemoSelectorHeader } from './DemoSelectorHeader';

interface FarmerLoginProps {
  setView: (view: ViewMode) => void;
  language: Language;
  onLoginSuccess: (user: User) => void;
}

interface DemoFarmerAccount {
  id: string;
  name: string;
  initials: string;
  phone: string;
  password: string;
  claimId: string;
  stageKey: 'statusSurveyCompleted' | 'statusSurveyAssigned' | 'statusUnderReview' | 'statusDisbursed' | 'statusApproved';
  badgeStyle: {
    bg: string;
    text: string;
    border: string;
  };
}

const DEMO_FARMERS: DemoFarmerAccount[] = [
  {
    id: 'usr-farmer-1',
    name: 'Ramulu Kurapati',
    initials: 'RK',
    phone: '9848023145',
    password: 'Farmer@2026',
    claimId: 'FP-2041',
    stageKey: 'statusSurveyCompleted',
    badgeStyle: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200'
    }
  },
  {
    id: 'usr-farmer-2',
    name: 'Lakshmi Bai',
    initials: 'LB',
    phone: '9848099881',
    password: 'Farmer@2026',
    claimId: 'FP-2038',
    stageKey: 'statusSurveyAssigned',
    badgeStyle: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200'
    }
  },
  {
    id: 'usr-farmer-3',
    name: 'Srinivas Rao',
    initials: 'SR',
    phone: '9440182931',
    password: 'Farmer@2026',
    claimId: 'FP-2043',
    stageKey: 'statusUnderReview',
    badgeStyle: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200'
    }
  },
  {
    id: 'usr-farmer-4',
    name: 'Suresh Reddy',
    initials: 'SR',
    phone: '9848077665',
    password: 'Farmer@2026',
    claimId: 'FP-2035',
    stageKey: 'statusDisbursed',
    badgeStyle: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200'
    }
  },
  {
    id: 'usr-farmer-5',
    name: 'Anjaiah B.',
    initials: 'AB',
    phone: '9849201948',
    password: 'Farmer@2026',
    claimId: 'FP-2047',
    stageKey: 'statusApproved',
    badgeStyle: {
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200'
    }
  }
];

export const FarmerLogin: React.FC<FarmerLoginProps> = ({
  setView,
  language,
  onLoginSuccess
}) => {
  const t = translations[language];
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  
  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const isDemoMode = import.meta.env.MODE !== 'production' || import.meta.env.VITE_DEMO_MODE !== 'false';

  const handleSelectFarmer = (farmer: DemoFarmerAccount) => {
    setAuthMethod('password');
    setIdentifier(farmer.phone);
    setPassword(farmer.password);
    setSelectedFarmerId(farmer.id);
    setErrorMsg(null);
  };
  
  // Registration form state
  const [regData, setRegData] = useState({
    name: '',
    phone: '',
    email: '',
    aadhaar: '',
    state: 'Telangana',
    district: 'Warangal Rural',
    village: '',
    surveyNumber: '',
    bankAccount: '',
    bankName: 'State Bank of India',
    ifsc: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (authMethod === 'otp') {
        if (!otpSent) {
          if (!identifier || identifier.length < 10) {
            throw new Error('Please enter a valid 10-digit mobile number.');
          }
          setOtpSent(true);
          setSuccessMsg(`6-digit Kisan OTP sent to +91 ${identifier}. (Use OTP: 144470 for demo)`);
          setLoading(false);
          return;
        }
        if (otpCode !== '144470' && otpCode !== '123456') {
          throw new Error('Invalid OTP. Please enter the code sent to your mobile (or demo code: 144470).');
        }
      }

      // Authenticate with server
      const res = await api.login(identifier, authMethod === 'otp' ? 'Farmer@2026' : password, 'farmer');
      onLoginSuccess(res.user);
      setView('farmer_dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (!regData.name.trim()) throw new Error('Full Name is required.');
      if (!regData.phone.trim() || regData.phone.length < 10) throw new Error('A valid 10-digit Mobile Number is required.');
      if (!regData.password) throw new Error('Password is required.');
      if (regData.password !== regData.confirmPassword) throw new Error('Passwords do not match.');

      const res = await api.registerFarmer(regData);
      setSuccessMsg('Registration successful! Redirecting to your Farmer Dashboard...');
      onLoginSuccess(res.user);
      setTimeout(() => {
        setView('farmer_dashboard');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-2 sm:px-4">
      {/* Official Government Security Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 px-6 sm:px-8 py-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/40 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>{t.farmerPortalTag}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t.farmerLoginHeader}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium">
              {t.farmerLoginSub}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/20 text-xs font-mono">
            <span className="text-emerald-300 font-semibold">Toll-Free Helpline</span>
            <span className="text-lg font-bold text-white tracking-wider">14447</span>
          </div>
        </div>

        {/* Tab Switcher: Login vs Register */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 sm:px-8">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-4 px-6 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              mode === 'login'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserIcon className="w-4 h-4 text-emerald-700" />
            <span>{t.farmerTabLogin}</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-4 px-6 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              mode === 'register'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Landmark className="w-4 h-4 text-emerald-700" />
            <span>{t.farmerTabRegister}</span>
          </button>
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Authentication Notice</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Success</span>
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 max-w-xl mx-auto">
              {/* Auth Method Selector */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setAuthMethod('password'); setOtpSent(false); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    authMethod === 'password'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.passwordLoginTab}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('otp')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    authMethod === 'otp'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.otpLoginTab}
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                  <span>{t.farmerIdentifierLabel}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{t.mobileSubtitle}</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="farmer-identifier-input"
                    type="tel"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (selectedFarmerId) setSelectedFarmerId(null);
                    }}
                    placeholder={t.farmerIdentifierPlaceholder}
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {authMethod === 'password' ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {t.accountPasswordLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      {t.forgotPasswordLink}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      id="farmer-password-input"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (selectedFarmerId) setSelectedFarmerId(null);
                      }}
                      placeholder={t.passwordPlaceholder}
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  {otpSent ? (
                    <div>
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                        <span>{t.enterOtpLabel}</span>
                        <span className="text-[10px] text-emerald-700 font-semibold font-mono">Demo: 144470</span>
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          id="farmer-otp-input"
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder={t.otpPlaceholder}
                          maxLength={6}
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{t.otpNoticeText}</span>
                    </div>
                  )}
                </div>
              )}

              <button
                id="farmer-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.verifyingFarmerAccount}</span>
                  </>
                ) : (
                  <>
                    <span>{authMethod === 'otp' && !otpSent ? t.requestOtpBtn : t.loginFarmerBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Compact Demo Farmer Account Selector */}
              {isDemoMode && (() => {
                const selectedFarmer = DEMO_FARMERS.find(f => f.id === selectedFarmerId);
                const displayedFarmers = isExpanded ? DEMO_FARMERS : DEMO_FARMERS.slice(0, 2);

                return (
                  <div className="pt-4 border-t border-dashed border-slate-200">
                    <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-2xs overflow-hidden">
                      {/* Header */}
                      <DemoSelectorHeader
                        icon="👨‍🌾"
                        heading={t.exploreDemoFarmersHeading}
                        badgeText={t.demoFarmersBadge}
                        badgeVariant="farmer"
                        description={t.demoFarmersDesc}
                      />

                      {/* Compact Horizontal Account Rows */}
                      <div className="divide-y divide-slate-100">
                        {displayedFarmers.map((farmer) => {
                          const isSelected = selectedFarmerId === farmer.id;
                          return (
                            <div
                              key={farmer.id}
                              onClick={() => handleSelectFarmer(farmer)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectFarmer(farmer); }}
                              className={`group flex items-center justify-between px-3.5 sm:px-4 py-2.5 transition-colors cursor-pointer text-left select-none ${
                                isSelected
                                  ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-500/40'
                                  : 'hover:bg-emerald-50/40'
                              }`}
                            >
                              {/* Left: Initials Avatar + Name + Claim ID */}
                              <div className="flex items-center gap-2.5 min-w-0 mr-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 transition-transform group-hover:scale-105 ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/60'
                                }`}>
                                  {farmer.initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-xs text-slate-900 truncate">
                                      {farmer.name}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                                      {farmer.claimId}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Status Badge + Action */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${farmer.badgeStyle.bg} ${farmer.badgeStyle.text} ${farmer.badgeStyle.border}`}>
                                  {t[farmer.stageKey]}
                                </span>

                                <button
                                  type="button"
                                  tabIndex={-1}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-slate-100 group-hover:bg-emerald-100/70 text-slate-700 group-hover:text-emerald-800 border border-slate-200 group-hover:border-emerald-300'
                                  }`}
                                >
                                  {isSelected ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-white" />
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
                          );
                        })}
                      </div>

                      {/* Expandable Control */}
                      <div className="p-2 bg-slate-50/70 border-t border-slate-100 text-center">
                        <button
                          type="button"
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition inline-flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-emerald-50 cursor-pointer"
                        >
                          <span>{isExpanded ? t.showLessAccounts : t.viewAllAccounts}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Selection Confirmation Bar */}
                      {selectedFarmer && (
                        <div className="px-3.5 py-2 bg-emerald-50 border-t border-emerald-200/80 text-emerald-800 text-[11px] flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            {t.demoSelectedConfirmation
                              .replace('{name}', selectedFarmer.name)
                              .replace('{claimId}', selectedFarmer.claimId)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </form>
          )}

          {/* MODE 2: REGISTRATION */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Farmer's Full Name *
                  </label>
                  <input
                    type="text"
                    value={regData.name}
                    onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                    placeholder="e.g. Ramesh Chandra Verma"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Mobile Number (Primary) *
                  </label>
                  <input
                    type="tel"
                    value={regData.phone}
                    onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Aadhaar Number (12 digits)
                  </label>
                  <input
                    type="text"
                    value={regData.aadhaar}
                    onChange={(e) => setRegData({ ...regData, aadhaar: e.target.value })}
                    placeholder="XXXX-XXXX-XXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Cadastral Land / Survey Number
                  </label>
                  <input
                    type="text"
                    value={regData.surveyNumber}
                    onChange={(e) => setRegData({ ...regData, surveyNumber: e.target.value })}
                    placeholder="e.g. Survey No. 341/B"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={regData.state}
                    onChange={(e) => setRegData({ ...regData, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={regData.district}
                    onChange={(e) => setRegData({ ...regData, district: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Village / Mandal
                  </label>
                  <input
                    type="text"
                    value={regData.village}
                    onChange={(e) => setRegData({ ...regData, village: e.target.value })}
                    placeholder="e.g. Nallabelly"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Bank Account Number (DBT Payout)
                  </label>
                  <input
                    type="text"
                    value={regData.bankAccount}
                    onChange={(e) => setRegData({ ...regData, bankAccount: e.target.value })}
                    placeholder="e.g. 3849102847"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Create Password *
                  </label>
                  <input
                    type="password"
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    placeholder="Create secure password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={regData.confirmPassword}
                    onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Registering Farmer Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration & Open Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Switch to Officer Portal Notice */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 shadow-2xs">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-slate-700 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">{t.switchToStaffQuestion}</span>
            <span className="text-[11px] text-slate-500">{t.switchToStaffSub}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setView('staff_login')}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer"
        >
          <span>{t.switchToStaffBtn}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Reset Farmer Password</h3>
              <button 
                type="button" 
                onClick={() => { setShowForgotModal(false); setForgotSuccess(false); }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {forgotSuccess ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-xs text-slate-700">
                  A temporary password reset link and OTP has been sent via SMS to <strong className="font-mono">{forgotPhone}</strong>.
                </div>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(false); setForgotSuccess(false); }}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered Kisan mobile number to receive password recovery instructions:
                </p>
                <input
                  type="tel"
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value)}
                  placeholder="10-digit Mobile Number"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (forgotPhone.length >= 10) {
                        setForgotSuccess(true);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                  >
                    Send Reset SMS
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
