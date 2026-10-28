import React, { useState } from 'react';
import { ViewMode, Language, User } from '../types';
import { api } from '../api';
import { 
  Building2, ShieldCheck, Lock, Mail, ArrowRight, 
  AlertCircle, CheckCircle2, RefreshCw, KeyRound, 
  MapPin, UserCheck, ChevronRight
} from 'lucide-react';

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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
                <span>Authorized Government Personnel Only</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Officer & Surveyor Administrative Access
              </h1>
              <p className="text-xs text-slate-300 font-medium">
                Pradhan Mantri Fasal Bima Yojana • Verification & Sanction Portal
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
            Access to this system is restricted to authorized Agricultural Officers and Cadastral Field Surveyors. Role privileges are cryptographically validated by the server.
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                Official Staff Email or Government ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter official email or government ID"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials & Role Permissions...</span>
                </>
              ) : (
                <>
                  <span>Authenticate & Open Staff Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          </div>
        </div>

      {/* Return to Farmer Portal */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setView('farmer_login')}
          className="text-xs font-semibold text-slate-600 hover:text-emerald-700 transition inline-flex items-center gap-1.5"
        >
          <span>Are you a Farmer? Go to Farmer Login Portal</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
