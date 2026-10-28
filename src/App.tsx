/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ViewMode,
  Language,
  PerilType,
  CropType,
  Claim,
  CapturedPhoto,
  User,
} from "./types";
import { INITIAL_CLAIMS } from "./mockData";
import { api } from "./api";
import { Navbar } from "./components/Navbar";
import { RoleSelect } from "./components/RoleSelect";
import { FarmerLogin } from "./components/FarmerLogin";
import { FarmerDashboard } from "./components/FarmerDashboard";
import { StaffLogin } from "./components/StaffLogin";
import { SurveyorDashboard } from "./components/SurveyorDashboard";
import { OfficerDashboard } from "./components/OfficerDashboard";
import { FarmerReport } from "./components/FarmerReport";
import { FarmerCapture } from "./components/FarmerCapture";
import { FarmerTracker } from "./components/FarmerTracker";
import { PresentationViewerModal } from "./components/PresentationViewerModal";

export default function App() {
  // Current authenticated user session
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);

  // Initial View starts with Government Scheme Profile
  const [view, setView] = useState<ViewMode>("role_select");
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("farmproof_preferred_lang");
      if (saved === "EN" || saved === "HI" || saved === "TE")
        return saved as Language;
    } catch {}
    return "EN";
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem("farmproof_preferred_lang", lang);
    } catch {}
  };

  // Farmer State (Matching Ramulu, 1.2 ha paddy farmer near Warangal)
  const [peril, setPeril] = useState<PerilType>("Hail");
  const [crop, setCrop] = useState<CropType>("Paddy (Kharif)");
  const [location, setLocation] = useState({
    lat: 17.9689,
    lng: 79.5941,
    accuracy: 3.2,
    locked: true,
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeClaimId, setActiveClaimId] = useState<string>("FP-2041");

  // Officer / System State
  const [claimsList, setClaimsList] = useState<Claim[]>(INITIAL_CLAIMS);
  const [selectedClaim, setSelectedClaim] = useState<Claim>(INITIAL_CLAIMS[0]);

  // Check existing session token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setIsAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  // Sync selectedClaim with activeClaimId
  useEffect(() => {
    const found = claimsList.find((c) => c.id === activeClaimId);
    if (found) {
      setSelectedClaim(found);
    }
  }, [activeClaimId, claimsList]);

  // Handle GPS location update
  const handleLocationChange = (lat: number, lng: number) => {
    setLocation((prev) => ({
      ...prev,
      lat,
      lng,
      locked: true,
    }));
  };

  // Live Open-Meteo & AI Processing Engine for 72h camera flow
  const handleSubmitPhotos = async (capturedPhotos: CapturedPhoto[]) => {
    setIsSubmitting(true);
    const todayStr = new Date().toISOString().split("T")[0];
    let weatherResult: Claim["weatherMatch"] = "No match";
    let weatherDetail = "Weather check pending or unavailable for coordinates";
    let weatherDataObj: any = undefined;

    // 1. Fetch real Open-Meteo weather history
    try {
      const weatherRes = await fetch(
        `/api/weather?lat=${location.lat}&lng=${location.lng}&date=${todayStr}`,
      );
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        weatherDataObj = wData;
        if (wData.available && wData.daily) {
          const rain =
            wData.daily.precipitation_sum?.[0] !== undefined
              ? `${wData.daily.precipitation_sum[0]} mm`
              : "0 mm";
          const wind =
            wData.daily.wind_speed_10m_max?.[0] !== undefined
              ? `${wData.daily.wind_speed_10m_max[0]} km/h`
              : "N/A";
          weatherDetail = `Open-Meteo checked: Precipitation ${rain}, Max Wind ${wind} on ${todayStr}`;
          weatherResult =
            wData.daily.precipitation_sum?.[0] > 10 ? "Match" : "Partial";
        } else {
          weatherDetail =
            wData.error ||
            "Meteorological station records unavailable for coordinates";
          weatherResult = "No match";
        }
      }
    } catch {
      weatherDetail =
        "Weather service temporarily unreachable; claim forwarded with photographic evidence";
      weatherResult = "No match";
    }

    // 2. Call Gemini AI Vision / Damage Estimation Engine
    let aiDamageBand: Claim["aiDamage"] = "Moderate";
    let aiConfidence = 0;
    let damagePercentage = 50;
    let suggestedAction =
      "Review: check pack remotely or route to field surveyor";
    let aiAssessmentObj: any = undefined;

    try {
      const aiRes = await fetch("/api/ai/damage-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop,
          peril,
          plotSize: "1.2 ha",
          observedLoss: 75,
          photos: capturedPhotos.map((p) => ({
            id: p.id,
            label: p.label,
            gps: p.gps,
            isBlurry: p.isBlurry,
            isLiveCapture: p.isLiveCapture,
          })),
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        aiAssessmentObj = aiData;
        if (aiData.available && aiData.damageBand) {
          aiDamageBand =
            aiData.damageBand === "Severe" || aiData.damageBand === "severe"
              ? "Severe"
              : aiData.damageBand === "Moderate" ||
                  aiData.damageBand === "moderate"
                ? "Moderate"
                : "Low";
          aiConfidence = Math.round((aiData.confidence || 0.7) * 100);
          damagePercentage = aiData.lodgingPercent || 60;
          suggestedAction = aiData.suggestedAction || suggestedAction;
        } else {
          aiConfidence = 0;
          suggestedAction =
            "Review: AI vision unconfigured; manual officer assessment required";
        }
      }
    } catch {
      aiConfidence = 0;
      suggestedAction =
        "Review: AI vision call timed out; route to ground surveyor";
    }

    // 3. Assemble and persist claim
    const nowTimeStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const newApp = await api.createApplication({
        farmerName: currentUser ? currentUser.name : "Ramulu Kurapati",
        phone: currentUser ? currentUser.phone : "9848023145",
        crop: crop,
        cause: peril,
        plotSize: "1.2 ha",
        aiDamage: aiDamageBand,
        aiConfidence: aiConfidence,
        damagePercentage: damagePercentage,
        aiAssessment: aiAssessmentObj,
        weatherMatch: weatherResult,
        weatherDetails: weatherDetail,
        weatherData: weatherDataObj,
        priority:
          aiConfidence >= 75 && aiDamageBand === "Severe" ? "Visit" : "Review",
        suggestedAction: suggestedAction,
        status: "Submitted",
        photos: capturedPhotos,
        photosCount: capturedPhotos.length,
        lat: location.lat,
        lng: location.lng,
      });

      setClaimsList((prev) => [newApp, ...prev]);
      setActiveClaimId(newApp.id);
      setSelectedClaim(newApp);
    } catch {
      const randomId = `FP-2026-${Math.floor(2055 + Math.random() * 400)}`;
      const fallbackClaim: Claim = {
        id: randomId,
        farmerName: currentUser ? currentUser.name : "Ramulu Kurapati",
        phone: currentUser ? currentUser.phone : "9848023145",
        aadhaar: "XXXX-XXXX-8492",
        bankAccount: "3849102847",
        bankName: "State Bank of India (Warangal)",
        policyNumber: `PMFBY/TS/WR/2026/${Math.floor(10000 + Math.random() * 90000)}`,
        village: "Nallabelly",
        district: "Warangal Rural",
        state: "Telangana",
        surveyNumber: "412/A",
        plotSize: "1.2 ha",
        crop: crop,
        cause: peril,
        aiDamage: aiDamageBand,
        aiConfidence: aiConfidence,
        damagePercentage: damagePercentage,
        aiAssessment: aiAssessmentObj,
        weatherMatch: weatherResult,
        weatherDetails: weatherDetail,
        weatherData: weatherDataObj,
        priority: "Review",
        suggestedAction: suggestedAction,
        status: "Submitted",
        submissionTime: nowTimeStr,
        photosCount: capturedPhotos.length,
        gpsLocked: true,
        lat: location.lat,
        lng: location.lng,
        estimatedPayoutInr: 42500,
        payoutStatus: "Pending",
        photos: capturedPhotos,
      };
      setClaimsList((prev) => [fallbackClaim, ...prev]);
      setActiveClaimId(fallbackClaim.id);
      setSelectedClaim(fallbackClaim);
    } finally {
      setIsSubmitting(false);
      setView("farmer_tracker");
    }
  };

  const handleUpdateClaimStatus = (
    claimId: string,
    status: Claim["status"],
    priority?: Claim["priority"],
    notes?: string,
  ) => {
    setClaimsList((prev) =>
      prev.map((c) => {
        if (c.id === claimId) {
          const isApproved = status === "Approved";
          return {
            ...c,
            status,
            priority: priority || c.priority,
            officerNotes: notes || c.officerNotes,
            officerOverrideLogged: true,
            payoutStatus: isApproved ? "Disbursed to Bank" : c.payoutStatus,
          };
        }
        return c;
      }),
    );
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setView("role_select");
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      {/* Top Navbar */}
      <Navbar
        view={view}
        setView={setView}
        language={language}
        setLanguage={handleSetLanguage}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenPresentation={() => setIsPresentationOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {/* VIEW 0: GOVERNMENT SCHEME PROFILE & OVERVIEW (HOME) */}
        {view === "role_select" && (
          <RoleSelect
            setView={setView}
            language={language}
            currentUser={currentUser}
            onOpenPresentation={() => setIsPresentationOpen(true)}
          />
        )}

        {/* VIEW 1: DEDICATED FARMER LOGIN & REGISTRATION PORTAL */}
        {view === "farmer_login" && (
          <FarmerLogin
            setView={setView}
            language={language}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {/* VIEW 2: COMPLETE FARMER DASHBOARD */}
        {view === "farmer_dashboard" &&
          (currentUser && currentUser.role === "farmer" ? (
            <FarmerDashboard
              user={currentUser}
              language={language}
              setView={setView}
              onLogout={handleLogout}
              onSelectClaimToTrack={(claim) => {
                setSelectedClaim(claim);
                setActiveClaimId(claim.id);
                setView("farmer_tracker");
              }}
            />
          ) : (
            <FarmerLogin
              setView={setView}
              language={language}
              onLoginSuccess={handleLoginSuccess}
            />
          ))}

        {/* VIEW 3: DEDICATED OFFICER & SURVEYOR STAFF LOGIN PORTAL */}
        {view === "staff_login" && (
          <StaffLogin
            setView={setView}
            language={language}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {/* VIEW 4: SURVEYOR DASHBOARD */}
        {view === "surveyor_dashboard" &&
          (currentUser && currentUser.role === "surveyor" ? (
            <SurveyorDashboard
              user={currentUser}
              language={language}
              setView={setView}
              onLogout={handleLogout}
            />
          ) : (
            <StaffLogin
              setView={setView}
              language={language}
              onLoginSuccess={handleLoginSuccess}
            />
          ))}

        {/* VIEW 5: OFFICER DASHBOARD */}
        {view === "officer_dashboard" &&
          (currentUser && currentUser.role === "officer" ? (
            <OfficerDashboard
              user={currentUser}
              claims={claimsList}
              selectedClaim={selectedClaim}
              onSelectClaim={(claim) => {
                setSelectedClaim(claim);
                setActiveClaimId(claim.id);
              }}
              onUpdateClaimStatus={handleUpdateClaimStatus}
              language={language}
              onLogout={handleLogout}
            />
          ) : (
            <StaffLogin
              setView={setView}
              language={language}
              onLoginSuccess={handleLoginSuccess}
            />
          ))}

        {/* SUB-FLOW: 72H FARMER LOSS INTIMATION */}
        {view === "farmer_report" && (
          <FarmerReport
            peril={peril}
            setPeril={setPeril}
            crop={crop}
            setCrop={setCrop}
            location={location}
            onLocationChange={handleLocationChange}
            onStartCapture={() => setView("farmer_capture")}
            language={language}
          />
        )}

        {/* SUB-FLOW: GUIDED LIVE CAMERA CAPTURE */}
        {view === "farmer_capture" && (
          <FarmerCapture
            location={location}
            onBack={() => setView("farmer_report")}
            onSubmitPhotos={handleSubmitPhotos}
            isSubmitting={isSubmitting}
            language={language}
          />
        )}

        {/* SUB-FLOW: FARMER CLAIM TRACKER */}
        {view === "farmer_tracker" && (
          <FarmerTracker
            claim={selectedClaim}
            onViewInOfficer={() => setView("officer_dashboard")}
            onLodgeNew={() => {
              if (currentUser?.role === "farmer") {
                setView("farmer_dashboard");
              } else {
                setView("farmer_report");
              }
            }}
            language={language}
          />
        )}
      </main>

      {/* Official Government Portal Footer */}
      <footer className="py-6 bg-white border-t border-slate-200 text-center text-xs text-slate-500 space-y-2">
        <div className="font-semibold text-slate-700">
          Pradhan Mantri Fasal Bima Yojana (PMFBY) • National Crop Insurance
          Portal
        </div>
        <div>
          Department of Agriculture & Farmers Welfare • Ministry of Agriculture
          & Farmers Welfare, Government of India
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Operational Guidelines Clause 14.2 (Localized Calamities) • 24x7 Kisan
          Call Centre: 14447 / 1800-180-1551
        </div>
      </footer>

      {/* Global Presentation Slide Deck Viewer Modal */}
      <PresentationViewerModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
      />
    </div>
  );
}
