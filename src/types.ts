export type Language = 'EN' | 'HI' | 'TE';

export type ViewMode = 
  | 'role_select'
  | 'farmer_login'
  | 'farmer_dashboard'
  | 'staff_login'
  | 'surveyor_dashboard'
  | 'officer_dashboard'
  | 'farmer_report' 
  | 'farmer_capture' 
  | 'farmer_tracker';

export type PerilType = 'Hail' | 'Flood' | 'Drought' | 'Pest';

export type CropType = 'Paddy (Kharif)' | 'Cotton' | 'Maize' | 'Chilli';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'farmer' | 'officer' | 'surveyor';
  designation?: string;
  district?: string;
  state?: string;
  village?: string;
  aadhaar?: string;
  surveyNumber?: string;
  bankAccount?: string;
  bankName?: string;
  ifsc?: string;
  createdAt?: string;
}

export interface PhotoChecklistItem {
  id: number;
  label: string;
  tip: string;
  purpose: string;
  minDistance?: string;
  defaultImage: string;
}

export interface CapturedPhoto {
  id: number;
  slotNumber?: number; // Exactly 1, 2, 3, 4, or 5
  slotKey?: 'wide_field' | 'root_damage' | 'canopy_close' | 'cadastral_landmark' | 'farmer_id';
  label: string;
  url: string; // Active display URL (watermarked derivative)
  originalUrl?: string; // Unmodified original photo URL
  watermarkedUrl?: string; // Watermarked derivative URL
  timestamp: string;
  date: string;
  gps: string;
  accuracyMeters: number;
  tamperChecked: boolean;
  sampleType?: string;
  detectedDamage?: string;
  captureMethod?: 'live_camera' | 'gallery_upload';
  isLiveCapture?: boolean;
  blurScore?: number;
  isBlurry?: boolean;
  qualityStatus?: 'Good' | 'Warning' | 'Rejected';
  qualityReason?: string;
  hash?: string;
  replacedAudit?: { previousUrl: string; replacedAt: string; reason?: string }[];
}

export interface ApplicationDocument {
  name: string;
  url: string;
  size: string;
  type: string;
  uploadedAt: string;
}

export interface SurveyFindings {
  surveyorId: string;
  surveyorName: string;
  surveyDate: string;
  visitGps: string;
  boundaryIntegrityVerified: boolean;
  cropSpeciesVerified: boolean;
  observedLossPercentage: number;
  lodgingObserved: boolean;
  waterloggingObserved: boolean;
  pestSymptomObserved: boolean;
  surveyorRecommendation: string;
  remarks: string;
  additionalPhotos: CapturedPhoto[];
  submittedAt: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  status: string;
  performedBy: string;
  role: 'Farmer' | 'Surveyor' | 'Officer' | 'System';
  action: string;
  notes: string;
}

export interface AIAssessmentData {
  available: boolean;
  damageBand?: 'Marginal' | 'Moderate' | 'Severe';
  severityRecommendation?: 'Marginal' | 'Moderate' | 'Severe';
  explanation?: string;
  damageDescription?: string;
  likelyCause?: string;
  confidence?: number;
  lodgingPercent?: number;
  leafTearSeverity?: string;
  plantCountQuadrat?: string;
  boundaryIntegrity?: string;
  suggestedAction?: string;
  modelSummary?: string;
  evaluatedAt?: string;
  provider?: string;
  advisoryNotice: string;
  insufficientEvidence?: boolean;
  unclearReason?: string;
}

export interface WeatherData {
  available: boolean;
  recordedRainMm?: number;
  precipitationMm?: number;
  maxWindKmh?: number;
  windSpeedMaxKmh?: number;
  tempMaxC?: number;
  weatherCode?: number;
  weatherDesc?: string;
  queryDate?: string;
  location?: string;
  matchScore?: 'Match' | 'Partial' | 'No match' | 'Unavailable';
  corroboratedAt?: string;
  disclaimer: string;
  units?: {
    precipitation: string;
    windSpeed: string;
    temperature: string;
  };
}

export interface Claim {
  id: string;
  farmerId?: string;
  farmerName: string;
  phone: string;
  email?: string;
  aadhaar: string;
  bankAccount: string;
  bankName: string;
  ifsc?: string;
  policyNumber: string;
  village: string;
  district: string;
  state: string;
  surveyNumber: string;
  plotSize: string;
  category?: string;
  crop: CropType | string;
  cause: PerilType | string;
  incidentDate?: string;
  description?: string;
  aiDamage: 'Severe' | 'Moderate' | 'Low';
  aiConfidence: number; // 0 to 100
  damagePercentage: number;
  aiAssessment?: AIAssessmentData;
  weatherMatch: 'Match' | 'Partial' | 'No match';
  weatherDetails: string;
  weatherStats?: {
    recordedRainMm: number;
    maxWindKmh: number;
    historicalMeanRainMm: number;
    hailRadarDetected: boolean;
  };
  weatherData?: WeatherData;
  priority: 'Verified' | 'Review' | 'Visit';
  suggestedAction: string;
  status: 
    | 'Draft'
    | 'Submitted'
    | 'Claim Reported' 
    | 'Evidence Submitted' 
    | 'Under Review' 
    | 'Officer Review' 
    | 'Survey Assigned'
    | 'Survey in Progress'
    | 'Survey Completed'
    | 'Correction Required'
    | 'Approved' 
    | 'Flagged' 
    | 'Rejected';
  submissionTime: string;
  lastUpdated?: string;
  photosCount: number;
  gpsLocked: boolean;
  lat: number;
  lng: number;
  assignedSurveyorId?: string;
  assignedSurveyorName?: string;
  assignedSurveyorPhone?: string;
  assignmentDate?: string;
  surveyDeadline?: string;
  officerInstructions?: string;
  surveyFindings?: SurveyFindings;
  officerNotes?: string;
  rejectionReason?: string;
  correctionRequest?: {
    officerId: string;
    officerName: string;
    requestedAt: string;
    remarks: string;
    resolved: boolean;
  };
  officerOverrideLogged?: boolean;
  payoutStatus?: 'Pending' | 'Approved' | 'Disbursed to Bank' | 'Rejected';
  estimatedPayoutInr: number;
  sanctionedPayoutInr?: number;
  sanctionDetails?: {
    sanctionOrderNumber: string;
    sanctionedAmountInr: number;
    sanctionDate: string;
    officerName: string;
  };
  photos: CapturedPhoto[];
  documents?: ApplicationDocument[];
  history?: HistoryItem[];
}

export interface AppNotification {
  id: string;
  userId: string;
  applicationId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  timestamp: string;
}

export interface VerifiedPolicyDossier {
  found: boolean;
  policyNumber: string;
  farmer: {
    id: string;
    name: string;
    phone?: string;
    village: string;
    district: string;
    state: string;
    aadhaar: string;
    aadhaarVerified: boolean;
    aadhaarVerificationStatus: string;
    landRecordsVerified: boolean;
    landRecordsVerificationStatus: string;
    isDemoRecord: boolean;
  };
  land: {
    surveyNumber: string;
    khasraNumber: string;
    crop: string;
    season: string;
    area: string;
    sumInsured: string;
    sumInsuredRate: string;
    village: string;
    district: string;
    state: string;
    lat: number | null;
    lng: number | null;
    gpsAccuracyMeters: number;
    boundaryCoordinates: [number, number][] | null;
    hasBoundaryPolygon: boolean;
    hasGpsLocation: boolean;
  };
  source: string;
}
