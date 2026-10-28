import React, { useState, useEffect } from 'react';
import { ViewMode, Language, User, Claim, CapturedPhoto } from '../types';
import { api } from '../api';
import { translations } from '../translations';
import { PhotoRenderer } from './PhotoRenderer';
import { RealLeafletMap } from './RealLeafletMap';
import { calculate72HourSla } from '../services/offlineQueue';
import { 
  Building2, Search, Filter, CheckCircle2, AlertTriangle, 
  Clock, MapPin, CloudRain, ShieldCheck, ChevronRight, Check,
  AlertCircle, XCircle, FileText, ArrowRight, Eye, User as UserIcon,
  UserCheck, RefreshCw, LogOut, CheckSquare, Compass, Send, FileCheck,
  Map, List, BarChart3
} from 'lucide-react';

interface OfficerDashboardProps {
  user?: User;
  claims?: Claim[];
  selectedClaim?: Claim;
  onSelectClaim?: (claim: Claim) => void;
  onUpdateClaimStatus?: (claimId: string, status: Claim['status'], priority?: Claim['priority'], notes?: string) => void;
  language: Language;
  onLogout?: () => void;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  user,
  claims: initialClaims,
  selectedClaim: initialSelectedClaim,
  onSelectClaim: externalSelectClaim,
  onUpdateClaimStatus,
  language,
  onLogout
}) => {
  const t = translations[language];

  const [claimsList, setClaimsList] = useState<Claim[]>(initialClaims || []);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(initialSelectedClaim || null);
  const [surveyors, setSurveyors] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Layout view mode (List vs Map Cluster)
  const [viewTab, setViewTab] = useState<'queue' | 'map'>('queue');
  const [showInstitutionalReport, setShowInstitutionalReport] = useState(false);
  const [institutionalData, setInstitutionalData] = useState<any>(null);
  const [loadingInstitution, setLoadingInstitution] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [officerNotes, setOfficerNotes] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Assignment form state
  const [selectedSurveyorId, setSelectedSurveyorId] = useState<string>('');
  const [surveyDeadline, setSurveyDeadline] = useState('Within 72 Hours');
  const [surveyInstructions, setSurveyInstructions] = useState('');

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'request_correction' | 'return_survey';
    title: string;
    description: string;
    sanctionedAmount: number;
    remarks: string;
  }>({
    open: false,
    type: 'approve',
    title: '',
    description: '',
    sanctionedAmount: 42500,
    remarks: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [apps, survs] = await Promise.all([
        api.getApplications(),
        api.getSurveyors()
      ]);
      setClaimsList(apps);
      setSurveyors(survs);
      if (apps.length > 0 && !selectedClaim) {
        setSelectedClaim(apps[0]);
        setDecisionModal(prev => ({
          ...prev,
          sanctionedAmount: apps[0].estimatedPayoutInr || 42500
        }));
      }
      if (survs.length > 0 && !selectedSurveyorId) {
        setSelectedSurveyorId(survs[0].id);
      }
    } catch (err) {
      console.error('Error loading officer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update selected claim sync
  const selectClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    if (externalSelectClaim) {
      externalSelectClaim(claim);
    }
    setDecisionModal(prev => ({
      ...prev,
      sanctionedAmount: claim.estimatedPayoutInr || 42500
    }));
  };

  const loadInstitutionalReport = async () => {
    setLoadingInstitution(true);
    try {
      const data = await api.getInstitutionalUsageReport();
      setInstitutionalData(data);
      setShowInstitutionalReport(true);
    } catch (err: any) {
      alert('Could not load institutional report: ' + (err?.message || 'Network error'));
    } finally {
      setLoadingInstitution(false);
    }
  };

  // Filtered queue
  const filteredClaims = claimsList.filter((claim) => {
    const matchesSearch = 
      claim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesPriority = true;
    if (filterPriority === 'UrgentSLA') {
      const sla = calculate72HourSla(claim.submissionTime);
      matchesPriority = sla.isUrgent;
    } else if (filterPriority !== 'all') {
      matchesPriority = claim.priority === filterPriority;
    }

    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const verifiedCount = claimsList.filter((c) => c.priority === 'Verified' || c.status === 'Approved').length;
  const visitCount = claimsList.filter((c) => c.status === 'Survey Assigned' || c.status === 'Survey in Progress').length;
  const pendingReviewCount = claimsList.filter((c) => c.status === 'Submitted' || c.status === 'Under Review' || c.status === 'Survey Completed').length;

  // Assign surveyor
  const handleAssignSurveyor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim || !selectedSurveyorId) return;

    setActionLoading(true);
    try {
      const updated = await api.assignSurveyor(
        selectedClaim.id,
        selectedSurveyorId,
        surveyDeadline,
        surveyInstructions
      );
      setSelectedClaim(updated);
      setActionSuccessMsg(`Claim ${selectedClaim.id} assigned to surveyor successfully!`);
      setSurveyInstructions('');
      await loadData();
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to assign surveyor');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Decision Modal
  const openDecisionModal = (type: 'approve' | 'reject' | 'request_correction' | 'return_survey') => {
    if (!selectedClaim) return;

    let title = '';
    let description = '';

    if (type === 'approve') {
      title = `Sanction & Approve Claim ${selectedClaim.id}`;
      description = `Sanction full or partial compensation for ${selectedClaim.farmerName}. The sanctioned amount will be disbursed via PFMS Direct Benefit Transfer to bank account (${selectedClaim.bankAccount}).`;
    } else if (type === 'reject') {
      title = `Reject Claim ${selectedClaim.id}`;
      description = `Record mandatory statutory justification for rejecting this claim. This reason will be published directly to the farmer and logged in the official audit trail.`;
    } else if (type === 'request_correction') {
      title = `Request Corrections from Farmer (${selectedClaim.farmerName})`;
      description = `Specify missing documents, illegible photographs, or land record mismatches. The claim status will become 'Correction Required' allowing the farmer to resubmit.`;
    } else {
      title = `Return Survey for Re-Verification`;
      description = `Return this survey to the field surveyor for additional quadrant sampling or boundary verification.`;
    }

    setDecisionModal({
      open: true,
      type,
      title,
      description,
      sanctionedAmount: selectedClaim.sanctionedPayoutInr || selectedClaim.estimatedPayoutInr || 42500,
      remarks: ''
    });
  };

  // Execute Officer Decision
  const handleExecuteDecision = async () => {
    if (!selectedClaim) return;

    if ((decisionModal.type === 'reject' || decisionModal.type === 'request_correction') && !decisionModal.remarks.trim()) {
      alert('Detailed remarks and reason are mandatory for rejections and correction requests.');
      return;
    }

    setActionLoading(true);
    try {
      const updated = await api.submitOfficerDecision(
        selectedClaim.id,
        decisionModal.type,
        decisionModal.remarks,
        decisionModal.type === 'approve' ? decisionModal.sanctionedAmount : undefined
      );

      setSelectedClaim(updated);
      setDecisionModal(prev => ({ ...prev, open: false, remarks: '' }));
      setActionSuccessMsg(`Officer decision (${decisionModal.type.toUpperCase()}) executed for Claim ${selectedClaim.id}.`);
      await loadData();
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to execute officer decision');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-2 px-1 sm:px-4">
      {/* 1. Header & Metrics Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
              <Building2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mandal Agricultural Officer Portal</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                Warangal Rural Agricultural Division
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {user ? `Officer: ${user.name} • ${user.designation || 'Mandal Agricultural Officer'}` : t.officerHeaderSub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center min-w-[80px]">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Queue</span>
              <span className="text-lg font-black text-slate-900 font-mono">{claimsList.length}</span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center min-w-[80px]">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Review Pending</span>
              <span className="text-lg font-black text-amber-900 font-mono">{pendingReviewCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-center min-w-[80px]">
              <span className="text-[10px] uppercase font-bold text-sky-800 block">Surveys Active</span>
              <span className="text-lg font-black text-sky-900 font-mono">{visitCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center min-w-[80px]">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Sanctioned</span>
              <span className="text-lg font-black text-emerald-800 font-mono">{verifiedCount}</span>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-3 rounded-2xl border border-slate-300 hover:bg-slate-100 text-slate-600 hover:text-rose-600 transition"
                title="Log Out from Officer Portal"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search claims by ID, farmer name, village, survey number..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted (New)</option>
              <option value="Survey Assigned">Survey Assigned</option>
              <option value="Survey Completed">Survey Completed</option>
              <option value="Correction Required">Correction Required</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 font-semibold"
            >
              <option value="all">All Priorities & SLAs</option>
              <option value="UrgentSLA">🚨 Urgent: &lt;24h in 72h Window</option>
              <option value="Verified">Verified (Fast-track)</option>
              <option value="Review">Review Required</option>
              <option value="Visit">Visit Recommended</option>
            </select>

            {/* View Mode Toggle: Queue List vs Cadastral Map */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewTab('queue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewTab === 'queue' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Queue</span>
              </button>
              <button
                type="button"
                onClick={() => setViewTab('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewTab === 'map' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Map className="w-3.5 h-3.5 text-emerald-700" />
                <span>Map</span>
              </button>
            </div>

            {/* Institutional Usage & Revenue Model Report Button (Phase 10) */}
            <button
              type="button"
              onClick={loadInstitutionalReport}
              disabled={loadingInstitution}
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0"
              title="View Institutional Tier & Usage Report"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{loadingInstitution ? 'Loading...' : 'Institutional Report'}</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* 2. Main Two-Column Layout */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Claims Queue or Cluster Map */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              {viewTab === 'map' ? (
                <>
                  <Map className="w-4 h-4 text-emerald-700" />
                  <span>Cadastral Cluster Map</span>
                </>
              ) : (
                <>
                  <List className="w-4 h-4 text-slate-700" />
                  <span>Submitted Claims Queue</span>
                </>
              )}
            </span>
            <span className="text-xs font-mono text-slate-500 font-bold">
              {filteredClaims.length} Claims Plotted
            </span>
          </div>

          {viewTab === 'map' ? (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                <RealLeafletMap
                  claims={filteredClaims}
                  selectedClaimId={selectedClaim?.id}
                  onSelectClaim={selectClaim}
                  height="h-[600px]"
                />
              </div>
              <p className="text-[11px] text-slate-500 text-center font-medium">
                Click any status pin on the map to inspect the full claim dossier on the right panel.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredClaims.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No claims match your search criteria.
                </div>
              ) : (
                filteredClaims.map((claim) => {
                  const sla = calculate72HourSla(claim.submissionTime);
                  return (
                    <div
                      key={claim.id}
                      onClick={() => selectClaim(claim)}
                      className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                        selectedClaim?.id === claim.id
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 text-xs">{claim.id}</span>
                        <div className="flex items-center gap-1.5">
                          {sla.isUrgent && claim.status !== 'Approved' && claim.status !== 'Rejected' && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-bold font-mono border border-rose-300 animate-pulse">
                              ⏳ {sla.remainingHours}h left
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                            claim.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            claim.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                            claim.status === 'Correction Required' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                            claim.status.includes('Survey') ? 'bg-sky-100 text-sky-800 border-sky-300' :
                            'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {claim.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>{claim.farmerName}</span>
                          <span className="font-mono text-slate-700">₹{claim.estimatedPayoutInr?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-xs text-slate-600">
                          {claim.crop} • {claim.cause} • {claim.village}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-1.5">
                        <span>Survey {claim.surveyNumber}</span>
                        <span className="text-emerald-800 font-semibold font-sans">
                          {claim.assignedSurveyorName ? `Surveyor: ${claim.assignedSurveyorName}` : 'Survey Unassigned'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Claim Details, Survey Review, Surveyor Assignment, & Sanctions */}
        <div className="lg:col-span-7 space-y-6">
          {selectedClaim ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              {/* Claim Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      PMFBY Claim Verification File
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {selectedClaim.id}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mt-1">
                    {selectedClaim.farmerName} — {selectedClaim.crop} ({selectedClaim.plotSize})
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Survey No: {selectedClaim.surveyNumber} • {selectedClaim.village}, {selectedClaim.district}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Estimated Compensation</span>
                  <span className="text-lg font-black text-emerald-800 font-mono block">
                    ₹{selectedClaim.estimatedPayoutInr?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Beneficiary & DBT Bank Details Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Aadhaar Linked</span>
                  <strong className="text-slate-900 text-xs">{selectedClaim.aadhaar}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Bank Account</span>
                  <strong className="text-slate-900 text-xs">{selectedClaim.bankAccount}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Bank Name</span>
                  <strong className="text-slate-900 text-xs truncate block">{selectedClaim.bankName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Policy Number</span>
                  <strong className="text-slate-900 text-xs truncate block">{selectedClaim.policyNumber}</strong>
                </div>
              </div>

              {/* Geotagged Plot Coordinates & Cadastral Mapping */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Plot Geolocation &amp; Cadastral Verification
                    </span>
                  </div>
                  {selectedClaim.lat && selectedClaim.lng ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>GPS Locked ({selectedClaim.lat.toFixed(5)}° N, {selectedClaim.lng.toFixed(5)}° E)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-300">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Missing GPS Geotag</span>
                    </span>
                  )}
                </div>

                {selectedClaim.lat && selectedClaim.lng ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-sans block">Latitude</span>
                        <strong className="text-slate-900 text-xs">{selectedClaim.lat.toFixed(6)}° N</strong>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-sans block">Longitude</span>
                        <strong className="text-slate-900 text-xs">{selectedClaim.lng.toFixed(6)}° E</strong>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-sans block">Survey Parcel</span>
                        <strong className="text-emerald-700 text-xs">{selectedClaim.surveyNumber}</strong>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-sans block">Cadastre Match</span>
                        <strong className="text-emerald-700 text-xs">Verified Basin</strong>
                      </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-slate-200 h-44 shadow-inner">
                      <RealLeafletMap
                        lat={selectedClaim.lat}
                        lng={selectedClaim.lng}
                        accuracy={4.5}
                        interactive={false}
                        height="h-44"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                    No plot coordinates were captured for this application record.
                  </div>
                )}
              </div>

              {/* Farmer Uploaded Evidence Photos */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Farmer Submitted Evidence ({selectedClaim.photos?.length || 0} Photographs)
                </span>
                {selectedClaim.photos && selectedClaim.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {selectedClaim.photos.map((photo) => (
                      <div key={photo.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <img src={photo.url} alt={photo.label} className="w-full h-24 object-cover" />
                        <div className="p-1.5 text-[10px] truncate font-medium text-slate-700 bg-white">
                          {photo.label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                    No farmer photos attached.
                  </div>
                )}
              </div>

              {/* SURVEYOR FINDINGS REVIEW SECTION (IF COMPLETED) */}
              {selectedClaim.surveyFindings && (
                <div className="p-5 rounded-2xl bg-sky-50 border-2 border-sky-300 space-y-3 text-xs">
                  <div className="flex items-center justify-between text-sky-950 border-b border-sky-200 pb-2">
                    <span className="font-bold flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-sky-700" />
                      Field Surveyor Report ({selectedClaim.surveyFindings.surveyorName})
                    </span>
                    <span className="font-mono text-[10px] text-sky-700">{selectedClaim.surveyFindings.surveyDate}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="p-2.5 bg-white rounded-xl border border-sky-100">
                      <span className="text-slate-400 block text-[9px] uppercase font-sans">Observed Loss</span>
                      <strong className="text-sky-950 text-sm">{selectedClaim.surveyFindings.observedLossPercentage}%</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-sky-100">
                      <span className="text-slate-400 block text-[9px] uppercase font-sans">Cadastral Boundary</span>
                      <strong className="text-emerald-700 text-xs">{selectedClaim.surveyFindings.boundaryIntegrityVerified ? 'Verified' : 'Discrepancy'}</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-sky-100">
                      <span className="text-slate-400 block text-[9px] uppercase font-sans">Lodging Trauma</span>
                      <strong className="text-slate-800 text-xs">{selectedClaim.surveyFindings.lodgingObserved ? 'Observed' : 'Not Observed'}</strong>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-sky-100">
                      <span className="text-slate-400 block text-[9px] uppercase font-sans">Recommendation</span>
                      <strong className="text-emerald-700 text-xs">{selectedClaim.surveyFindings.surveyorRecommendation}</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-sky-100 text-slate-800">
                    <span className="font-bold block text-slate-900 mb-0.5">Surveyor Observations:</span>
                    {selectedClaim.surveyFindings.remarks}
                  </div>

                  {selectedClaim.surveyFindings.additionalPhotos && selectedClaim.surveyFindings.additionalPhotos.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-bold text-slate-700 block text-[11px]">
                        Surveyor On-Site Verification Photos ({selectedClaim.surveyFindings.additionalPhotos.length})
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedClaim.surveyFindings.additionalPhotos.map((photo) => (
                          <div key={photo.id} className="rounded-lg overflow-hidden border border-sky-200">
                            <img src={photo.url} alt={photo.label} className="w-full h-20 object-cover" />
                            <div className="p-1 bg-white text-[9px] truncate font-mono text-slate-600">{photo.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 1: SURVEYOR ASSIGNMENT / REASSIGNMENT FORM */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    <span>Assign / Reassign Cadastral Surveyor</span>
                  </span>
                  {selectedClaim.assignedSurveyorName && (
                    <span className="text-[11px] font-mono text-slate-600">
                      Current: <strong>{selectedClaim.assignedSurveyorName}</strong>
                    </span>
                  )}
                </div>

                <form onSubmit={handleAssignSurveyor} className="space-y-3 text-xs">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-700 block mb-1 font-semibold">Select Field Surveyor *</label>
                      <select
                        value={selectedSurveyorId}
                        onChange={(e) => setSelectedSurveyorId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                      >
                        {surveyors.map((surv) => (
                          <option key={surv.id} value={surv.id}>
                            {surv.name} ({surv.designation || 'Field Surveyor'} - {surv.district})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-700 block mb-1 font-semibold">Survey Deadline</label>
                      <input
                        type="text"
                        value={surveyDeadline}
                        onChange={(e) => setSurveyDeadline(e.target.value)}
                        placeholder="e.g. Within 72 Hours / 22 Oct 2026"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Officer Instructions for Surveyor</label>
                    <input
                      type="text"
                      value={surveyInstructions}
                      onChange={(e) => setSurveyInstructions(e.target.value)}
                      placeholder="e.g. Conduct physical stem tally count and inspect water depth on plot border..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{selectedClaim.assignedSurveyorId ? 'Reassign Surveyor' : 'Assign to Surveyor'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* MODULE 2: OFFICER FINAL DECISION BUTTONS */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Officer Statutory Decisions & Sanctions
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => openDecisionModal('approve')}
                    className="py-3 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sanction & Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openDecisionModal('request_correction')}
                    className="py-3 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Request Correction</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openDecisionModal('return_survey')}
                    className="py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Return for Re-Survey</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openDecisionModal('reject')}
                    className="py-3 px-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Claim</span>
                  </button>
                </div>
              </div>

              {/* Audit History Log */}
              {selectedClaim.history && selectedClaim.history.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Full Audit History & Timeline
                  </span>
                  <div className="space-y-2">
                    {selectedClaim.history.map((hist) => (
                      <div key={hist.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{hist.action}</span>
                          <span className="font-mono text-[10px] text-slate-400">{hist.timestamp}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Actor: <strong>{hist.performedBy}</strong> ({hist.role})
                        </div>
                        <p className="text-[11px] text-slate-700">{hist.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              Select a claim from the queue on the left to begin officer scrutiny.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation & Sanction Decision Modal */}
      {decisionModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 ${
                decisionModal.type === 'approve' ? 'bg-emerald-600' :
                decisionModal.type === 'reject' ? 'bg-rose-600' :
                decisionModal.type === 'request_correction' ? 'bg-purple-600' :
                'bg-amber-600'
              }`}>
                {decisionModal.type === 'approve' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{decisionModal.title}</h3>
                <span className="text-[11px] text-slate-400 font-mono">Government Sanction Order</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              {decisionModal.description}
            </p>

            {/* Compensation Sanction Amount Input (for Approval) */}
            {decisionModal.type === 'approve' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Sanctioned Payout Amount (INR)
                  </label>
                  <input
                    type="number"
                    value={decisionModal.sanctionedAmount}
                    onChange={(e) => setDecisionModal({ ...decisionModal, sanctionedAmount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm text-emerald-800"
                  />
                </div>

                {/* Mandatory PMFBY DBT Educational Notice */}
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>SIMULATED DBT DEMO / TEST GATEWAY</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900">
                    Educational prototype simulation. Sanction approval updates the claim state to "Approved" and logs the decision in the permanent audit trail. Actual monetary transfer occurs via Government of India PFMS banking channels, not directly through FarmProof.
                  </p>
                </div>
              </div>
            )}

            {/* Officer Remarks / Reason */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>Officer Sanction Remarks / Mandatory Reason</span>
                {(decisionModal.type === 'reject' || decisionModal.type === 'request_correction') && (
                  <span className="text-[10px] text-rose-600 font-semibold lowercase">Mandatory</span>
                )}
              </label>
              <textarea
                rows={3}
                value={decisionModal.remarks}
                onChange={(e) => setDecisionModal({ ...decisionModal, remarks: e.target.value })}
                placeholder={
                  decisionModal.type === 'reject' 
                    ? 'State specific disqualification grounds (e.g. loss occurred outside policy window, cadastral boundary discrepancy)...' 
                    : decisionModal.type === 'request_correction'
                    ? 'Specify required corrections (e.g. attach clear Pattadar passbook page 2)...'
                    : 'Sanction remarks logged in PFMS DBT gateway...'
                }
                className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setDecisionModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteDecision}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs ${
                  decisionModal.type === 'approve' ? 'bg-emerald-700 hover:bg-emerald-800' :
                  decisionModal.type === 'reject' ? 'bg-rose-700 hover:bg-rose-800' :
                  decisionModal.type === 'request_correction' ? 'bg-purple-700 hover:bg-purple-800' :
                  'bg-amber-700 hover:bg-amber-800'
                }`}
              >
                {actionLoading ? 'Sanctioning...' : 'Authorize Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 10: INSTITUTIONAL USAGE & REVENUE MODEL MODAL */}
      {showInstitutionalReport && institutionalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold font-mono border border-emerald-200 uppercase">
                    Phase 10 • Institutional Model
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Institutional Usage &amp; Metering Report</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstitutionalReport(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Organization Profile */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Account / Organization</span>
              <div className="font-bold text-slate-900 text-sm">{institutionalData.organization}</div>
              <div className="text-slate-500 font-medium">{institutionalData.division}</div>
              <div className="flex items-center gap-3 pt-2 text-[11px] font-mono">
                <span className="text-emerald-700 font-bold">Tier: {institutionalData.activeTier}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">Status: {institutionalData.billingStatus}</span>
              </div>
            </div>

            {/* Metered Claims & AI Metrics */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Billing Cycle Usage &amp; Activity Metrics
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">Claims Ingested</span>
                  <strong className="text-xl font-black text-slate-900 font-mono">
                    {institutionalData.metrics?.totalClaimsIngested || 0}
                  </strong>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">AI Vision Runs</span>
                  <strong className="text-xl font-black text-emerald-700 font-mono">
                    {institutionalData.metrics?.aiVisionEvaluations || 0}
                  </strong>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">Weather Checks</span>
                  <strong className="text-xl font-black text-sky-700 font-mono">
                    {institutionalData.metrics?.weatherCorroborations || 0}
                  </strong>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">Surveys Assigned</span>
                  <strong className="text-xl font-black text-amber-700 font-mono">
                    {institutionalData.metrics?.fieldSurveysDispatched || 0}
                  </strong>
                </div>
              </div>
            </div>

            {/* Commercial Model Principles */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2 text-emerald-950">
              <span className="font-bold uppercase tracking-wider text-[11px] block text-emerald-900">
                Commercial Readiness &amp; Fair Model
              </span>
              <div className="space-y-1 text-[11px] leading-relaxed">
                <div>• <strong>Farmer Access:</strong> {institutionalData.commercialModel?.farmerFee}</div>
                <div>• <strong>Institutional Licensing:</strong> {institutionalData.commercialModel?.institutionalModel}</div>
                <div>• <strong>Proposed Pilot Pricing:</strong> {institutionalData.commercialModel?.pilotPricingProposal}</div>
              </div>
              <p className="text-[10px] text-emerald-800 italic pt-1 border-t border-emerald-200/80">
                {institutionalData.notes}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowInstitutionalReport(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
