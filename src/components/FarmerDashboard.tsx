import React, { useState, useEffect } from "react";
import {
  ViewMode,
  Language,
  User,
  Claim,
  CapturedPhoto,
  ApplicationDocument,
  AppNotification,
} from "../types";
import { api } from "../api";
import { RealLeafletMap } from "./RealLeafletMap";
import { PhotoRenderer } from "./PhotoRenderer";
import { DirectCameraModal } from "./DirectCameraModal";
import { offlineService, calculate72HourSla } from "../services/offlineQueue";
import { acquireDeviceGps } from "../services/geolocation";
import {
  STATUTORY_SLOTS,
  StatutorySlotDefinition,
  analyzeImageQuality,
  computeImageHash,
  generateWatermarkedDerivative,
} from "../services/evidenceKit";
import {
  User as UserIcon,
  ShieldCheck,
  PlusCircle,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UploadCloud,
  X,
  Trash2,
  Eye,
  Bell,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Phone,
  Landmark,
  MapPin,
  Calendar,
  Check,
  AlertCircle,
  Download,
  LogOut,
  Camera,
  FileCheck,
  Navigation,
  Crosshair,
  Info,
  Compass,
  CloudRain,
} from "lucide-react";

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
  onSelectClaimToTrack,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "new_app" | "track" | "notifications" | "profile"
  >("overview");
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
    aadhaar: user.aadhaar || "XXXX-XXXX-8492",
    state: user.state || "Telangana",
    district: user.district || "Warangal Rural",
    village: user.village || "Nallabelly",
    surveyNumber: user.surveyNumber || "412/A",
    plotSize: "1.2 ha",
    category: "PMFBY Clause 14.2 Localized Calamity",
    crop: "Paddy (Kharif)",
    cause: "Hail",
    description: "",
    bankAccount: user.bankAccount || "3849102847",
    bankName: user.bankName || "State Bank of India",
    ifsc: user.ifsc || "SBIN0004128",
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
  const [capturedLocation, setCapturedLocation] =
    useState<CapturedLocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // Direct Camera Capture state & Statutory 5-Slot Photo states
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [activeSlotForCapture, setActiveSlotForCapture] =
    useState<StatutorySlotDefinition | null>(null);
  const [slotPendingDelete, setSlotPendingDelete] = useState<number | null>(
    null,
  );
  const [uploadingSlotNumber, setUploadingSlotNumber] = useState<number | null>(
    null,
  );
  const [slotErrors, setSlotErrors] = useState<{
    [slotNumber: number]: string;
  }>({});

  // Correction response state
  const [correctionNote, setCorrectionNote] = useState("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Offline Draft State
  const [hasOfflineDraft, setHasOfflineDraft] = useState(false);
  const [offlineDraftInfo, setOfflineDraftInfo] = useState<{
    updatedAt: string;
    photoCount: number;
  } | null>(null);

  // Load applications and notifications
  const loadData = async () => {
    setLoading(true);
    try {
      const [apps, notifs] = await Promise.all([
        api.getApplications(),
        api.getNotifications(),
      ]);
      setApplications(apps);
      setNotifications(notifs);
      setUnreadNotifsCount(notifs.filter((n) => !n.read).length);
      if (apps.length > 0 && !selectedApp) {
        setSelectedApp(apps[0]);
      }
    } catch (err) {
      console.error("Failed to load farmer data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Check for offline saved draft
    const draft = offlineService.loadDraft();
    if (draft) {
      setHasOfflineDraft(true);
      setOfflineDraftInfo({
        updatedAt: draft.updatedAt,
        photoCount: draft.photos?.length || 0,
      });
    }
  }, []);

  const handleRestoreDraft = () => {
    const draft = offlineService.loadDraft();
    if (!draft) return;
    if (draft.formData) {
      setAppForm((prev) => ({ ...prev, ...draft.formData }));
    }
    if (draft.photos && draft.photos.length > 0) {
      setUploadedPhotos(draft.photos);
    }
    if (draft.formData?.lat && draft.formData?.lng) {
      setCapturedLocation({
        lat: draft.formData.lat,
        lng: draft.formData.lng,
        accuracy: 5,
        capturedAt: "Restored from draft",
      });
    }
    setActiveTab("new_app");
    setHasOfflineDraft(false);
  };

  const handleDiscardDraft = () => {
    offlineService.clearDraft();
    setHasOfflineDraft(false);
    setOfflineDraftInfo(null);
  };

  // Stats
  const totalApps = applications.length;
  const awaitingReview = applications.filter(
    (a) =>
      a.status === "Submitted" ||
      a.status === "Under Review" ||
      a.status === "Officer Review",
  ).length;
  const underSurvey = applications.filter(
    (a) => a.status === "Survey Assigned" || a.status === "Survey in Progress",
  ).length;
  const approvedApps = applications.filter(
    (a) => a.status === "Approved",
  ).length;
  const rejectedApps = applications.filter(
    (a) => a.status === "Rejected",
  ).length;
  const correctionReqApps = applications.filter(
    (a) => a.status === "Correction Required",
  ).length;

  // Real Geolocation Capture Handler (Two-Stage Fallback, No Hardcoded Coordinates)
  const handleCaptureLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const res = await acquireDeviceGps();
      if (res.success) {
        setCapturedLocation({
          lat: res.data.lat,
          lng: res.data.lng,
          accuracy: Math.round(res.data.accuracy),
          capturedAt: res.data.formattedTime,
        });
      } else {
        setLocationError(`${res.error.message} ${res.error.instruction}`);
      }
    } catch (err: any) {
      setLocationError(
        err?.message || "Failed to acquire device GPS coordinates.",
      );
    } finally {
      setLocationLoading(false);
    }
  };

  // Direct Camera Photo Attached Callback
  const handlePhotoUploaded = (photo: CapturedPhoto) => {
    setUploadedPhotos((prev) => {
      const idx = prev.findIndex((p) => p.slotNumber === photo.slotNumber);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = photo;
        return copy;
      }
      return [...prev, photo].sort(
        (a, b) => (a.slotNumber || 0) - (b.slotNumber || 0),
      );
    });
    setCameraModalOpen(false);
    setActiveSlotForCapture(null);
  };

  // Statutory Slot File Upload Handler (Quality Analysis + Duplicate Detection + Watermarking)
  const handleSlotFileUpload = async (
    slot: StatutorySlotDefinition,
    file: File,
  ) => {
    if (!file) return;
    setSlotErrors((prev) => ({ ...prev, [slot.slotNumber]: "" }));
    setUploadingSlotNumber(slot.slotNumber);

    try {
      if (file.size > 15 * 1024 * 1024) {
        throw new Error(`File ${file.name} exceeds 15MB limit.`);
      }

      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        throw new Error(
          `Unsupported format (${file.type}). Please select a JPEG or PNG photograph.`,
        );
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read image file."));
        reader.readAsDataURL(file);
      });

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () =>
          reject(
            new Error("Corrupt image file. The image could not be decoded."),
          );
        i.src = dataUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize canvas context.");
      ctx.drawImage(img, 0, 0);

      // Analyze Quality
      const quality = analyzeImageQuality(canvas);
      if (quality.status === "Rejected") {
        throw new Error(
          `Photo Rejected: ${quality.reason || "Poor optical clarity"} (Blur score: ${quality.blurScore}). Please retake a clear photograph.`,
        );
      }

      // Compute Hash & Duplicate Check
      const hash = computeImageHash(dataUrl);
      const duplicate = uploadedPhotos.find(
        (p) => p.slotNumber !== slot.slotNumber && p.hash === hash,
      );
      if (duplicate) {
        throw new Error(
          `Duplicate Photograph: This exact photo was already uploaded for Slot ${duplicate.slotNumber} (${duplicate.label}). Each slot must have a unique photograph.`,
        );
      }

      // Generate Watermark Derivative
      const dateStr = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = new Date().toLocaleTimeString("en-GB") + " IST";
      const watermarkedDataUrl = generateWatermarkedDerivative(canvas, {
        slotNumber: slot.slotNumber,
        slotTitle: slot.title,
        capturedAtDate: dateStr,
        capturedAtTime: timeStr,
        lat: capturedLocation ? capturedLocation.lat : undefined,
        lng: capturedLocation ? capturedLocation.lng : undefined,
        accuracy: capturedLocation ? capturedLocation.accuracy : undefined,
        originalHash: hash,
        isLiveCapture: false,
      });

      // Upload both original file and watermarked derivative
      const [rawUpload, wmUpload] = await Promise.all([
        api.uploadFile(file),
        api.uploadBase64(
          watermarkedDataUrl,
          `wm_slot_${slot.slotNumber}_${Date.now()}.jpg`,
          "image/jpeg",
        ),
      ]);

      const existing = uploadedPhotos.find(
        (p) => p.slotNumber === slot.slotNumber,
      );

      const capturedPhoto: CapturedPhoto = {
        id: Date.now(),
        url: wmUpload.url,
        watermarkedUrl: wmUpload.url,
        originalUrl: rawUpload.url,
        hash,
        slotNumber: slot.slotNumber,
        slotKey: slot.slotKey,
        label: slot.title,
        qualityStatus: quality.status,
        qualityReason: quality.reason,
        blurScore: quality.blurScore,
        gps: capturedLocation
          ? `${capturedLocation.lat.toFixed(5)}° N, ${capturedLocation.lng.toFixed(5)}° E`
          : "GPS Unavailable",
        accuracyMeters: capturedLocation?.accuracy || 0,
        timestamp: timeStr,
        date: dateStr,
        tamperChecked: true,
        replacedAudit: existing
          ? [
              ...(existing.replacedAudit || []),
              {
                replacedAt: timeStr,
                previousUrl: existing.originalUrl || existing.url,
                reason: "Replaced by farmer",
              },
            ]
          : undefined,
      };

      setUploadedPhotos((prev) => {
        const idx = prev.findIndex((p) => p.slotNumber === slot.slotNumber);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = capturedPhoto;
          return updated;
        }
        return [...prev, capturedPhoto].sort(
          (a, b) => (a.slotNumber || 0) - (b.slotNumber || 0),
        );
      });
    } catch (err: any) {
      setSlotErrors((prev) => ({
        ...prev,
        [slot.slotNumber]: err?.message || "Upload processing failed",
      }));
    } finally {
      setUploadingSlotNumber(null);
    }
  };

  const handleRemoveSlotPhoto = (slotNumber: number) => {
    setUploadedPhotos((prev) =>
      prev.filter((p) => p.slotNumber !== slotNumber),
    );
    setSlotPendingDelete(null);
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
            type: file.type || "application/pdf",
            uploadedAt: new Date().toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    } catch (err: any) {
      setAppSubmitError(err.message || "Document upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removePhoto = (id: number) => {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const removeDoc = (name: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.name !== name));
  };

  // Submit Application with Mandatory Location and Exactly 5 Statutory Photos Enforcement
  const handleApplicationSubmit = async (isDraft: boolean = false) => {
    setSubmittingApp(true);
    setAppSubmitError(null);
    setAppSubmitSuccess(null);

    try {
      if (!isDraft) {
        if (!capturedLocation) {
          throw new Error(
            'Mandatory Plot GPS Location Missing: You must capture your actual farm plot coordinates using the "Capture Current Location" button before submitting this application.',
          );
        }
        if (!appForm.crop) throw new Error("Please specify the crop.");
        if (!appForm.cause)
          throw new Error("Please select the peril/calamity cause.");

        const filledSlots = STATUTORY_SLOTS.filter((s) =>
          uploadedPhotos.some((p) => p.slotNumber === s.slotNumber),
        );
        if (filledSlots.length !== 5) {
          const missing = STATUTORY_SLOTS.filter(
            (s) => !uploadedPhotos.some((p) => p.slotNumber === s.slotNumber),
          ).map((s) => `Slot ${s.slotNumber} (${s.title})`);
          throw new Error(
            `Statutory Evidence Incomplete: All 5 statutory field photographs are strictly required. Missing: ${missing.join(", ")} (${filledSlots.length}/5 completed).`,
          );
        }
        const rejected = uploadedPhotos.find(
          (p) => p.qualityStatus === "Rejected",
        );
        if (rejected) {
          throw new Error(
            `Statutory Evidence Rejected: Photograph for Slot ${rejected.slotNumber} (${rejected.label}) was rejected: ${rejected.qualityReason || "poor quality"}. Please retake before submitting.`,
          );
        }
      }

      const newClaim = await api.createApplication({
        ...appForm,
        status: isDraft ? "Draft" : "Submitted",
        photos: uploadedPhotos,
        documents: uploadedDocs,
        estimatedPayoutInr: 42500,
        lat: capturedLocation ? capturedLocation.lat : undefined,
        lng: capturedLocation ? capturedLocation.lng : undefined,
        gpsLocked: Boolean(capturedLocation),
      });

      offlineService.clearDraft();
      setHasOfflineDraft(false);
      setAppSubmitSuccess(
        `Application created successfully! Reference ID: ${newClaim.id}`,
      );
      setUploadedPhotos([]);
      setUploadedDocs([]);
      setCapturedLocation(null);
      await loadData();
      setSelectedApp(newClaim);
      setTimeout(() => {
        setActiveTab("track");
        setAppSubmitSuccess(null);
      }, 1500);
    } catch (err: any) {
      setAppSubmitError(err.message || "Failed to submit application");
    } finally {
      setSubmittingApp(false);
    }
  };

  // Submit Farmer Correction Response
  const handleCorrectionSubmit = async () => {
    if (!selectedApp) return;
    if (!correctionNote.trim()) {
      alert(
        "Please enter your response remarks regarding the requested corrections.",
      );
      return;
    }

    setSubmittingCorrection(true);
    try {
      const updated = await api.updateApplication(selectedApp.id, {
        status: "Submitted",
        updateNotes: correctionNote,
        photos: [...selectedApp.photos, ...uploadedPhotos],
        documents: [...(selectedApp.documents || []), ...uploadedDocs],
      });

      setSelectedApp(updated);
      setCorrectionNote("");
      setUploadedPhotos([]);
      setUploadedDocs([]);
      alert(
        "Correction resubmitted to Mandal Agricultural Officer successfully!",
      );
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to submit correction");
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
                  <span>
                    {user.village || "Nallabelly"},{" "}
                    {user.district || "Warangal Rural"}
                  </span>
                </span>
                <span>•</span>
                <span className="font-mono">
                  Survey No: {user.surveyNumber || "412/A"}
                </span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold font-mono">
                  Aadhaar Linked
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab("new_app");
              }}
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
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "overview"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("new_app")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "new_app"
                ? "bg-emerald-700 text-white shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Application</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("track")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "track"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Applications ({applications.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
              activeTab === "notifications"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "profile"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Farmer Profile</span>
          </button>
        </div>
      </div>

      {/* Offline Draft Recovery Banner */}
      {hasOfflineDraft && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-amber-900 block">
                Unfinished Claim Draft Found
              </span>
              <p className="text-[11px] text-amber-800">
                You have an unsubmitted claim draft saved locally on this device
                ({offlineDraftInfo?.photoCount || 0} photos attached, last
                updated:{" "}
                {offlineDraftInfo?.updatedAt
                  ? new Date(offlineDraftInfo.updatedAt).toLocaleTimeString()
                  : "recently"}
                ).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-xs transition"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* 2. TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Claims
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                {totalApps}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Submitted by you
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Awaiting Review
              </span>
              <span className="text-2xl font-black text-amber-900 font-mono mt-1 block">
                {awaitingReview}
              </span>
              <span className="text-[10px] text-amber-700 block mt-0.5">
                Under office scrutiny
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block">
                Under Survey
              </span>
              <span className="text-2xl font-black text-sky-900 font-mono mt-1 block">
                {underSurvey}
              </span>
              <span className="text-[10px] text-sky-700 block mt-0.5">
                Assigned to surveyor
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Approved
              </span>
              <span className="text-2xl font-black text-emerald-800 font-mono mt-1 block">
                {approvedApps}
              </span>
              <span className="text-[10px] text-emerald-700 block mt-0.5">
                Payout sanctioned
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Rejected
              </span>
              <span className="text-2xl font-black text-rose-800 font-mono mt-1 block">
                {rejectedApps}
              </span>
              <span className="text-[10px] text-rose-600 block mt-0.5">
                Reason available
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                Corrections
              </span>
              <span className="text-2xl font-black text-purple-900 font-mono mt-1 block">
                {correctionReqApps}
              </span>
              <span className="text-[10px] text-purple-700 block mt-0.5">
                Action needed
              </span>
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
                  onClick={() => setActiveTab("track")}
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
                  <p className="text-xs text-slate-600">
                    No applications lodged yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("new_app")}
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
                        setActiveTab("track");
                      }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {app.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                              app.status === "Approved"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : app.status === "Rejected"
                                  ? "bg-rose-50 text-rose-800 border-rose-300"
                                  : app.status === "Correction Required"
                                    ? "bg-purple-50 text-purple-800 border-purple-300"
                                    : app.status.includes("Survey")
                                      ? "bg-sky-50 text-sky-800 border-sky-300"
                                      : "bg-amber-50 text-amber-800 border-amber-300"
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium">
                          {app.crop} • Cause: {app.cause} • {app.village}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Lodge Date: {app.submissionTime}{" "}
                          {app.assignedSurveyorName
                            ? `• Surveyor: ${app.assignedSurveyorName}`
                            : ""}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          ₹
                          {app.estimatedPayoutInr?.toLocaleString("en-IN") ||
                            "42,500"}
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
                  Under PMFBY Clause 14.2 for localized calamities (Hailstorm,
                  Flood, Cloudburst), loss declaration must be lodged within 72
                  hours of the event to guarantee surveyor site verification.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("new_app")}
                  className="w-full py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Report Crop Loss Now</span>
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Registered Plot Location</span>
                  <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                    17.9689° N, 79.5941° E
                  </span>
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
      {activeTab === "new_app" && (
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
              Complete the verification form below and attach geotagged evidence
              photographs.
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
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                <span>Farmer & Scheme Details</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">
                    Farmer Full Name
                  </label>
                  <input
                    type="text"
                    value={appForm.farmerName}
                    onChange={(e) =>
                      setAppForm({ ...appForm, farmerName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">
                    Contact Mobile
                  </label>
                  <input
                    type="text"
                    value={appForm.phone}
                    onChange={(e) =>
                      setAppForm({ ...appForm, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    value={appForm.aadhaar}
                    onChange={(e) =>
                      setAppForm({ ...appForm, aadhaar: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">
                    Scheme Category
                  </label>
                  <select
                    value={appForm.category}
                    onChange={(e) =>
                      setAppForm({ ...appForm, category: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="PMFBY Clause 14.2 Localized Calamity">
                      PMFBY Clause 14.2 (Localized Calamity - Hail/Flood)
                    </option>
                    <option value="PMFBY Post-Harvest Loss">
                      PMFBY Post-Harvest Loss (Within 14 Days)
                    </option>
                    <option value="PMFBY Mid-Season Adversity">
                      PMFBY Mid-Season Adversity (Severe Deficit)
                    </option>
                    <option value="PMFBY Prevented Sowing">
                      PMFBY Prevented Sowing / Planting Risk
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">
                    State & District
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${appForm.state}, ${appForm.district}`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 text-slate-500"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">
                    Village / Mandal
                  </label>
                  <input
                    type="text"
                    value={appForm.village}
                    onChange={(e) =>
                      setAppForm({ ...appForm, village: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Mandatory Farm Plot Geolocation (Live GPS) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                    2
                  </span>
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
                      Under PMFBY operational guidelines, loss claims must be
                      geotagged to the beneficiary&apos;s actual field location.
                      Use your device&apos;s GPS sensor to lock exact
                      coordinates.
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
                        <span>
                          {capturedLocation
                            ? "Recapture Location"
                            : "Capture Current Location"}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {locationError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold block">
                        Device Geolocation Error
                      </span>
                      <p>{locationError}</p>
                      <p className="text-[11px] text-rose-700 font-mono mt-1">
                        Tip: Look for the padlock or settings icon in your
                        browser URL bar, ensure Location is set to
                        &quot;Allow&quot;, and click &quot;Capture Current
                        Location&quot; again.
                      </p>
                    </div>
                  </div>
                )}

                {capturedLocation && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-white border border-emerald-200">
                        <span className="text-[10px] text-slate-500 font-sans block">
                          Latitude
                        </span>
                        <strong className="text-slate-900 text-xs">
                          {capturedLocation.lat.toFixed(6)}° N
                        </strong>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-emerald-200">
                        <span className="text-[10px] text-slate-500 font-sans block">
                          Longitude
                        </span>
                        <strong className="text-slate-900 text-xs">
                          {capturedLocation.lng.toFixed(6)}° E
                        </strong>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-emerald-200">
                        <span className="text-[10px] text-slate-500 font-sans block">
                          GPS Accuracy
                        </span>
                        <strong className="text-emerald-700 text-xs">
                          ±{capturedLocation.accuracy} meters
                        </strong>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-emerald-200">
                        <span className="text-[10px] text-slate-500 font-sans block">
                          Timestamp
                        </span>
                        <strong className="text-slate-900 text-xs">
                          {capturedLocation.capturedAt}
                        </strong>
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
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                <span>Land &amp; Calamity Particulars</span>
              </div>

              <div className="grid sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">
                    Survey / Khasra No.
                  </label>
                  <input
                    type="text"
                    value={appForm.surveyNumber}
                    onChange={(e) =>
                      setAppForm({ ...appForm, surveyNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">
                    Plot Size (Hectares)
                  </label>
                  <input
                    type="text"
                    value={appForm.plotSize}
                    onChange={(e) =>
                      setAppForm({ ...appForm, plotSize: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">
                    Insured Crop
                  </label>
                  <select
                    value={appForm.crop}
                    onChange={(e) =>
                      setAppForm({ ...appForm, crop: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                  >
                    <option value="Paddy (Kharif)">Paddy (Kharif)</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Maize">Maize</option>
                    <option value="Chilli">Chilli</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">
                    Calamity / Peril Cause
                  </label>
                  <select
                    value={appForm.cause}
                    onChange={(e) =>
                      setAppForm({ ...appForm, cause: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                  >
                    <option value="Hail">
                      Hailstorm (ओलावृष्टि / వడగండ్లు)
                    </option>
                    <option value="Flood">
                      Inundation / Flooding (बाढ़ / వరద)
                    </option>
                    <option value="Drought">
                      Severe Rainfall Deficit (सूखा / కరువు)
                    </option>
                    <option value="Pest">
                      Pest Attack / Epidemic (कीट / చీడపీడలు)
                    </option>
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
                  onChange={(e) =>
                    setAppForm({ ...appForm, description: e.target.value })
                  }
                  placeholder="Describe damage observed, lodging severity, date and time of hailstorm or waterlogging..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Section 4: 5 Statutory Evidence Photographs (Mandatory PMFBY Standards) */}
            <div className="space-y-5 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Statutory Photographic Evidence (Mandatory 5-Photo
                      Protocol)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-sans">
                      PMFBY Clause 14.2 requires exactly 5 distinct photographic
                      angles for claim validation.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800">
                      {
                        STATUTORY_SLOTS.filter((s) =>
                          uploadedPhotos.some(
                            (p) => p.slotNumber === s.slotNumber,
                          ),
                        ).length
                      }
                      /5 Completed
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {STATUTORY_SLOTS.filter((s) =>
                        uploadedPhotos.some(
                          (p) => p.slotNumber === s.slotNumber,
                        ),
                      ).length === 5
                        ? "All Slots Verified"
                        : "Mandatory Slots Incomplete"}
                    </span>
                  </div>
                  <div className="w-20 sm:w-28 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        STATUTORY_SLOTS.filter((s) =>
                          uploadedPhotos.some(
                            (p) => p.slotNumber === s.slotNumber,
                          ),
                        ).length === 5
                          ? "bg-emerald-600"
                          : "bg-amber-500"
                      }`}
                      style={{
                        width: `${(STATUTORY_SLOTS.filter((s) => uploadedPhotos.some((p) => p.slotNumber === s.slotNumber)).length / 5) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Grid of 5 Statutory Fixed Slots */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {STATUTORY_SLOTS.map((slot) => {
                  const photo = uploadedPhotos.find(
                    (p) => p.slotNumber === slot.slotNumber,
                  );
                  const isUploadingThis =
                    uploadingSlotNumber === slot.slotNumber;
                  const slotError = slotErrors[slot.slotNumber];

                  return (
                    <div
                      key={slot.slotNumber}
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition relative shadow-2xs ${
                        photo
                          ? "border-emerald-300 bg-emerald-50/20"
                          : "border-slate-300 border-dashed bg-slate-50/60 hover:bg-slate-50"
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase ${
                              photo
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            Slot #{slot.slotNumber}
                          </span>
                          {photo ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Attached
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 font-medium">
                              Required
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 leading-snug pt-1">
                          {slot.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                          {slot.description}
                        </p>
                        <div className="text-[10px] text-emerald-800 font-medium bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-100/60 mt-1">
                          Tip: {slot.captureTip}
                        </div>
                      </div>

                      {/* Slot Body / Preview / Actions */}
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                        {isUploadingThis ? (
                          <div className="p-6 rounded-xl bg-white border border-slate-200 text-center space-y-2">
                            <RefreshCw className="w-5 h-5 text-emerald-700 animate-spin mx-auto" />
                            <span className="text-xs font-semibold text-slate-700 block">
                              Inspecting sharpness &amp; watermarking...
                            </span>
                          </div>
                        ) : photo ? (
                          <div className="space-y-2">
                            {/* Watermarked thumbnail preview */}
                            <div className="relative rounded-xl overflow-hidden border border-emerald-200 bg-slate-100 aspect-video group">
                              <img
                                src={photo.watermarkedUrl || photo.url}
                                alt={photo.label}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                <a
                                  href={photo.watermarkedUrl || photo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded-lg bg-white/90 text-slate-800 font-bold text-[10px] shadow-xs"
                                >
                                  View Full
                                </a>
                              </div>
                            </div>

                            {/* Quality Status Pill */}
                            <div className="flex items-center justify-between text-[10px]">
                              {photo.qualityStatus === "Good" ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  Quality: Good (Sharp)
                                </span>
                              ) : photo.qualityStatus === "Warning" ? (
                                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Quality: Warning (Retake recommended)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  Rejected
                                </span>
                              )}
                              <span
                                className="text-slate-400 font-mono text-[9px] truncate max-w-[100px]"
                                title={photo.hash}
                              >
                                SHA:{" "}
                                {photo.hash
                                  ? photo.hash.substring(0, 8)
                                  : "Logged"}
                              </span>
                            </div>

                            {/* Metadata */}
                            <div className="text-[10px] text-slate-500 font-mono space-y-0.5 bg-white p-2 rounded-lg border border-slate-200">
                              <div className="truncate text-slate-700 font-semibold">
                                {photo.gps || "GPS Coordinates Logged"}
                              </div>
                              <div className="text-slate-400">
                                {photo.timestamp}
                              </div>
                            </div>

                            {/* Slot Button Group */}
                            <div className="grid grid-cols-3 gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSlotForCapture(slot);
                                  setCameraModalOpen(true);
                                }}
                                className="px-2 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition"
                                title="Retake using device camera"
                              >
                                <Camera className="w-3 h-3" />
                                <span>Retake</span>
                              </button>

                              <label className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer">
                                <UploadCloud className="w-3 h-3" />
                                <span>Replace</span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleSlotFileUpload(
                                        slot,
                                        e.target.files[0],
                                      );
                                      e.target.value = "";
                                    }
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() =>
                                  setSlotPendingDelete(slot.slotNumber)
                                }
                                className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center justify-center gap-1 transition"
                                title="Remove photo from slot"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-white text-center space-y-1">
                              <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                              <span className="text-[11px] font-medium text-slate-500 block">
                                Slot {slot.slotNumber} Empty
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSlotForCapture(slot);
                                  setCameraModalOpen(true);
                                }}
                                className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Live Camera</span>
                              </button>

                              <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95">
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Upload File</span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleSlotFileUpload(
                                        slot,
                                        e.target.files[0],
                                      );
                                      e.target.value = "";
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Error banner if upload rejected or duplicate */}
                        {slotError && (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <p className="leading-snug">{slotError}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PDF Document Upload Box */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-center space-y-2.5 transition relative">
                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center mx-auto shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Upload Supporting Land / Bank Documents
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pattadar Passbook, Aadhaar copy, or Revenue survey sketch
                    (PDF only)
                  </p>
                </div>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer transition shadow-xs">
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

              {/* Uploaded Documents List */}
              {uploadedDocs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Attached Documents ({uploadedDocs.length})
                  </span>
                  <div className="space-y-1.5">
                    {uploadedDocs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">
                            {doc.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({doc.size})
                          </span>
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
                    <li>
                      Plot GPS Coordinates not captured. Click &quot;Capture
                      Current Location&quot; in Section 2.
                    </li>
                  )}
                  {uploadedPhotos.length === 0 && (
                    <li>
                      Field crop photograph missing. Click &quot;Capture
                      Photo&quot; in Section 4 to take a live photo.
                    </li>
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
      {activeTab === "track" && (
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
                      ? "border-emerald-600 bg-emerald-50/50 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {claim.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                        claim.status === "Approved"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : claim.status === "Rejected"
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : claim.status === "Correction Required"
                              ? "bg-purple-100 text-purple-800 border-purple-300"
                              : claim.status.includes("Survey")
                                ? "bg-sky-100 text-sky-800 border-sky-300"
                                : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}
                    >
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
                      Lodged on {selectedApp.submissionTime} • Plot Survey{" "}
                      {selectedApp.surveyNumber}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono border ${
                        selectedApp.status === "Approved"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : selectedApp.status === "Rejected"
                            ? "bg-rose-50 text-rose-800 border-rose-300"
                            : selectedApp.status === "Correction Required"
                              ? "bg-purple-50 text-purple-800 border-purple-300"
                              : selectedApp.status.includes("Survey")
                                ? "bg-sky-50 text-sky-800 border-sky-300"
                                : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}
                    >
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
                      <span className="text-[10px] text-emerald-700 block mt-0.5">
                        {selectedApp.submissionTime}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl border ${
                        selectedApp.status !== "Draft" &&
                        selectedApp.status !== "Submitted"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold"
                          : selectedApp.status === "Submitted"
                            ? "bg-amber-50 border-amber-200 text-amber-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>2. Officer Review</span>
                      </div>
                      <span className="text-[10px] block mt-0.5">
                        Scrutiny of claim
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl border ${
                        selectedApp.surveyFindings
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold"
                          : selectedApp.assignedSurveyorId
                            ? "bg-sky-50 border-sky-200 text-sky-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>3. Field Survey</span>
                      </div>
                      <span className="text-[10px] block mt-0.5">
                        {selectedApp.assignedSurveyorName
                          ? selectedApp.assignedSurveyorName
                          : "Surveyor review"}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl border ${
                        selectedApp.status === "Approved"
                          ? "bg-emerald-600 text-white font-bold"
                          : selectedApp.status === "Rejected"
                            ? "bg-rose-600 text-white font-bold"
                            : selectedApp.status === "Correction Required"
                              ? "bg-purple-600 text-white font-bold"
                              : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>4. Sanction</span>
                      </div>
                      <span className="text-[10px] block mt-0.5">
                        {selectedApp.status === "Approved"
                          ? "Approved (DBT)"
                          : selectedApp.status === "Rejected"
                            ? "Rejected"
                            : "Final decision"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated DBT Notice for Approved Claims */}
                {selectedApp.status === "Approved" && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="uppercase tracking-wider text-[11px]">
                        Notice: Simulated DBT Demonstration
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      This sanction was approved in the FarmProof demonstration
                      environment. Direct Benefit Transfer (DBT) is simulated
                      for workflow verification; actual compensation
                      disbursement is executed through state PFMS banking rails.
                    </p>
                    {selectedApp.sanctionDetails && (
                      <div className="pt-1.5 flex flex-wrap gap-3 font-mono text-[10px] text-amber-800">
                        <span>
                          Sanction Order: #
                          {selectedApp.sanctionDetails.sanctionOrderNumber}
                        </span>
                        <span>
                          Amount: ₹
                          {selectedApp.sanctionDetails.sanctionedAmountInr?.toLocaleString(
                            "en-IN",
                          )}
                        </span>
                        <span>
                          Date: {selectedApp.sanctionDetails.sanctionDate}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Crop Damage Advisory & Open-Meteo Corroboration */}
                {(selectedApp.aiAssessment || selectedApp.weatherData) && (
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    {selectedApp.aiAssessment && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            AI Crop Health Assessment
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              selectedApp.aiAssessment
                                .severityRecommendation === "Severe"
                                ? "bg-rose-100 text-rose-800"
                                : selectedApp.aiAssessment
                                      .severityRecommendation === "Moderate"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {selectedApp.aiAssessment.severityRecommendation ||
                              "Advisory"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {selectedApp.aiAssessment.explanation ||
                            selectedApp.aiAssessment.damageDescription}
                        </p>
                        <div className="text-[10px] text-slate-400 italic">
                          * Advisory decision-support. Official field scrutiny
                          remains sovereign.
                        </div>
                      </div>
                    )}

                    {selectedApp.weatherData && (
                      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2">
                        <div className="flex items-center justify-between text-sky-950 font-bold">
                          <span className="flex items-center gap-1.5">
                            <CloudRain className="w-4 h-4 text-sky-600" />
                            <span>Weather Corroboration</span>
                          </span>
                          <span className="font-mono text-[10px] text-sky-800">
                            {selectedApp.weatherData.precipitationMm}{" "}
                            {selectedApp.weatherData.units?.precipitation ||
                              "mm"}
                          </span>
                        </div>
                        <p className="text-[11px] text-sky-800">
                          Wind: {selectedApp.weatherData.windSpeedMaxKmh}{" "}
                          {selectedApp.weatherData.units?.windSpeed || "km/h"} •
                          Temp Max: {selectedApp.weatherData.tempMaxC}°C
                        </p>
                        <div className="text-[10px] text-sky-600 italic">
                          * Open-Meteo radar corroboration context.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Correction Request Box (If Officer requested changes) */}
                {selectedApp.status === "Correction Required" &&
                  selectedApp.correctionRequest && (
                    <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-purple-700" />
                        <span>
                          Correction Requested by{" "}
                          {selectedApp.correctionRequest.officerName}
                        </span>
                      </div>
                      <p className="text-xs bg-white p-3 rounded-xl border border-purple-200">
                        "{selectedApp.correctionRequest.remarks}"
                      </p>

                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-bold block">
                          Submit Correction Response
                        </label>
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
                              <input
                                type="file"
                                accept=".pdf,application/pdf"
                                multiple
                                onChange={handleDocUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            disabled={submittingCorrection}
                            onClick={handleCorrectionSubmit}
                            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
                          >
                            {submittingCorrection
                              ? "Resubmitting..."
                              : "Resubmit to Officer"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Rejection Notice (If Rejected) */}
                {selectedApp.status === "Rejected" &&
                  selectedApp.rejectionReason && (
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
                        Field Surveyor Inspection Findings (
                        {selectedApp.surveyFindings.surveyorName})
                      </span>
                      <span className="font-mono text-[10px] text-sky-700">
                        {selectedApp.surveyFindings.surveyDate}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 bg-white rounded-lg border border-sky-100">
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">
                          Loss Observed
                        </span>
                        <strong className="text-sky-900 text-xs">
                          {selectedApp.surveyFindings.observedLossPercentage}%
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-sky-100">
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">
                          Boundary Match
                        </span>
                        <strong className="text-emerald-700 text-xs">
                          {selectedApp.surveyFindings.boundaryIntegrityVerified
                            ? "Verified"
                            : "Unmatched"}
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-sky-100">
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">
                          Lodging
                        </span>
                        <strong className="text-slate-800 text-xs">
                          {selectedApp.surveyFindings.lodgingObserved
                            ? "Observed"
                            : "None"}
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-sky-100">
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">
                          Recommendation
                        </span>
                        <strong className="text-emerald-700 text-xs">
                          {selectedApp.surveyFindings.surveyorRecommendation}
                        </strong>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-sky-100 text-slate-700">
                      <span className="font-bold block text-slate-900 mb-0.5">
                        Surveyor Field Remarks:
                      </span>
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
                        {selectedApp.lat.toFixed(6)}° N,{" "}
                        {selectedApp.lng.toFixed(6)}° E
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
                    Uploaded Evidence Pack ({selectedApp.photos?.length || 0}{" "}
                    Photographs)
                  </span>
                  {selectedApp.photos && selectedApp.photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedApp.photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs"
                        >
                          <img
                            src={photo.url}
                            alt={photo.label}
                            className="w-full h-28 object-cover"
                          />
                          <div className="p-2 text-[10px] space-y-0.5 bg-white">
                            <span className="font-bold text-slate-800 block truncate">
                              {photo.label}
                            </span>
                            <span className="font-mono text-emerald-800 block">
                              {photo.gps || "Geotagged"}
                            </span>
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
                        <div
                          key={hist.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              {hist.action}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {hist.timestamp}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            By: <strong>{hist.performedBy}</strong> ({hist.role}
                            )
                          </div>
                          <p className="text-[11px] text-slate-700">
                            {hist.notes}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                Select an application on the left to view complete tracking
                details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB 4: NOTIFICATIONS */}
      {activeTab === "notifications" && (
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
                    notif.read
                      ? "bg-slate-50 border-slate-200 text-slate-600"
                      : "bg-emerald-50/60 border-emerald-300 text-slate-900 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${notif.read ? "bg-slate-300" : "bg-emerald-600"}`}
                      ></span>
                      {notif.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {notif.timestamp}
                    </span>
                  </div>
                  <p className="text-xs pl-4 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 5: FARMER PROFILE */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-2xl shadow-xs">
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <span className="text-xs font-mono text-slate-500">
                {user.phone} • PMFBY Registered Farmer
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-sans text-[10px] block font-medium">
                Aadhaar Status
              </span>
              <span className="font-bold text-slate-900">
                {user.aadhaar || "XXXX-XXXX-8492"}
              </span>
              <span className="text-[10px] text-emerald-700 font-sans block mt-0.5">
                UIDAI Verified
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-sans text-[10px] block font-medium">
                Cadastral Survey Parcel
              </span>
              <span className="font-bold text-slate-900">
                Survey No. {user.surveyNumber || "412/A"}
              </span>
              <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                Village: {user.village || "Nallabelly"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-sans text-[10px] block font-medium">
                Direct Benefit Transfer (DBT) Bank
              </span>
              <span className="font-bold text-slate-900">
                {user.bankName || "State Bank of India"}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                A/C: {user.bankAccount || "3849102847"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-sans text-[10px] block font-medium">
                District Agricultural Office
              </span>
              <span className="font-bold text-slate-900">
                {user.district || "Warangal Rural"}
              </span>
              <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                State: {user.state || "Telangana"}
              </span>
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

      {/* Remove Photo Confirmation Modal */}
      {slotPendingDelete !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Remove Statutory Photo?
                </h3>
                <span className="text-xs text-slate-500">
                  Slot #{slotPendingDelete}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this photograph? PMFBY claims
              strictly require all 5 statutory slots to be filled before
              submission.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSlotPendingDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Keep Photo
              </button>
              <button
                type="button"
                onClick={() => handleRemoveSlotPhoto(slotPendingDelete)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Camera Capture Modal (Slot-Aware, Real-time Quality & Watermarking) */}
      {cameraModalOpen && activeSlotForCapture && (
        <DirectCameraModal
          isOpen={cameraModalOpen}
          onClose={() => {
            setCameraModalOpen(false);
            setActiveSlotForCapture(null);
          }}
          onPhotoUploaded={handlePhotoUploaded}
          targetSlot={activeSlotForCapture}
          existingSlotPhoto={uploadedPhotos.find(
            (p) => p.slotNumber === activeSlotForCapture.slotNumber,
          )}
          existingPhotos={uploadedPhotos}
          currentGps={
            capturedLocation
              ? {
                  lat: capturedLocation.lat,
                  lng: capturedLocation.lng,
                  accuracy: capturedLocation.accuracy,
                }
              : null
          }
        />
      )}
    </div>
  );
};
