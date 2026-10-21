import React, { useState, useEffect } from 'react';
import { ViewMode, Language, User, Claim, CapturedPhoto, ApplicationDocument, AppNotification } from '../types';
import { api } from '../api';
import { RealLeafletMap } from './RealLeafletMap';
import { PhotoRenderer } from './PhotoRenderer';
import { DirectCameraModal } from './DirectCameraModal';
import { 
  User as UserIcon, ShieldCheck, PlusCircle, Search, Clock, 
  CheckCircle2, AlertTriangle, FileText, UploadCloud, X, 
  Trash2, Eye, Bell, ChevronRight, ArrowRight, RefreshCw, 
  Phone, Landmark, MapPin, Calendar, Check, AlertCircle, 
  Download, LogOut, Camera, FileCheck, Navigation, Crosshair, 
  Info, Compass
} from 'lucide-react';

interface FarmerDashboardProps {
  user: User;
  language: Language;
  setView: (view: ViewMode) => void;
  onLogout: () => void;
  onSelectClaimToTrack?: (claim: Claim) => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  user,
  language,
  setView,
  onLogout,
  onSelectClaimToTrack
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'new_app' | 'track' | 'notifications' | 'profile'>('overview');
  const [applications, setApplications] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Claim | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // New application form state
  const [appForm, setAppForm] = useState({
    farmerName: user.name,
    phone: user.phone,
    email: user.email,
    aadhaar: user.aadhaar || 'XXXX-XXXX-8492',
    state: user.state || 'Telangana',
    district: user.district || 'Warangal Rural',
    village: user.village || 'Nallabelly',
    surveyNumber: user.surveyNumber || '412/A',
    plotSize: '1.2 ha',
    category: 'PMFBY Clause 14.2 Localized Calamity',
    crop: 'Paddy (Kharif)',
    cause: 'Hail',
    description: '',
    bankAccount: user.bankAccount || '3849102847',
    bankName: user.bankName || 'State Bank of India',
    ifsc: user.ifsc || 'SBIN0004128'
  });

  const [uploadedPhotos, setUploadedPhotos] = useState<CapturedPhoto[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<ApplicationDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submittingApp, setSubmittingApp] = useState(false);
  const [appSubmitSuccess, setAppSubmitSuccess] = useState<string | null>(null);
  const [appSubmitError, setAppSubmitError] = useState<string | null>(null);

  // Mandatory Location state
  interface CapturedLocationData {
    lat: number;
    lng: number;
    accuracy: number;
    capturedAt: string;
  }
  const [capturedLocation, setCapturedLocation] = useState<CapturedLocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Direct Camera Capture state
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);

  // Correction response state
  const [correctionNote, setCorrectionNote] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Load applications and notifications
  const loadData = async () => {
    setLoading(true);
    try {
      const [apps, notifs] = await Promise.all([
        api.getApplications(),
        api.getNotifications()
      ]);
      setApplications(apps);
      setNotifications(notifs);
      setUnreadNotifsCount(notifs.filter(n => !n.read).length);
      if (apps.length > 0 && !selectedApp) {
        setSelectedApp(apps[0]);
      }
    } catch (err) {
      console.error('Failed to load farmer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Stats
  const totalApps = applications.length;
  const awaitingReview = applications.filter(a => a.status === 'Submitted' || a.status === 'Under Review' || a.status === 'Officer Review').length;
  const underSurvey = applications.filter(a => a.status === 'Survey Assigned' || a.status === 'Survey in Progress').length;
  const approvedApps = applications.filter(a => a.status === 'Approved').length;
  const rejectedApps = applications.filter(a => a.status === 'Rejected').length;
  const correctionReqApps = applications.filter(a => a.status === 'Correction Required').length;

  // Real Geolocation Capture Handler (Mandatory Location)
  const handleCaptureLocation = () => {
    setLocationLoading(true);
    setLocationError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation API is not supported by your current browser.');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCapturedLocation({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          capturedAt: new Date().toLocaleTimeString('en-GB')
        });
        setLocationLoading(false);
      },
      (err) => {
        let msg = 'Failed to acquire device GPS coordinates.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser address bar (look for the lock or site settings icon) and click "Capture Current Location" again.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS location is currently unavailable from your device. Please ensure location services are enabled in your device settings.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'GPS location request timed out. Please retry.';
        }
        setLocationError(msg);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Direct Camera Photo Attached Callback
  const handlePhotoUploaded = (photo: CapturedPhoto) => {
    setUploadedPhotos((prev) => [...prev, photo]);
  };

  // Document Upload Handler (for PDF Land / Bank Records)
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setAppSubmitError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 15 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 15MB size limit.`);
        }
        const uploaded = await api.uploadFile(file);
        setUploadedDocs((prev) => [
          ...prev,
          {
            name: file.name,
            url: uploaded.url,
            size: uploaded.size,
            type: file.type || 'application/pdf',
            uploadedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      setAppSubmitError(err.message || 'Document upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (id: number) => {
    setUploadedPhotos(prev => prev.filter(p => p.id !== id));
  };

  const removeDoc = (name: string) => {
    setUploadedDocs(prev => prev.filter(d => d.name !== name));
  };

  // Submit Application with Mandatory Location and Camera Photo Enforcement
  const handleApplicationSubmit = async (isDraft: boolean = false) => {
    setSubmittingApp(true);
    setAppSubmitError(null);
    setAppSubmitSuccess(null);

    try {
      if (!isDraft) {
        if (!capturedLocation) {
          throw new Error('Mandatory Plot GPS Location Missing: You must capture your actual farm plot coordinates using the "Capture Current Location" button before submitting this application.');
        }
        if (!appForm.crop) throw new Error('Please specify the crop.');
        if (!appForm.cause) throw new Error('Please select the peril/calamity cause.');
        if (uploadedPhotos.length === 0) {
          throw new Error('Please capture at least 1 supporting field photograph of the damaged crop using the camera.');
        }
      }

      const newClaim = await api.createApplication({
        ...appForm,
        status: isDraft ? 'Draft' : 'Submitted',
        photos: uploadedPhotos,
        documents: uploadedDocs,
        estimatedPayoutInr: 42500,
        lat: capturedLocation ? capturedLocation.lat : undefined,
        lng: capturedLocation ? capturedLocation.lng : undefined,
        gpsLocked: Boolean(capturedLocation)
      });

      setAppSubmitSuccess(`Application created successfully! Reference ID: ${newClaim.id}`);
      setUploadedPhotos([]);
      setUploadedDocs([]);
      setCapturedLocation(null);
      await loadData();
      setSelectedApp(newClaim);
      setTimeout(() => {
        setActiveTab('track');
        setAppSubmitSuccess(null);
      }, 1500);
    } catch (err: any) {
      setAppSubmitError(err.message || 'Failed to submit application');
    } finally {
      setSubmittingApp(false);
    }
  };

  // Submit Farmer Correction Response
  const handleCorrectionSubmit = async () => {
    if (!selectedApp) return;
    if (!correctionNote.trim()) {
      alert('Please enter your response remarks regarding the requested corrections.');
      return;
    }

    setSubmittingCorrection(true);
    try {
      const updated = await api.updateApplication(selectedApp.id, {
        status: 'Submitted',
        updateNotes: correctionNote,
        photos: [...selectedApp.photos, ...uploadedPhotos],
        documents: [...(selectedApp.documents || []), ...uploadedDocs]
      });

      setSelectedApp(updated);
      setCorrectionNote('');
      setUploadedPhotos([]);
      setUploadedDocs([]);
      alert('Correction resubmitted to Mandal Agricultural Officer successfully!');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit correction');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-3 sm:py-6 px-1 sm:px-4 space-y-6">
      {/* 1. Header with Farmer Profile Badge */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Beneficiary Farmer Profile
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {user.phone}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {user.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{user.village || 'Nallabelly'}, {user.district || 'Warangal Rural'}</span>
                </span>
                <span>•</span>
                <span className="font-mono">Survey No: {user.surveyNumber || '412/A'}</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold font-mono">Aadhaar Linked</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => { setActiveTab('new_app'); }}
              className="py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit New Application</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 hover:text-rose-600 transition"
              title="Logout from Farmer Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new_app')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'new_app'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Application</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('track')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'track'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Applications ({applications.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
              activeTab === 'notifications'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
            {unreadNotifsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Farmer Profile</span>
          </button>
        </div>
      </div>

      {/* 2. TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Claims</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{totalApps}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Submitted by you</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Awaiting Review</span>
              <span className="text-2xl font-black text-amber-900 font-mono mt-1 block">{awaitingReview}</span>
              <span className="text-[10px] text-amber-700 block mt-0.5">Under office scrutiny</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block">Under Survey</span>
              <span className="text-2xl font-black text-sky-900 font-mono mt-1 block">{underSurvey}</span>
              <span className="text-[10px] text-sky-700 block mt-0.5">Assigned to surveyor</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Approved</span>
              <span className="text-2xl font-black text-emerald-800 font-mono mt-1 block">{approvedApps}</span>
              <span className="text-[10px] text-emerald-700 block mt-0.5">Payout sanctioned</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">Rejected</span>
              <span className="text-2xl font-black text-rose-800 font-mono mt-1 block">{rejectedApps}</span>
              <span className="text-[10px] text-rose-600 block mt-0.5">Reason available</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">Corrections</span>
              <span className="text-2xl font-black text-purple-900 font-mono mt-1 block">{correctionReqApps}</span>
              <span className="text-[10px] text-purple-700 block mt-0.5">Action needed</span>
            </div>
          </div>

          {/* Quick Action & Recent Submissions */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Recent Applications List */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Recent Applications & Status
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('track')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                  <span>Loading your applications...</span>
                </div>
              ) : applications.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-600">No applications lodged yet.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new_app')}
                    className="py-2 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs"
                  >
                    Submit First Application
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {applications.slice(0, 4).map((app) => (
                    <div 
                      key={app.id} 
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl px-2 transition cursor-pointer"
                      onClick={() => {
                        setSelectedApp(app);
                        setActiveTab('track');
                      }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-xs">{app.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                            app.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            app.status === 'Rejected' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                            app.status === 'Correction Required' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                            app.status.includes('Survey') ? 'bg-sky-50 text-sky-800 border-sky-300' :
                            'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">
                          {app.crop} • Cause: {app.cause} • {app.village}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Lodge Date: {app.submissionTime} {app.assignedSurveyorName ? `• Surveyor: ${app.assignedSurveyorName}` : ''}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          ₹{app.estimatedPayoutInr?.toLocaleString('en-IN') || '42,500'}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right 1 Col: Statutory 72h Calamity Notice & Cadastre */}
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-3xl border border-amber-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-amber-900 text-xs font-bold uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>Mandatory 72-Hour Rule</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Under PMFBY Clause 14.2 for localized calamities (Hailstorm, Flood, Cloudburst), loss declaration must be lodged within 72 hours of the event to guarantee surveyor site verification.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new_app')}
                  className="w-full py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Report Crop Loss Now</span>
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Registered Plot Location</span>
                  <span className="text-[10px] text-emerald-700 font-mono font-semibold">17.9689° N, 79.5941° E</span>
                </div>
                <div className="rounded-2xl overflow-hidden border border-slate-200 h-44 shadow-inner">
                  <RealLeafletMap
                    lat={17.9689}
                    lng={79.5941}
                    accuracy={3.2}
                    interactive={false}
                    height="h-44"
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  Cadastral survey boundary: Warangal Rural basin.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: SUBMIT NEW APPLICATION */}
      {activeTab === 'new_app' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 uppercase tracking-wider">
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span>Multi-Section PMFBY Application</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Submit Crop Loss Claim Application
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Complete the verification form below and attach geotagged evidence photographs.
            </p>
          </div>

          {appSubmitError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Validation Error</span>
                <span>{appSubmitError}</span>
              </div>
            </div>
          )}

          {appSubmitSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Success</span>
                <span>{appSubmitSuccess}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Section 1: Farmer & Beneficiary Details */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Farmer & Scheme Details</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Farmer Full Name</label>
                  <input
                    type="text"
                    value={appForm.farmerName}
                    onChange={(e) => setAppForm({ ...appForm, farmerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Contact Mobile</label>
                  <input
                    type="text"
                    value={appForm.phone}
                    onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Aadhaar Number</label>
                  <input
                    type="text"
                    value={appForm.aadhaar}
                    onChange={(e) => setAppForm({ ...appForm, aadhaar: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Scheme Category</label>
                  <select
                    value={appForm.category}
                    onChange={(e) => setAppForm({ ...appForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="PMFBY Clause 14.2 Localized Calamity">PMFBY Clause 14.2 (Localized Calamity - Hail/Flood)</option>
                    <option value="PMFBY Post-Harvest Loss">PMFBY Post-Harvest Loss (Within 14 Days)</option>
                    <option value="PMFBY Mid-Season Adversity">PMFBY Mid-Season Adversity (Severe Deficit)</option>
                    <option value="PMFBY Prevented Sowing">PMFBY Prevented Sowing / Planting Risk</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">State & District</label>
                  <input
                    type="text"
                    disabled
                    value={`${appForm.state}, ${appForm.district}`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 text-slate-500"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Village / Mandal</label>
                  <input
                    type="text"
                    value={appForm.village}
                    onChange={(e) => setAppForm({ ...appForm, village: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Mandatory Farm Plot Geolocation (Live GPS) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>Mandatory Farm Plot Geolocation (Live GPS)</span>
                </div>
                {capturedLocation ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>GPS Location Locked &amp; Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Plot Coordinates Required</span>
                  </span>
                )}
              </div>

              <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Crosshair className="w-4 h-4 text-emerald-700" />
                      <span>Statutory Plot Coordinate Verification</span>
                    </div>
                    <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                      Under PMFBY operational guidelines, loss claims must be geotagged to the beneficiary&apos;s actual field location. Use your device&apos;s GPS sensor to lock exact coordinates.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={locationLoading}
                    className="shrink-0 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                  >
                    {locationLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Acquiring GPS...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 animate-pulse" />
                        <span>{capturedLocation ? 'Recapture Location' : 'Capture Current Location'}</span>
                      </>
                    )}
                  </button>
                </div>

                {locationError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold block">Device Geolocation Error</span>
                      <p>{locationError}</p>
                      <p className="text-[11px] text-rose-700 font-mono mt-1">
                        Tip: Look for the padlock or settings icon in your browser URL bar, ensure Location is set to &quot;Allow&quot;, and click &quot;Capture Current Location&quot; again.
                      </p>
                    </div>
                  </div>
                )}

                {capturedLocation && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-white border border-emerald-200">
                        <span className="text-[10px] text-slate-500 font-sans block">Latitude</span>
                        <strong className="text-slate-900 text-xs">{capturedLocation.lat.toFixed(6)}° N</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-emerald-200">
                        <span className="text-[10px] text-slate-500 font-sans block">Longitude</span>
                        <strong className="text-slate-900 text-xs">{capturedLocation.lng.toFixed(6)}° E</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-emerald-200">
                        <span className="text-[10px] text-slate-500 font-sans block">GPS Accuracy</span>
                        <strong className="text-emerald-700 text-xs">±{capturedLocation.accuracy} meters</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-emerald-200">
                        <span className="text-[10px] text-slate-500 font-sans block">Timestamp</span>
                        <strong className="text-slate-900 text-xs">{capturedLocation.capturedAt}</strong>
                      </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-emerald-300 h-48 shadow-inner">
                      <RealLeafletMap
                        lat={capturedLocation.lat}
                        lng={capturedLocation.lng}
                        accuracy={capturedLocation.accuracy}
                        interactive={false}
                        height="h-48"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Land & Calamity Particulars */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Land &amp; Calamity Particulars</span>
              </div>

              <div className="grid sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Survey / Khasra No.</label>
                  <input
                    type="text"
                    value={appForm.surveyNumber}
                    onChange={(e) => setAppForm({ ...appForm, surveyNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Plot Size (Hectares)</label>
                  <input
                    type="text"
                    value={appForm.plotSize}
                    onChange={(e) => setAppForm({ ...appForm, plotSize: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Insured Crop</label>
                  <select
                    value={appForm.crop}
                    onChange={(e) => setAppForm({ ...appForm, crop: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                  >
                    <option value="Paddy (Kharif)">Paddy (Kharif)</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Maize">Maize</option>
                    <option value="Chilli">Chilli</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Calamity / Peril Cause</label>
                  <select
                    value={appForm.cause}
                    onChange={(e) => setAppForm({ ...appForm, cause: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                  >
                    <option value="Hail">Hailstorm (ओलावृष्टि / వడగండ్లు)</option>
                    <option value="Flood">Inundation / Flooding (बाढ़ / వరద)</option>
                    <option value="Drought">Severe Rainfall Deficit (सूखा / కరువు)</option>
                    <option value="Pest">Pest Attack / Epidemic (कीट / చీడపీడలు)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold text-xs">
                  Description of Crop Loss &amp; Incident
                </label>
                <textarea
                  rows={3}
                  value={appForm.description}
                  onChange={(e) => setAppForm({ ...appForm, description: e.target.value })}
                  placeholder="Describe damage observed, lodging severity, date and time of hailstorm or waterlogging..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Section 4: Geotagged Photographs (Direct Camera Only) & Supporting Documents */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">4</span>
                  <span>Photographs (Direct Camera Only) &amp; Supporting Documents</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold lowercase">
                  Live Camera Snapshots + PDF Documents
                </span>
              </div>

              {/* Action Cards Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Direct Camera Capture Card */}
                <div className="p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50 text-center space-y-3 transition relative">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-xs">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Direct Field Camera Capture
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Open device rear camera directly in browser. Takes live canvas frame snapshot.
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setCameraModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs cursor-pointer transition shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{uploadedPhotos.length === 0 ? 'Capture Photo' : 'Capture Another Photo'}</span>
                  </button>

                  <div className="text-[10px] text-emerald-800 font-medium">
                    No file picker • Rear camera default • Direct stream snapshot
                  </div>
                </div>

                {/* PDF Document Upload Box */}
                <div className="p-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-center space-y-3 transition relative">
                  <div className="w-12 h-12 rounded-2xl bg-slate-700 text-white flex items-center justify-center mx-auto shadow-xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Upload Land / Bank Documents
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pattadar Passbook, Aadhaar copy, or Revenue survey sketch (PDF only)
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer transition shadow-xs">
                    <UploadCloud className="w-4 h-4" />
                    <span>Select Documents (PDF)</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      onChange={handleDocUpload}
                      className="hidden"
                    />
                  </label>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Max 15MB per PDF document
                  </div>
                </div>
              </div>

              {uploading && (
                <div className="p-3 rounded-xl bg-slate-100 text-slate-700 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                  <span>Processing and uploading files to secure server storage...</span>
                </div>
              )}

              {/* Uploaded Photos Previews */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Attached Field Photographs ({uploadedPhotos.length})</span>
                  {uploadedPhotos.length === 0 && (
                    <span className="text-amber-700 font-normal text-[11px]">
                      * Minimum 1 live camera photo required
                    </span>
                  )}
                </div>

                {uploadedPhotos.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No field photographs captured yet. Click &quot;Capture Photo&quot; to open the camera.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {uploadedPhotos.map((photo) => (
                      <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-emerald-200 bg-slate-100 shadow-2xs">
                        <img src={photo.url} alt={photo.label} className="w-full h-28 object-cover" />
                        <div className="p-2 bg-white text-[10px] space-y-0.5">
                          <span className="font-bold text-slate-800 block truncate">{photo.label}</span>
                          <span className="text-emerald-700 font-mono block">Geotag: {photo.gps || 'Real Coordinates'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition"
                          title="Remove image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Uploaded Documents List */}
              {uploadedDocs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Attached Documents ({uploadedDocs.length})
                  </span>
                  <div className="space-y-1.5">
                    {uploadedDocs.map((doc, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{doc.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({doc.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDoc(doc.name)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submission Requirements Checklist Banner */}
            {(!capturedLocation || uploadedPhotos.length === 0) && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Mandatory Submission Prerequisites Pending
                </span>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800">
                  {!capturedLocation && (
                    <li>Plot GPS Coordinates not captured. Click &quot;Capture Current Location&quot; in Section 2.</li>
                  )}
                  {uploadedPhotos.length === 0 && (
                    <li>Field crop photograph missing. Click &quot;Capture Photo&quot; in Section 4 to take a live photo.</li>
                  )}
                </ul>
              </div>
            )}

            {/* Actions: Save Draft vs Submit */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                disabled={submittingApp}
                onClick={() => handleApplicationSubmit(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={submittingApp}
                onClick={() => handleApplicationSubmit(false)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
              >
                {submittingApp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Formal Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 3: TRACK APPLICATIONS & TIMELINE */}
      {activeTab === 'track' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Applications List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 lg:col-span-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                My Submitted Claims
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                {applications.length} Claims
              </span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {applications.map((claim) => (
                <div
                  key={claim.id}
                  onClick={() => setSelectedApp(claim)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer space-y-1.5 ${
                    selectedApp?.id === claim.id
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-xs">{claim.id}</span>
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
                  <div className="text-xs text-slate-700 font-medium">
                    {claim.crop} ({claim.cause})
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{claim.village}</span>
                    <span>{claim.submissionTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Detailed Application Details & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {selectedApp ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                {/* Top Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      PMFBY Official Application File
                    </span>
                    <h2 className="text-xl font-black text-slate-900 font-mono">
                      {selectedApp.id}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Lodged on {selectedApp.submissionTime} • Plot Survey {selectedApp.surveyNumber}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono border ${
                      selectedApp.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                      selectedApp.status === 'Rejected' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                      selectedApp.status === 'Correction Required' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                      selectedApp.status.includes('Survey') ? 'bg-sky-50 text-sky-800 border-sky-300' :
                      'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {selectedApp.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Application Verification Journey
                  </span>
                  
                  {/* Timeline steps */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>1. Submitted</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">{selectedApp.submissionTime}</span>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      selectedApp.status !== 'Draft' && selectedApp.status !== 'Submitted'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                        : selectedApp.status === 'Submitted'
                        ? 'bg-amber-50 border-amber-200 text-amber-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>2. Officer Review</span>
                      </div>
                      <span className="text-[10px] block mt-0.5">Scrutiny of claim</span>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      selectedApp.surveyFindings
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                        : selectedApp.assignedSurveyorId
                        ? 'bg-sky-50 border-sky-200 text-sky-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>3. Field Survey</span>
                      </div>
                      <span className="text-[10px] block mt-0.5">
                        {selectedApp.assignedSurveyorName ? selectedApp.assignedSurveyorName : 'Surveyor review'}
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      selectedApp.status === 'Approved'
                        ? 'bg-emerald-600 text-white font-bold'
                        : selectedApp.status === 'Rejected'
                        ? 'bg-rose-600 text-white font-bold'
                        : selectedApp.status === 'Correction Required'
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>4. Sanction</span>
                      </div>
                      <span className="text-[10px] block mt-0.5">
                        {selectedApp.status === 'Approved' ? 'Approved (DBT)' : selectedApp.status === 'Rejected' ? 'Rejected' : 'Final decision'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Correction Request Box (If Officer requested changes) */}
                {selectedApp.status === 'Correction Required' && selectedApp.correctionRequest && (
                  <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-purple-700" />
                      <span>Correction Requested by {selectedApp.correctionRequest.officerName}</span>
                    </div>
                    <p className="text-xs bg-white p-3 rounded-xl border border-purple-200">
                      "{selectedApp.correctionRequest.remarks}"
                    </p>
                    
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-bold block">Submit Correction Response</label>
                      <textarea
                        rows={2}
                        value={correctionNote}
                        onChange={(e) => setCorrectionNote(e.target.value)}
                        placeholder="Explain changes made or add additional evidence clarifications..."
                        className="w-full p-2.5 rounded-xl border border-purple-300 text-xs bg-white focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCameraModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-300 text-purple-800 text-xs font-semibold hover:bg-purple-50 transition"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Capture Photo (Camera)</span>
                          </button>
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-300 text-purple-800 text-xs font-semibold cursor-pointer hover:bg-purple-50 transition">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Attach PDF Doc</span>
                            <input type="file" accept=".pdf,application/pdf" multiple onChange={handleDocUpload} className="hidden" />
                          </label>
                        </div>
                        <button
                          type="button"
                          disabled={submittingCorrection}
                          onClick={handleCorrectionSubmit}
                          className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
                        >
                          {submittingCorrection ? 'Resubmitting...' : 'Resubmit to Officer'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection Notice (If Rejected) */}
                {selectedApp.status === 'Rejected' && selectedApp.rejectionReason && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5 text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-rose-800">
                      <AlertCircle className="w-4 h-4" />
                      Rejection Reason Recorded by Officer
                    </span>
                    <p className="bg-white p-3 rounded-xl border border-rose-200 text-rose-700 font-mono">
                      {selectedApp.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Surveyor Findings Box (If Survey Completed) */}
                {selectedApp.surveyFindings && (
                  <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-3 text-xs">
                    <div className="flex items-center justify-between text-sky-950">
                      <span className="font-bold flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-sky-700" />
                        Field Surveyor Inspection Findings ({selectedApp.surveyFindings.surveyorName})
                      </span>
                      <span className="font-mono text-[10px] text-sky-700">{selectedApp.surveyFindings.surveyDate}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 bg-white rounded-lg border border-sky-100">
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Loss Observed</span>
                        <strong className="text-sky-900 text-xs">{selectedApp.surveyFindings.observedLossPercentage}%</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-sky-100">
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Boundary Match</span>
                        <strong className="text-emerald-700 text-xs">{selectedApp.surveyFindings.boundaryIntegrityVerified ? 'Verified' : 'Unmatched'}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-sky-100">
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Lodging</span>
                        <strong className="text-slate-800 text-xs">{selectedApp.surveyFindings.lodgingObserved ? 'Observed' : 'None'}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-sky-100">
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Recommendation</span>
                        <strong className="text-emerald-700 text-xs">{selectedApp.surveyFindings.surveyorRecommendation}</strong>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-sky-100 text-slate-700">
                      <span className="font-bold block text-slate-900 mb-0.5">Surveyor Field Remarks:</span>
                      {selectedApp.surveyFindings.remarks}
                    </div>
                  </div>
                )}

                {/* Plot GPS Coordinates & Geotag Map */}
                {selectedApp.lat && selectedApp.lng && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Registered Plot Coordinates (GPS Geotagged)</span>
                      </span>
                      <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {selectedApp.lat.toFixed(6)}° N, {selectedApp.lng.toFixed(6)}° E
                      </span>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-slate-200 h-44 shadow-inner">
                      <RealLeafletMap
                        lat={selectedApp.lat}
                        lng={selectedApp.lng}
                        accuracy={4.5}
                        interactive={false}
                        height="h-44"
                      />
                    </div>
                  </div>
                )}

                {/* Evidence Photos Gallery */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Uploaded Evidence Pack ({selectedApp.photos?.length || 0} Photographs)
                  </span>
                  {selectedApp.photos && selectedApp.photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedApp.photos.map((photo) => (
                        <div key={photo.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs">
                          <img src={photo.url} alt={photo.label} className="w-full h-28 object-cover" />
                          <div className="p-2 text-[10px] space-y-0.5 bg-white">
                            <span className="font-bold text-slate-800 block truncate">{photo.label}</span>
                            <span className="font-mono text-emerald-800 block">{photo.gps || 'Geotagged'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500">
                      No photographs attached.
                    </div>
                  )}
                </div>

                {/* Audit History Log */}
                {selectedApp.history && selectedApp.history.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Audit Trail & Status History
                    </span>
                    <div className="space-y-2">
                      {selectedApp.history.map((hist) => (
                        <div key={hist.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{hist.action}</span>
                            <span className="font-mono text-[10px] text-slate-400">{hist.timestamp}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            By: <strong>{hist.performedBy}</strong> ({hist.role})
                          </div>
                          <p className="text-[11px] text-slate-700">{hist.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                Select an application on the left to view complete tracking details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB 4: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-bold text-slate-900">
                Farmer Notifications & Alerts
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {notifications.length} Total Alerts
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No notifications at this time.
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => api.markNotificationRead(notif.id)}
                  className={`p-4 rounded-2xl border transition space-y-1 ${
                    notif.read ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-emerald-50/60 border-emerald-300 text-slate-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${notif.read ? 'bg-slate-300' : 'bg-emerald-600'}`}></span>
                      {notif.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{notif.timestamp}</span>
                  </div>
                  <p className="text-xs pl-4 leading-relaxed">{notif.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 5: FARMER PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-2xl shadow-xs">
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <span className="text-xs font-mono text-slate-500">{user.phone} • PMFBY Registered Farmer</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-sans text-[10px] block font-medium">Aadhaar Status</span>
              <span className="font-bold text-slate-900">{user.aadhaar || 'XXXX-XXXX-8492'}</span>
              <span className="text-[10px] text-emerald-700 font-sans block mt-0.5">UIDAI Verified</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-sans text-[10px] block font-medium">Cadastral Survey Parcel</span>
              <span className="font-bold text-slate-900">Survey No. {user.surveyNumber || '412/A'}</span>
              <span className="text-[10px] text-slate-500 font-sans block mt-0.5">Village: {user.village || 'Nallabelly'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-sans text-[10px] block font-medium">Direct Benefit Transfer (DBT) Bank</span>
              <span className="font-bold text-slate-900">{user.bankName || 'State Bank of India'}</span>
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">A/C: {user.bankAccount || '3849102847'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-sans text-[10px] block font-medium">District Agricultural Office</span>
              <span className="font-bold text-slate-900">{user.district || 'Warangal Rural'}</span>
              <span className="text-[10px] text-slate-500 font-sans block mt-0.5">State: {user.state || 'Telangana'}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Session secured with Bearer Token
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Direct Camera Capture Modal (Direct getUserMedia stream only) */}
      <DirectCameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onPhotoUploaded={handlePhotoUploaded}
        currentPhotoCount={uploadedPhotos.length}
        currentGps={capturedLocation ? `${capturedLocation.lat.toFixed(5)}° N, ${capturedLocation.lng.toFixed(5)}° E` : undefined}
        gpsAccuracy={capturedLocation ? capturedLocation.accuracy : undefined}
      />
    </div>
  );
};
