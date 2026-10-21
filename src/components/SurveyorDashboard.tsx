import React, { useState, useEffect } from 'react';
import { ViewMode, Language, User, Claim, CapturedPhoto } from '../types';
import { api } from '../api';
import { RealLeafletMap } from './RealLeafletMap';
import { 
  Building2, Search, Filter, CheckCircle2, AlertTriangle, 
  Clock, MapPin, CloudRain, ShieldCheck, ChevronRight, Check,
  AlertCircle, XCircle, FileText, ArrowRight, Eye, User as UserIcon,
  Camera, UploadCloud, RefreshCw, LogOut, CheckSquare, Compass
} from 'lucide-react';

interface SurveyorDashboardProps {
  user: User;
  language: Language;
  setView: (view: ViewMode) => void;
  onLogout: () => void;
}

export const SurveyorDashboard: React.FC<SurveyorDashboardProps> = ({
  user,
  language,
  setView,
  onLogout
}) => {
  const [assignedClaims, setAssignedClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Inspection recording form
  const [visitDate, setVisitDate] = useState(
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  );
  const [visitGps, setVisitGps] = useState('17.9691° N, 79.5939° E');
  const [boundaryVerified, setBoundaryVerified] = useState(true);
  const [cropVerified, setCropVerified] = useState(true);
  const [lodgingObserved, setLodgingObserved] = useState(true);
  const [waterloggingObserved, setWaterloggingObserved] = useState(false);
  const [pestObserved, setPestObserved] = useState(false);
  const [observedLoss, setObservedLoss] = useState<number>(80);
  const [recommendation, setRecommendation] = useState<string>('Recommend Approval');
  const [surveyorRemarks, setSurveyorRemarks] = useState('');
  const [additionalPhotos, setAdditionalPhotos] = useState<CapturedPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    actionType: 'verify' | 'flag' | 'survey_ok';
    title: string;
    description: string;
  }>({
    open: false,
    actionType: 'verify',
    title: '',
    description: ''
  });

  const loadAssignedSurveys = async () => {
    setLoading(true);
    try {
      const claims = await api.getApplications();
      // Server already filters for this surveyor, but we ensure client check too
      setAssignedClaims(claims);
      if (claims.length > 0 && !selectedClaim) {
        setSelectedClaim(claims[0]);
        setObservedLoss(claims[0].damagePercentage || 75);
      }
    } catch (err) {
      console.error('Failed to load surveyor surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignedSurveys();
  }, []);

  // Filtered surveys
  const filteredSurveys = assignedClaims.filter((claim) => {
    const matchesSearch =
      claim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Metrics
  const totalAssigned = assignedClaims.length;
  const pendingSurveys = assignedClaims.filter(c => c.status === 'Survey Assigned').length;
  const inProgressSurveys = assignedClaims.filter(c => c.status === 'Survey in Progress').length;
  const completedSurveys = assignedClaims.filter(c => c.status === 'Survey Completed').length;
  const followUpSurveys = assignedClaims.filter(c => c.status === 'Under Review' || c.status === 'Correction Required').length;

  // Handle Surveyor taking/uploading field photos
  const handleSurveyPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploaded = await api.uploadFile(file);
        setAdditionalPhotos(prev => [
          ...prev,
          {
            id: Date.now() + i,
            label: `Surveyor Field Verification #${prev.length + 1}`,
            url: uploaded.url,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            gps: visitGps,
            accuracyMeters: 2.1,
            tamperChecked: true,
            sampleType: 'surveyor_quadrat',
            detectedDamage: `Surveyor physical loss sample (${observedLoss}%)`
          }
        ]);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // Trigger Survey Action Confirmation Modal
  const triggerAction = (actionType: 'verify' | 'flag' | 'survey_ok') => {
    if (!surveyorRemarks || surveyorRemarks.trim().length < 5) {
      alert('Please enter detailed surveyor inspection observations and remarks before submitting.');
      return;
    }

    if (actionType === 'verify') {
      setConfirmModal({
        open: true,
        actionType,
        title: 'Confirm & Verify Survey Findings',
        description: `Are you sure you want to confirm on-site verification for Claim ${selectedClaim?.id}? Assessed loss: ${observedLoss}%. Findings will be forwarded to the Mandal Agricultural Officer for payout sanction.`
      });
    } else if (actionType === 'flag') {
      setConfirmModal({
        open: true,
        actionType,
        title: 'Flag Discrepancy / Reject Survey',
        description: `Are you sure you want to flag a discrepancy for Claim ${selectedClaim?.id}? Your mandatory objection remarks will be escalated to the reviewing officer.`
      });
    } else {
      setConfirmModal({
        open: true,
        actionType,
        title: 'Submit Survey OK Findings',
        description: `Confirm physical field verification completed successfully for Claim ${selectedClaim?.id}. Next step: Officer final decision.`
      });
    }
  };

  // Submit survey action to server
  const executeSurveySubmission = async () => {
    if (!selectedClaim) return;
    setSubmitting(true);
    setActionSuccessMsg(null);

    try {
      const updated = await api.submitSurveyFindings(selectedClaim.id, {
        visitGps,
        boundaryIntegrityVerified: boundaryVerified,
        cropSpeciesVerified: cropVerified,
        observedLossPercentage: observedLoss,
        lodgingObserved,
        waterloggingObserved,
        pestSymptomObserved: pestObserved,
        surveyorRecommendation: recommendation,
        remarks: surveyorRemarks,
        additionalPhotos,
        actionType: confirmModal.actionType
      });

      setSelectedClaim(updated);
      setActionSuccessMsg(`Survey findings for Claim ${selectedClaim.id} recorded successfully and forwarded to reviewing officer.`);
      setConfirmModal({ open: false, actionType: 'verify', title: '', description: '' });
      setSurveyorRemarks('');
      setAdditionalPhotos([]);
      await loadAssignedSurveys();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit survey findings');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-3 sm:py-6 px-1 sm:px-4 space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
              <Compass className="w-7 h-7 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Cadastral Field Surveyor Portal
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {user.designation || 'Field Surveyor'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {user.name} ({user.district || 'Warangal Rural'})
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Authorized under PMFBY Clause 14.2 for Ground-Truth Verification & Loss Assessment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadAssignedSurveys}
              className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 hover:text-rose-600 text-xs font-bold flex items-center gap-2 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* 2. Survey Overview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-5">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Surveys</span>
            <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">{totalAssigned}</span>
            <span className="text-[10px] text-slate-400 block">Total allocated to you</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Pending Visits</span>
            <span className="text-xl font-black text-amber-900 font-mono mt-0.5 block">{pendingSurveys}</span>
            <span className="text-[10px] text-amber-700 block">Needs field inspection</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">In Progress</span>
            <span className="text-xl font-black text-sky-900 font-mono mt-0.5 block">{inProgressSurveys}</span>
            <span className="text-[10px] text-sky-700 block">Active field sampling</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Completed</span>
            <span className="text-xl font-black text-emerald-900 font-mono mt-0.5 block">{completedSurveys}</span>
            <span className="text-[10px] text-emerald-700 block">Submitted to officer</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Follow-Up Required</span>
            <span className="text-xl font-black text-purple-900 font-mono mt-0.5 block">{followUpSurveys}</span>
            <span className="text-[10px] text-purple-700 block">Additional review</span>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* 3. Main Workspace: Assigned List on Left, Survey Details on Right */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Assigned Applications List & Search */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Assigned Applications Queue
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {filteredSurveys.length} Available
              </span>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by ID, Farmer, Village, Survey No..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {['all', 'Survey Assigned', 'Survey in Progress', 'Survey Completed'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition ${
                      statusFilter === st
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'All Status' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List Cards */}
          <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                <span>Loading assigned surveys...</span>
              </div>
            ) : filteredSurveys.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <Compass className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No assigned surveys found matching your search filter.</p>
              </div>
            ) : (
              filteredSurveys.map((claim) => (
                <div
                  key={claim.id}
                  onClick={() => {
                    setSelectedClaim(claim);
                    setObservedLoss(claim.damagePercentage || 75);
                  }}
                  className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                    selectedClaim?.id === claim.id
                      ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-500/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-xs">{claim.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                      claim.status === 'Survey Completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      claim.status === 'Survey Assigned' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                      'bg-sky-100 text-sky-800 border-sky-300'
                    }`}>
                      {claim.status}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">
                      {claim.farmerName}
                    </div>
                    <div className="text-xs text-slate-600">
                      {claim.crop} • Cause: <strong className="text-amber-800">{claim.cause}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-1.5">
                    <span>Survey {claim.surveyNumber} • {claim.village}</span>
                    <span className="text-amber-800 font-semibold font-sans">
                      Due: {claim.surveyDeadline || '72h'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Survey Details & Inspection Interface */}
        <div className="lg:col-span-7 space-y-6">
          {selectedClaim ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              {/* Claim Details Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Cadastral Ground Verification
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {selectedClaim.id}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {selectedClaim.farmerName} — {selectedClaim.crop} ({selectedClaim.plotSize})
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Cadastral Survey {selectedClaim.surveyNumber} • {selectedClaim.village}, {selectedClaim.district}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Officer SLA Deadline</span>
                  <span className="text-xs font-bold text-amber-800 font-mono bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block mt-0.5">
                    {selectedClaim.surveyDeadline || 'Within 72h'}
                  </span>
                </div>
              </div>

              {/* Officer Instructions Banner */}
              {selectedClaim.officerInstructions && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    Special Instructions from Reviewing Officer:
                  </span>
                  <p className="italic pl-5">&quot;{selectedClaim.officerInstructions}&quot;</p>
                </div>
              )}

              {/* Plot Geolocation & Cadastral Field Navigation */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Ground Survey Geolocation &amp; Plot Navigation
                    </span>
                  </div>
                  {selectedClaim.lat && selectedClaim.lng ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white text-emerald-800 text-[11px] font-mono font-bold border border-emerald-300 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>GPS Locked ({selectedClaim.lat.toFixed(5)}° N, {selectedClaim.lng.toFixed(5)}° E)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-300">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Missing Coordinates</span>
                    </span>
                  )}
                </div>

                {selectedClaim.lat && selectedClaim.lng ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                        <span className="text-[10px] text-slate-500 font-sans block">Plot Latitude</span>
                        <strong className="text-slate-900 text-xs">{selectedClaim.lat.toFixed(6)}° N</strong>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                        <span className="text-[10px] text-slate-500 font-sans block">Plot Longitude</span>
                        <strong className="text-slate-900 text-xs">{selectedClaim.lng.toFixed(6)}° E</strong>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                        <span className="text-[10px] text-slate-500 font-sans block">Cadastral Survey</span>
                        <strong className="text-amber-800 text-xs">{selectedClaim.surveyNumber}</strong>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                        <span className="text-[10px] text-slate-500 font-sans block">Village / Mandal</span>
                        <strong className="text-slate-900 text-xs truncate block">{selectedClaim.village}</strong>
                      </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-amber-300 h-44 shadow-inner">
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
                  <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-slate-500">
                    No plot coordinates captured for this claim.
                  </div>
                )}
              </div>

              {/* Farmer Submitted Evidence Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider">
                    Farmer Submitted Photographs ({selectedClaim.photos?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Geotagged &amp; Locked</span>
                </div>

                {selectedClaim.photos && selectedClaim.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {selectedClaim.photos.map((photo) => (
                      <div key={photo.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <img src={photo.url} alt={photo.label} className="w-full h-20 object-cover" />
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

              {/* CADASTRAL FIELD INSPECTION FORM */}
              <div className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/30 space-y-5">
                <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-amber-700" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Record On-Site Verification Findings
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-amber-800 font-semibold">
                    Surveyor: {user.name}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Inspection Visit Date</label>
                    <input
                      type="text"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Surveyor Visit GPS Coordinates</label>
                    <input
                      type="text"
                      value={visitGps}
                      onChange={(e) => setVisitGps(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono bg-white"
                    />
                  </div>
                </div>

                {/* Verification Checklist */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Statutory Ground Checklist:
                  </span>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-amber-400">
                      <input
                        type="checkbox"
                        checked={boundaryVerified}
                        onChange={(e) => setBoundaryVerified(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>Cadastral Boundary & Markers Verified</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-amber-400">
                      <input
                        type="checkbox"
                        checked={cropVerified}
                        onChange={(e) => setCropVerified(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>Crop Species Matches Policy ({selectedClaim.crop})</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-amber-400">
                      <input
                        type="checkbox"
                        checked={lodgingObserved}
                        onChange={(e) => setLodgingObserved(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>Physical Lodging / Stem Snapping Confirmed</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-amber-400">
                      <input
                        type="checkbox"
                        checked={waterloggingObserved}
                        onChange={(e) => setWaterloggingObserved(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>Submergence / Standing Water Recorded</span>
                    </label>
                  </div>
                </div>

                {/* Observed Loss Percentage Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="uppercase tracking-wider">Field Assessed Loss Percentage:</span>
                    <span className="text-base font-black text-amber-900 font-mono bg-amber-100 px-3 py-0.5 rounded-lg border border-amber-300">
                      {observedLoss}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={observedLoss}
                    onChange={(e) => setObservedLoss(Number(e.target.value))}
                    className="w-full accent-amber-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0% (No Loss)</span>
                    <span>40% (Moderate)</span>
                    <span>70% (Severe)</span>
                    <span>100% (Complete Loss)</span>
                  </div>
                </div>

                {/* Additional Surveyor Photos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 uppercase tracking-wider">
                      Surveyor Ground Photos ({additionalPhotos.length})
                    </span>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 hover:border-amber-500 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs">
                      <Camera className="w-3.5 h-3.5 text-amber-700" />
                      <span>{uploadingPhoto ? 'Uploading...' : 'Take/Add Surveyor Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSurveyPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {additionalPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {additionalPhotos.map((photo) => (
                        <div key={photo.id} className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                          <img src={photo.url} alt={photo.label} className="w-full h-20 object-cover" />
                          <div className="p-1 text-[9px] truncate font-mono text-slate-600">{photo.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Surveyor Recommendation Dropdown */}
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Surveyor Final Recommendation
                  </label>
                  <select
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                  >
                    <option value="Recommend Approval">Recommend Full Approval (Physical trauma confirmed)</option>
                    <option value="Survey OK - Proceed">Survey OK - Proceed to Reviewing Officer</option>
                    <option value="Recommend Partial Approval">Recommend Partial Approval (Adjusted loss %)</option>
                    <option value="Recommend Rejection - Discrepancy Found">Recommend Rejection - Land/Crop discrepancy found</option>
                  </select>
                </div>

                {/* Mandatory Remarks */}
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1 flex items-center justify-between">
                    <span>Surveyor Remarks & Inspection Findings *</span>
                    <span className="text-[10px] text-amber-800 lowercase font-normal">Mandatory for audit trail</span>
                  </label>
                  <textarea
                    rows={3}
                    value={surveyorRemarks}
                    onChange={(e) => setSurveyorRemarks(e.target.value)}
                    placeholder="Enter on-site stem tally count, physical crop trauma details, boundary landmark verification notes..."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                {/* THREE SURVEYOR ACTIONS (SECTION 5.D) */}
                <div className="pt-3 border-t border-amber-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Submit Survey Action to Reviewing Officer:
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Action 1: Confirm / Verify */}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => triggerAction('verify')}
                      className="py-3 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Verify</span>
                    </button>

                    {/* Action 2: Survey OK */}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => triggerAction('survey_ok')}
                      className="py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Survey OK</span>
                    </button>

                    {/* Action 3: Reject / Flag Issue */}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => triggerAction('flag')}
                      className="py-3 px-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Flag Issue / Reject</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Existing Findings & Audit Log */}
              {selectedClaim.surveyFindings && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <span className="font-bold text-slate-900 block">Previously Recorded Findings:</span>
                  <div className="text-slate-600 font-mono">
                    Loss Assessed: {selectedClaim.surveyFindings.observedLossPercentage}% • {selectedClaim.surveyFindings.surveyorRecommendation}
                  </div>
                  <p className="text-slate-700 italic">"{selectedClaim.surveyFindings.remarks}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-xs text-slate-500">
              Select an assigned survey from the queue on the left to begin verification.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 ${
                confirmModal.actionType === 'verify' ? 'bg-emerald-600' :
                confirmModal.actionType === 'flag' ? 'bg-rose-600' :
                'bg-amber-600'
              }`}>
                {confirmModal.actionType === 'verify' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{confirmModal.title}</h3>
                <span className="text-[11px] text-slate-400 font-mono">Irreversible Action Log</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmModal({ open: false, actionType: 'verify', title: '', description: '' })}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={executeSurveySubmission}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs ${
                  confirmModal.actionType === 'verify' ? 'bg-emerald-700 hover:bg-emerald-800' :
                  confirmModal.actionType === 'flag' ? 'bg-rose-700 hover:bg-rose-800' :
                  'bg-amber-700 hover:bg-amber-800'
                }`}
              >
                {submitting ? 'Submitting to Officer...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
