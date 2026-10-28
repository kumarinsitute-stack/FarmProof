import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
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
  createdAt: string;
}

export interface ApplicationPhoto {
  id: number;
  slotNumber?: number; // 1 to 5
  slotKey?: string;
  label: string;
  url: string;
  originalUrl?: string;
  watermarkedUrl?: string;
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
  additionalPhotos: ApplicationPhoto[];
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
  maxWindKmh?: number;
  weatherCode?: number;
  weatherDesc?: string;
  queryDate?: string;
  location?: string;
  matchScore?: 'Match' | 'Partial' | 'No match' | 'Unavailable';
  corroboratedAt?: string;
  disclaimer: string;
}

export interface Application {
  id: string;
  farmerId: string;
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
  category: string;
  crop: string;
  cause: string;
  incidentDate?: string;
  description: string;
  aiDamage: 'Severe' | 'Moderate' | 'Low';
  aiConfidence: number;
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
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Survey Assigned' | 'Survey in Progress' | 'Survey Completed' | 'Correction Required' | 'Approved' | 'Rejected';
  submissionTime: string;
  lastUpdated: string;
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
  payoutStatus?: 'Pending' | 'Approved' | 'Disbursed to Bank' | 'Rejected';
  estimatedPayoutInr: number;
  sanctionedPayoutInr?: number;
  sanctionDetails?: {
    sanctionOrderNumber: string;
    sanctionedAmountInr: number;
    sanctionDate: string;
    officerName: string;
  };
  photos: ApplicationPhoto[];
  documents?: ApplicationDocument[];
  history: HistoryItem[];
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

export interface InstitutionalUsage {
  organizationName: string;
  division: string;
  activeTier: string;
  billingStatus: string;
  claimsIngested: number;
  aiVisionRuns: number;
  weatherCorroborations: number;
  fieldSurveysDispatched: number;
  lastBillingCycleStart: string;
  commercialReadinessNotes: string;
}

export interface PolicyRecord {
  id: string;
  policyNumber: string;
  applicationId?: string;
  farmerId: string;
  farmerName: string;
  phone: string;
  email?: string;
  village: string;
  district: string;
  state: string;
  surveyNumber: string;
  khasraNumber?: string;
  crop: string;
  season: string;
  plotSize: string;
  sumInsured: number;
  sumInsuredRate?: string;
  lat?: number;
  lng?: number;
  gpsAccuracyMeters?: number;
  boundaryCoordinates?: [number, number][]; // Cadastral boundary polygon coordinates
  aadhaar: string;
  aadhaarVerified: boolean;
  aadhaarVerificationStatus: 'Demo Verified (Synthetic Sandbox)' | 'Verified (UIDAI e-KYC)' | 'Pending Verification';
  landRecordsVerified: boolean;
  landRecordsVerificationStatus: 'Demo Verified (State Portal Sandbox)' | 'Verified (State CCLA Portal)' | 'Pending Verification';
  isDemoRecord: boolean;
  source: string;
  importedAt?: string;
}

interface DatabaseSchema {
  users: User[];
  applications: Application[];
  policies: PolicyRecord[];
  notifications: AppNotification[];
  sessions: { [token: string]: string }; // token -> userId
  institutionalUsage: InstitutionalUsage;
}

const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL_INSTITUTIONAL_USAGE: InstitutionalUsage = {
  organizationName: 'Department of Agriculture & Farmers Welfare, Warangal Rural Division',
  division: 'Telangana Southern Circle (Mandal Crop Insurance Administration)',
  activeTier: 'Institutional Pilot Tier (Research & Evaluation)',
  billingStatus: 'Pilot / Sandbox (Free Evaluator Access)',
  claimsIngested: 3,
  aiVisionRuns: 3,
  weatherCorroborations: 3,
  fieldSurveysDispatched: 2,
  lastBillingCycleStart: '01 Oct 2026',
  commercialReadinessNotes: 'Farmers access 100% free under PMFBY public mandate. Ready for institutional per-claim billing tier (e.g., ₹45 per processed evidence packet) upon commercial scale-up.'
};

// Initial seed users
const INITIAL_USERS: User[] = [
  {
    id: 'usr-officer-1',
    name: 'S. Sharma',
    email: 'officer@farmproof.gov.in',
    phone: '9848011223',
    password: 'Officer@2026',
    role: 'officer',
    designation: 'Mandal Agricultural Officer',
    district: 'Warangal Rural',
    state: 'Telangana',
    createdAt: '2026-10-01T09:00:00Z'
  },
  {
    id: 'usr-surveyor-1',
    name: 'K. Ramesh',
    email: 'surveyor@farmproof.gov.in',
    phone: '9848033445',
    password: 'Surveyor@2026',
    role: 'surveyor',
    designation: 'Cadastral Field Surveyor (Block A)',
    district: 'Warangal Rural',
    state: 'Telangana',
    createdAt: '2026-10-01T09:00:00Z'
  },
  {
    id: 'usr-surveyor-2',
    name: 'Anil Rao',
    email: 'surveyor.anil@farmproof.gov.in',
    phone: '9848055667',
    password: 'Surveyor@2026',
    role: 'surveyor',
    designation: 'District Crop Loss Assessor (Block B)',
    district: 'Warangal Rural',
    state: 'Telangana',
    createdAt: '2026-10-01T09:00:00Z'
  },
  {
    id: 'usr-farmer-1',
    name: 'Ramulu Kurapati',
    email: 'ramulu@farmer.in',
    phone: '9848023145',
    password: 'Farmer@2026',
    role: 'farmer',
    aadhaar: 'XXXX-XXXX-8492',
    state: 'Telangana',
    district: 'Warangal Rural',
    village: 'Nallabelly',
    surveyNumber: '412/A',
    bankAccount: '3849102847',
    bankName: 'State Bank of India (Warangal)',
    ifsc: 'SBIN0004128',
    createdAt: '2026-10-10T10:00:00Z'
  },
  {
    id: 'usr-farmer-2',
    name: 'Lakshmi Bai',
    email: 'lakshmi@farmer.in',
    phone: '9848099881',
    password: 'Farmer@2026',
    role: 'farmer',
    aadhaar: 'XXXX-XXXX-3190',
    state: 'Telangana',
    district: 'Warangal Rural',
    village: 'Chennaraopet',
    surveyNumber: '528/B',
    bankAccount: '2019485731',
    bankName: 'Andhra Pradesh Grameena Vikas Bank',
    ifsc: 'APGV0002149',
    createdAt: '2026-10-12T11:00:00Z'
  },
  {
    id: 'usr-farmer-3',
    name: 'Srinivas Rao',
    email: 'srinivas@farmer.in',
    phone: '9440182931',
    password: 'Farmer@2026',
    role: 'farmer',
    aadhaar: 'XXXX-XXXX-4819',
    state: 'Telangana',
    district: 'Warangal Rural',
    village: 'Parkal',
    surveyNumber: '108/B',
    bankAccount: '2094810293',
    bankName: 'Andhra Bank (Parkal)',
    ifsc: 'ANDB0001928',
    createdAt: '2026-10-14T09:00:00Z'
  },
  {
    id: 'usr-farmer-4',
    name: 'Suresh Reddy',
    email: 'suresh@farmer.in',
    phone: '9848077665',
    password: 'Farmer@2026',
    role: 'farmer',
    aadhaar: 'XXXX-XXXX-9912',
    state: 'Telangana',
    district: 'Warangal Rural',
    village: 'Geesugonda',
    surveyNumber: '210/C',
    bankAccount: '1102938475',
    bankName: 'Canara Bank',
    ifsc: 'CNRB0003819',
    createdAt: '2026-10-14T10:00:00Z'
  },
  {
    id: 'usr-farmer-5',
    name: 'Anjaiah B.',
    email: 'anjaiah@farmer.in',
    phone: '9849201948',
    password: 'Farmer@2026',
    role: 'farmer',
    aadhaar: 'XXXX-XXXX-9182',
    state: 'Telangana',
    district: 'Warangal Rural',
    village: 'Geesugonda',
    surveyNumber: '219/C',
    bankAccount: '1098492810',
    bankName: 'Telangana Grameena Bank',
    ifsc: 'TGB0001092',
    createdAt: '2026-10-15T11:00:00Z'
  }
];

// Initial seed applications
const INITIAL_APPLICATIONS: Application[] = [
  {
    id: 'FP-2041',
    farmerId: 'usr-farmer-1',
    farmerName: 'Ramulu Kurapati',
    phone: '9848023145',
    email: 'ramulu@farmer.in',
    aadhaar: 'XXXX-XXXX-8492',
    bankAccount: '3849102847',
    bankName: 'State Bank of India (Warangal)',
    ifsc: 'SBIN0004128',
    policyNumber: 'PMFBY/TS/WR/2026/89401',
    village: 'Nallabelly',
    district: 'Warangal Rural',
    state: 'Telangana',
    surveyNumber: '412/A',
    plotSize: '1.2 ha',
    category: 'PMFBY Clause 14.2 Localized Calamity',
    crop: 'Paddy (Kharif)',
    cause: 'Hail',
    description: 'Sudden high-intensity hailstorm with heavy wind gusts causing severe lodging and stem snapping across plot basin.',
    aiDamage: 'Severe',
    aiConfidence: 84,
    damagePercentage: 84,
    weatherMatch: 'Match',
    weatherDetails: 'Hailstorm & 48.2mm precipitation recorded on 16 Oct within 4km radius',
    weatherStats: {
      recordedRainMm: 48.2,
      maxWindKmh: 46.5,
      historicalMeanRainMm: 3.1,
      hailRadarDetected: true
    },
    priority: 'Visit',
    suggestedAction: 'Visit: Damage is severe, spot-check required before payout',
    status: 'Survey Completed',
    submissionTime: '16 Oct 2026, 14:32',
    lastUpdated: '18 Oct 2026, 16:45',
    photosCount: 5,
    gpsLocked: true,
    lat: 17.9689,
    lng: 79.5941,
    assignedSurveyorId: 'usr-surveyor-1',
    assignedSurveyorName: 'K. Ramesh',
    assignedSurveyorPhone: '9848033445',
    assignmentDate: '17 Oct 2026, 10:15',
    surveyDeadline: '20 Oct 2026',
    officerInstructions: 'Conduct physical quadrant sampling to verify lodging density and confirm border landmarks.',
    surveyFindings: {
      surveyorId: 'usr-surveyor-1',
      surveyorName: 'K. Ramesh',
      surveyDate: '18 Oct 2026',
      visitGps: '17.9691° N, 79.5939° E',
      boundaryIntegrityVerified: true,
      cropSpeciesVerified: true,
      observedLossPercentage: 82,
      lodgingObserved: true,
      waterloggingObserved: false,
      pestSymptomObserved: false,
      surveyorRecommendation: 'Recommend Approval',
      remarks: 'Inspected plot Survey 412/A in Nallabelly. Physical verification confirms 82% lodging due to hailstorm trauma. All boundary markers align with cadastral map.',
      additionalPhotos: [
        {
          id: 101,
          label: 'Surveyor Field Verification Photo',
          url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1000&q=80',
          timestamp: '15:20:12 IST',
          date: '18 Oct 2026',
          gps: '17.9691° N, 79.5939° E',
          accuracyMeters: 2.1,
          tamperChecked: true,
          sampleType: 'surveyor_quadrat',
          detectedDamage: 'Official Stem tally verified 23 of 28 stems broken'
        }
      ],
      submittedAt: '18 Oct 2026, 16:45'
    },
    officerNotes: 'Survey findings submitted by Surveyor K. Ramesh. Awaiting final officer sanction.',
    estimatedPayoutInr: 42500,
    payoutStatus: 'Pending',
    photos: [
      {
        id: 1,
        label: 'Wide Plot View',
        url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80',
        timestamp: '14:28:10 IST',
        date: '16 Oct 2026',
        gps: '17.9689° N, 79.5941° E',
        accuracyMeters: 3.2,
        tamperChecked: true,
        sampleType: 'wide_lodging',
        detectedDamage: '82% lodging across 1.2 ha basin'
      },
      {
        id: 2,
        label: 'Close-up of Damaged Leaves',
        url: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1000&q=80',
        timestamp: '14:29:05 IST',
        date: '16 Oct 2026',
        gps: '17.9689° N, 79.5941° E',
        accuracyMeters: 2.8,
        tamperChecked: true,
        sampleType: 'leaf_hail_holes',
        detectedDamage: 'Severe leaf laceration & shredding'
      },
      {
        id: 3,
        label: 'Plant Count Sample',
        url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1000&q=80',
        timestamp: '14:30:15 IST',
        date: '16 Oct 2026',
        gps: '17.9690° N, 79.5940° E',
        accuracyMeters: 2.4,
        tamperChecked: true,
        sampleType: 'quadrat_stem_count',
        detectedDamage: '24/28 stems broken at base'
      },
      {
        id: 4,
        label: 'Boundary & Landmark',
        url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1000&q=80',
        timestamp: '14:31:02 IST',
        date: '16 Oct 2026',
        gps: '17.9687° N, 79.5943° E',
        accuracyMeters: 3.1,
        tamperChecked: true,
        sampleType: 'cadastral_survey_landmark',
        detectedDamage: 'Plot boundary matches Khasra #884'
      },
      {
        id: 5,
        label: 'Undamaged Comparison',
        url: 'https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=1000&q=80',
        timestamp: '14:31:48 IST',
        date: '16 Oct 2026',
        gps: '17.9692° N, 79.5938° E',
        accuracyMeters: 3.5,
        tamperChecked: true,
        sampleType: 'healthy_control',
        detectedDamage: 'Standing canopy in shielded north zone'
      }
    ],
    documents: [
      {
        name: 'Land_Pattadar_Passbook_412A.pdf',
        url: '/sample-pattadar.pdf',
        size: '1.2 MB',
        type: 'application/pdf',
        uploadedAt: '16 Oct 2026, 14:32'
      }
    ],
    history: [
      {
        id: 'hist-1',
        timestamp: '16 Oct 2026, 14:32',
        status: 'Submitted',
        performedBy: 'Ramulu Kurapati',
        role: 'Farmer',
        action: 'Application Submitted',
        notes: 'Submitted initial claim with 5 geotagged evidence photographs and Pattadar Passbook.'
      },
      {
        id: 'hist-2',
        timestamp: '16 Oct 2026, 14:33',
        status: 'Under Review',
        performedBy: 'FarmProof Automated Engine',
        role: 'System',
        action: 'AI Vision & Weather Verification',
        notes: 'Open-Meteo validated 48.2mm rain and hail radar match. Gemini AI estimated 84% lodging loss.'
      },
      {
        id: 'hist-3',
        timestamp: '17 Oct 2026, 10:15',
        status: 'Survey Assigned',
        performedBy: 'S. Sharma (MAO)',
        role: 'Officer',
        action: 'Surveyor Assigned',
        notes: 'Assigned to Surveyor K. Ramesh for on-site physical stem tally verification.'
      },
      {
        id: 'hist-4',
        timestamp: '18 Oct 2026, 16:45',
        status: 'Survey Completed',
        performedBy: 'K. Ramesh',
        role: 'Surveyor',
        action: 'Field Survey Findings Submitted',
        notes: 'Site visit completed. Boundary verified. Loss assessed at 82%. Recommended for approval.'
      }
    ]
  },
  {
    id: 'FP-2038',
    farmerId: 'usr-farmer-2',
    farmerName: 'Lakshmi Bai',
    phone: '9848099881',
    email: 'lakshmi@farmer.in',
    aadhaar: 'XXXX-XXXX-3190',
    bankAccount: '2019485731',
    bankName: 'Andhra Pradesh Grameena Vikas Bank',
    ifsc: 'APGV0002149',
    policyNumber: 'PMFBY/TS/WR/2026/89402',
    village: 'Chennaraopet',
    district: 'Warangal Rural',
    state: 'Telangana',
    surveyNumber: '528/B',
    plotSize: '0.9 ha',
    category: 'PMFBY Clause 14.2 Localized Calamity',
    crop: 'Cotton',
    cause: 'Flood',
    description: 'Continuous submergence from overflowing canal breach; standing water reached 45cm for 4 consecutive days.',
    aiDamage: 'Severe',
    aiConfidence: 81,
    damagePercentage: 78,
    weatherMatch: 'Match',
    weatherDetails: 'Rainfall 112mm on 14-16 Oct, stream overflow detected',
    priority: 'Visit',
    suggestedAction: 'Visit: Submergence verification needed to distinguish from poor drainage',
    status: 'Survey Assigned',
    submissionTime: '15 Oct 2026, 11:20',
    lastUpdated: '17 Oct 2026, 14:00',
    photosCount: 5,
    gpsLocked: true,
    lat: 17.9214,
    lng: 79.6412,
    assignedSurveyorId: 'usr-surveyor-1',
    assignedSurveyorName: 'K. Ramesh',
    assignedSurveyorPhone: '9848033445',
    assignmentDate: '17 Oct 2026, 14:00',
    surveyDeadline: '21 Oct 2026',
    officerInstructions: 'Verify water depth marks on cotton stems and check if root rot has set in.',
    officerNotes: 'Assigned to Surveyor K. Ramesh for flood watermarking survey.',
    estimatedPayoutInr: 33800,
    payoutStatus: 'Pending',
    photos: [
      {
        id: 1,
        label: 'Wide Plot View',
        url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80',
        timestamp: '11:15:20 IST',
        date: '15 Oct 2026',
        gps: '17.9214° N, 79.6412° E',
        accuracyMeters: 3.8,
        tamperChecked: true,
        detectedDamage: 'Waterlogged cotton basin'
      }
    ],
    history: [
      {
        id: 'hist-2038-1',
        timestamp: '15 Oct 2026, 11:20',
        status: 'Submitted',
        performedBy: 'Lakshmi Bai',
        role: 'Farmer',
        action: 'Application Submitted',
        notes: 'Submitted flood damage report within 48 hours of inundation.'
      },
      {
        id: 'hist-2038-2',
        timestamp: '17 Oct 2026, 14:00',
        status: 'Survey Assigned',
        performedBy: 'S. Sharma (MAO)',
        role: 'Officer',
        action: 'Surveyor Assigned',
        notes: 'Assigned to K. Ramesh for on-site root rot and submergence survey.'
      }
    ]
  },
  {
    id: 'FP-2035',
    farmerId: 'usr-farmer-3',
    farmerName: 'Suresh Reddy',
    phone: '9848077665',
    aadhaar: 'XXXX-XXXX-9912',
    bankAccount: '1102938475',
    bankName: 'Canara Bank',
    policyNumber: 'PMFBY/TS/WR/2026/65104',
    village: 'Geesugonda',
    district: 'Warangal Rural',
    state: 'Telangana',
    surveyNumber: '210/C',
    plotSize: '2.0 ha',
    category: 'PMFBY Post-Harvest Loss',
    crop: 'Maize',
    cause: 'Hail',
    description: 'Harvested maize ears spread on drying floor hit by severe unseasonal hailstorm and flash rain.',
    aiDamage: 'Severe',
    aiConfidence: 91,
    damagePercentage: 88,
    weatherMatch: 'Match',
    weatherDetails: 'Hail and violent storm validated across Geesugonda cluster',
    priority: 'Verified',
    suggestedAction: 'Verified: High confidence and weather match; fast-track approved',
    status: 'Approved',
    submissionTime: '14 Oct 2026, 09:15',
    lastUpdated: '17 Oct 2026, 11:30',
    photosCount: 5,
    gpsLocked: true,
    lat: 17.9450,
    lng: 79.6800,
    officerNotes: 'High AI confidence and corroborating radar records. Sanctioned full compensation.',
    sanctionedPayoutInr: 68000,
    estimatedPayoutInr: 68000,
    payoutStatus: 'Disbursed to Bank',
    photos: [],
    history: [
      {
        id: 'hist-2035-1',
        timestamp: '14 Oct 2026, 09:15',
        status: 'Submitted',
        performedBy: 'Suresh Reddy',
        role: 'Farmer',
        action: 'Application Submitted',
        notes: 'Post-harvest loss intimation lodged.'
      },
      {
        id: 'hist-2035-2',
        timestamp: '17 Oct 2026, 11:30',
        status: 'Approved',
        performedBy: 'S. Sharma (MAO)',
        role: 'Officer',
        action: 'Claim Sanctioned',
        notes: 'Sanctioned ₹68,000 for direct benefit transfer to Canara Bank account.'
      }
    ]
  },
  {
    id: 'FP-2043',
    farmerId: 'usr-farmer-3',
    farmerName: 'Srinivas Rao',
    phone: '9440182931',
    email: 'srinivas@farmer.in',
    aadhaar: 'XXXX-XXXX-4819',
    bankAccount: '2094810293',
    bankName: 'Andhra Bank (Parkal)',
    ifsc: 'ANDB0001928',
    policyNumber: 'PMFBY/TS/WR/2026/89403',
    village: 'Parkal',
    district: 'Warangal Rural',
    state: 'Telangana',
    surveyNumber: '108/B',
    plotSize: '0.8 ha',
    category: 'PMFBY Clause 14.2 Localized Calamity',
    crop: 'Cotton',
    cause: 'Flood',
    description: 'Heavy rain and flash flooding causing waterlogging across low-lying cotton basin.',
    aiDamage: 'Moderate',
    aiConfidence: 78,
    damagePercentage: 45,
    weatherMatch: 'Match',
    weatherDetails: 'Heavy precipitation 62.4mm recorded on 15 Oct',
    priority: 'Review',
    suggestedAction: 'Review remotely: Clear waterlogging pattern',
    status: 'Under Review',
    submissionTime: '16 Oct 2026, 11:15',
    lastUpdated: '17 Oct 2026, 09:30',
    photosCount: 5,
    gpsLocked: true,
    lat: 18.1964,
    lng: 79.7042,
    estimatedPayoutInr: 22000,
    payoutStatus: 'Pending',
    photos: [],
    history: [
      {
        id: 'hist-2043-1',
        timestamp: '16 Oct 2026, 11:15',
        status: 'Submitted',
        performedBy: 'Srinivas Rao',
        role: 'Farmer',
        action: 'Application Submitted',
        notes: 'Flood waterlogging report lodged within statutory 72h window.'
      }
    ]
  },
  {
    id: 'FP-2047',
    farmerId: 'usr-farmer-5',
    farmerName: 'Anjaiah B.',
    phone: '9849201948',
    email: 'anjaiah@farmer.in',
    aadhaar: 'XXXX-XXXX-9182',
    bankAccount: '1098492810',
    bankName: 'Telangana Grameena Bank',
    ifsc: 'TGB0001092',
    policyNumber: 'PMFBY/TS/WR/2026/89407',
    village: 'Geesugonda',
    district: 'Warangal Rural',
    state: 'Telangana',
    surveyNumber: '219/C',
    plotSize: '2.1 ha',
    category: 'PMFBY Clause 14.2 Localized Calamity',
    crop: 'Paddy (Kharif)',
    cause: 'Hail',
    description: 'Intense hailstorm causing massive panicle shattering and 88% crop flattening.',
    aiDamage: 'Severe',
    aiConfidence: 91,
    damagePercentage: 88,
    weatherMatch: 'Match',
    weatherDetails: 'Severe hailstorm event corroborated by regional doppler radar on 16 Oct',
    priority: 'Verified',
    suggestedAction: 'Auto-approve: High AI confidence & weather match',
    status: 'Approved',
    submissionTime: '16 Oct 2026, 09:40',
    lastUpdated: '18 Oct 2026, 15:00',
    photosCount: 5,
    gpsLocked: true,
    lat: 17.9234,
    lng: 79.6421,
    sanctionedPayoutInr: 72000,
    estimatedPayoutInr: 72000,
    payoutStatus: 'Approved',
    photos: [],
    history: [
      {
        id: 'hist-2047-1',
        timestamp: '16 Oct 2026, 09:40',
        status: 'Submitted',
        performedBy: 'Anjaiah B.',
        role: 'Farmer',
        action: 'Application Submitted',
        notes: 'Hail damage intimation submitted.'
      },
      {
        id: 'hist-2047-2',
        timestamp: '18 Oct 2026, 15:00',
        status: 'Approved',
        performedBy: 'S. Sharma (MAO)',
        role: 'Officer',
        action: 'Statutory Approval',
        notes: 'Full sanction of ₹72,000 approved for DBT transfer.'
      }
    ]
  }
];

export const INITIAL_POLICIES: PolicyRecord[] = [
  {
    id: 'pol-89401',
    policyNumber: 'PMFBY/TS/WR/2026/89401',
    applicationId: 'FP-2041',
    farmerId: 'usr-farmer-1',
    farmerName: 'Ramulu Kurapati',
    phone: '9848023145',
    email: 'ramulu@farmer.in',
    village: 'Nallabelly',
    district: 'Warangal Rural',
    state: 'Telangana',
    surveyNumber: '412/A',
    khasraNumber: 'Khasra 884',
    crop: 'Paddy (Kharif)',
    season: 'Kharif 2026',
    plotSize: '1.2 ha',
    sumInsured: 50400,
    sumInsuredRate: '₹42,000 / ha',
    lat: 17.9689,
    lng: 79.5941,
    gpsAccuracyMeters: 3.2,
    boundaryCoordinates: [
      [17.9698, 79.5932],
      [17.9697, 79.5949],
      [17.9681, 79.5950],
      [17.9680, 79.5933]
    ],
    aadhaar: 'XXXX-XXXX-8492',
    aadhaarVerified: true,
    aadhaarVerificationStatus: 'Demo Verified (Synthetic Sandbox)',
    landRecordsVerified: true,
    landRecordsVerificationStatus: 'Demo Verified (State Portal Sandbox)',
    isDemoRecord: true,
    source: 'PMFBY National Portal (Demo Sandbox)'
  },
  {
    id: 'pol-89402',
    policyNumber: 'PMFBY/TS/WR/2026/89402',
    applicationId: 'FP-2038',
    farmerId: 'usr-farmer-2',
    farmerName: 'Lakshmi Bai',
    phone: '9848099881',
    email: 'lakshmi@farmer.in',
    village: 'Chennaraopet',
    district: 'Warangal Rural',
    state: 'Telangana',
    surveyNumber: '528/B',
    khasraNumber: 'Khasra 312',
    crop: 'Cotton (Kharif Season)',
    season: 'Kharif 2026',
    plotSize: '0.9 ha',
    sumInsured: 37800,
    sumInsuredRate: '₹42,000 / ha',
    lat: 17.9214,
    lng: 79.6412,
    gpsAccuracyMeters: 3.8,
    boundaryCoordinates: undefined, // Missing boundary polygon: Point GPS only
    aadhaar: 'XXXX-XXXX-3190',
    aadhaarVerified: true,
    aadhaarVerificationStatus: 'Demo Verified (Synthetic Sandbox)',
    landRecordsVerified: true,
    landRecordsVerificationStatus: 'Demo Verified (State Portal Sandbox)',
    isDemoRecord: true,
    source: 'PMFBY National Portal (Demo Sandbox)'
  },
  {
    id: 'pol-89403',
    policyNumber: 'PMFBY/TS/WR/2026/89403',
    applicationId: 'FP-2043',
    farmerId: 'usr-farmer-3',
    farmerName: 'Srinivas Rao',
    phone: '9440182931',
    email: 'srinivas@farmer.in',
    village: 'Parkal',
    district: 'Warangal Rural',
    state: 'Telangana',
    surveyNumber: '108/B',
    khasraNumber: 'Khasra 108',
    crop: 'Cotton (Kharif Season)',
    season: 'Kharif 2026',
    plotSize: '0.8 ha',
    sumInsured: 33600,
    sumInsuredRate: '₹42,000 / ha',
    lat: 18.1964,
    lng: 79.7042,
    gpsAccuracyMeters: 4.1,
    boundaryCoordinates: undefined,
    aadhaar: 'XXXX-XXXX-4819',
    aadhaarVerified: true,
    aadhaarVerificationStatus: 'Demo Verified (Synthetic Sandbox)',
    landRecordsVerified: true,
    landRecordsVerificationStatus: 'Demo Verified (State Portal Sandbox)',
    isDemoRecord: true,
    source: 'PMFBY National Portal (Demo Sandbox)'
  },
  {
    id: 'pol-65104',
    policyNumber: 'PMFBY/TS/WR/2026/65104',
    applicationId: 'FP-2035',
    farmerId: 'usr-farmer-4',
    farmerName: 'Suresh Reddy',
    phone: '9848077665',
    email: 'suresh@farmer.in',
    village: 'Geesugonda',
    district: 'Warangal Rural',
    state: 'Telangana',
    surveyNumber: '210/C',
    khasraNumber: 'Khasra 210',
    crop: 'Maize (Kharif Season)',
    season: 'Kharif 2026',
    plotSize: '2.0 ha',
    sumInsured: 84000,
    sumInsuredRate: '₹42,000 / ha',
    lat: 17.9450,
    lng: 79.6800,
    gpsAccuracyMeters: 2.5,
    boundaryCoordinates: [
      [17.9458, 79.6790],
      [17.9457, 79.6812],
      [17.9442, 79.6811],
      [17.9441, 79.6791]
    ],
    aadhaar: 'XXXX-XXXX-9912',
    aadhaarVerified: true,
    aadhaarVerificationStatus: 'Demo Verified (Synthetic Sandbox)',
    landRecordsVerified: true,
    landRecordsVerificationStatus: 'Demo Verified (State Portal Sandbox)',
    isDemoRecord: true,
    source: 'PMFBY National Portal (Demo Sandbox)'
  },
  {
    id: 'pol-89407',
    policyNumber: 'PMFBY/TS/WR/2026/89407',
    applicationId: 'FP-2047',
    farmerId: 'usr-farmer-5',
    farmerName: 'Anjaiah B.',
    phone: '9849201948',
    email: 'anjaiah@farmer.in',
    village: 'Geesugonda',
    district: 'Warangal Rural',
    state: 'Telangana',
    surveyNumber: '219/C',
    khasraNumber: 'Khasra 219',
    crop: 'Paddy (Kharif)',
    season: 'Kharif 2026',
    plotSize: '2.1 ha',
    sumInsured: 88200,
    sumInsuredRate: '₹42,000 / ha',
    lat: 17.9234,
    lng: 79.6421,
    gpsAccuracyMeters: 3.0,
    boundaryCoordinates: undefined,
    aadhaar: 'XXXX-XXXX-9182',
    aadhaarVerified: true,
    aadhaarVerificationStatus: 'Demo Verified (Synthetic Sandbox)',
    landRecordsVerified: true,
    landRecordsVerificationStatus: 'Demo Verified (State Portal Sandbox)',
    isDemoRecord: true,
    source: 'PMFBY National Portal (Demo Sandbox)'
  },
  {
    id: 'pol-99001',
    policyNumber: 'PMFBY/TS/WR/2026/99001',
    farmerId: 'usr-farmer-demo-6',
    farmerName: 'Mallesh Kompally',
    phone: '9848055667',
    email: 'mallesh@farmer.in',
    village: 'Atmakur',
    district: 'Warangal Rural',
    state: 'Telangana',
    surveyNumber: '304/A',
    khasraNumber: 'Khasra 304',
    crop: 'Paddy (Kharif)',
    season: 'Kharif 2026',
    plotSize: '1.5 ha',
    sumInsured: 63000,
    sumInsuredRate: '₹42,000 / ha',
    lat: undefined, // Missing coordinates test scenario
    lng: undefined,
    gpsAccuracyMeters: undefined,
    boundaryCoordinates: undefined,
    aadhaar: 'XXXX-XXXX-1122',
    aadhaarVerified: false,
    aadhaarVerificationStatus: 'Pending Verification',
    landRecordsVerified: false,
    landRecordsVerificationStatus: 'Pending Verification',
    isDemoRecord: true,
    source: 'PMFBY National Portal (Demo - Unsurveyed Cadastre)'
  }
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    userId: 'usr-farmer-1',
    applicationId: 'FP-2041',
    title: 'Survey Completed',
    message: 'Field surveyor K. Ramesh completed on-site physical inspection. Loss estimated at 82%. Claim is now with Officer for sanction.',
    type: 'info',
    read: false,
    timestamp: '18 Oct 2026, 16:45'
  },
  {
    id: 'notif-2',
    userId: 'usr-farmer-1',
    applicationId: 'FP-2041',
    title: 'Surveyor Assigned',
    message: 'Mandal Agricultural Officer S. Sharma assigned Surveyor K. Ramesh for plot Survey 412/A verification.',
    type: 'info',
    read: true,
    timestamp: '17 Oct 2026, 10:15'
  },
  {
    id: 'notif-3',
    userId: 'usr-surveyor-1',
    applicationId: 'FP-2038',
    title: 'New Survey Assignment',
    message: 'You have been assigned to survey Claim FP-2038 (Farmer: Lakshmi Bai, Chennaraopet). Deadline: 21 Oct 2026.',
    type: 'warning',
    read: false,
    timestamp: '17 Oct 2026, 14:00'
  }
];

class DataStore {
  private db: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.db = this.load();
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.institutionalUsage) {
          parsed.institutionalUsage = { ...INITIAL_INSTITUTIONAL_USAGE };
        }
        // Ensure all demo initial users are present
        let changed = false;
        if (!parsed.users) parsed.users = [];
        for (const initUser of INITIAL_USERS) {
          if (!parsed.users.some((u: User) => u.id === initUser.id || u.phone === initUser.phone)) {
            parsed.users.push(initUser);
            changed = true;
          }
        }
        if (!parsed.applications) parsed.applications = [];
        for (const initApp of INITIAL_APPLICATIONS) {
          const appIndex = parsed.applications.findIndex((a: Application) => a.id === initApp.id);
          if (appIndex === -1) {
            parsed.applications.push(initApp);
            changed = true;
          } else {
            // Update policyNumber if it changed (e.g. FP-2038 to 89402)
            if (parsed.applications[appIndex].policyNumber !== initApp.policyNumber) {
              parsed.applications[appIndex].policyNumber = initApp.policyNumber;
              changed = true;
            }
          }
        }
        if (!parsed.policies) parsed.policies = [];
        for (const initPol of INITIAL_POLICIES) {
          const polIndex = parsed.policies.findIndex((p: PolicyRecord) => p.id === initPol.id || p.policyNumber === initPol.policyNumber);
          if (polIndex === -1) {
            parsed.policies.push(initPol);
            changed = true;
          } else {
            // Keep fresh demo coordinates and boundaries
            parsed.policies[polIndex] = { ...initPol, ...parsed.policies[polIndex] };
          }
        }
        if (changed) {
          this.save(parsed);
        }
        return parsed;
      } catch (err) {
        console.error('Error reading db.json, re-initializing:', err);
      }
    }
    const initial: DatabaseSchema = {
      users: INITIAL_USERS,
      applications: INITIAL_APPLICATIONS,
      policies: INITIAL_POLICIES,
      notifications: INITIAL_NOTIFICATIONS,
      sessions: {
        'token-officer-demo': 'usr-officer-1',
        'token-surveyor-demo': 'usr-surveyor-1',
        'token-farmer-demo': 'usr-farmer-1'
      },
      institutionalUsage: { ...INITIAL_INSTITUTIONAL_USAGE }
    };
    this.save(initial);
    return initial;
  }

  private save(data?: DatabaseSchema) {
    const toSave = data || this.db;
    fs.writeFileSync(DB_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
  }

  // Users
  getUsers(): User[] {
    return this.db.users;
  }

  findUserById(id: string): User | undefined {
    return this.db.users.find((u) => u.id === id);
  }

  findUserByIdentifier(identifier: string): User | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.db.users.find(
      (u) =>
        u.email.toLowerCase() === clean ||
        u.phone.replace(/[^0-9]/g, '') === clean.replace(/[^0-9]/g, '') ||
        (u.aadhaar && u.aadhaar.replace(/[^0-9]/g, '') === clean.replace(/[^0-9]/g, ''))
    );
  }

  createUser(user: User): User {
    this.db.users.push(user);
    this.save();
    return user;
  }

  // Sessions
  createSession(userId: string): string {
    const token = `fp-auth-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    this.db.sessions[token] = userId;
    this.save();
    return token;
  }

  getUserByToken(token: string): User | undefined {
    const userId = this.db.sessions[token];
    if (!userId) return undefined;
    return this.findUserById(userId);
  }

  deleteSession(token: string) {
    delete this.db.sessions[token];
    this.save();
  }

  // Applications
  getApplications(): Application[] {
    return this.db.applications;
  }

  findApplicationById(id: string): Application | undefined {
    return this.db.applications.find((a) => a.id === id);
  }

  createApplication(app: Application): Application {
    this.db.applications.unshift(app);
    // Auto-sync into policies database
    if (app.policyNumber) {
      this.createPolicy({
        id: `pol-${app.id}`,
        policyNumber: app.policyNumber,
        applicationId: app.id,
        farmerId: app.farmerId,
        farmerName: app.farmerName,
        phone: app.phone,
        email: app.email,
        village: app.village,
        district: app.district,
        state: app.state,
        surveyNumber: app.surveyNumber,
        crop: app.crop,
        season: 'Kharif 2026',
        plotSize: app.plotSize,
        sumInsured: app.estimatedPayoutInr || 42000,
        sumInsuredRate: '₹42,000 / ha',
        lat: app.lat,
        lng: app.lng,
        gpsAccuracyMeters: 3.2,
        aadhaar: app.aadhaar || 'XXXX-XXXX-0000',
        aadhaarVerified: true,
        aadhaarVerificationStatus: 'Demo Verified (Synthetic Sandbox)',
        landRecordsVerified: true,
        landRecordsVerificationStatus: 'Demo Verified (State Portal Sandbox)',
        isDemoRecord: true,
        source: 'Farmer Application Intake'
      });
    }
    this.save();
    return app;
  }

  // Policies
  getPolicies(): PolicyRecord[] {
    if (!this.db.policies) {
      this.db.policies = [...INITIAL_POLICIES];
      this.save();
    }
    return this.db.policies;
  }

  findPolicyById(id: string): PolicyRecord | undefined {
    return this.getPolicies().find((p) => p.id === id);
  }

  findPolicyByNumber(query: string): { matches: PolicyRecord[]; exactMatch?: PolicyRecord } {
    const raw = query.trim();
    if (!raw) return { matches: [] };

    const clean = raw.toLowerCase();
    const cleanDigits = raw.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const policies = this.getPolicies();

    // 1. Exact match on full policy number
    const exactFull = policies.filter(
      (p) => p.policyNumber.trim().toLowerCase() === clean
    );
    if (exactFull.length > 0) {
      return { matches: exactFull, exactMatch: exactFull[0] };
    }

    // 2. Exact match on policy number suffix (e.g. searching '89401' against 'PMFBY/TS/WR/2026/89401')
    const suffixMatches = policies.filter((p) => {
      const pClean = p.policyNumber.trim().toLowerCase();
      const parts = pClean.split('/');
      const lastPart = parts[parts.length - 1];
      return lastPart === clean || pClean.endsWith('/' + clean);
    });
    if (suffixMatches.length === 1) {
      return { matches: suffixMatches, exactMatch: suffixMatches[0] };
    }
    if (suffixMatches.length > 1) {
      return { matches: suffixMatches };
    }

    // 3. Normalized alphanumeric match
    const normMatches = policies.filter((p) => {
      const pDigits = p.policyNumber.replace(/[^a-z0-9]/gi, '').toLowerCase();
      return pDigits === cleanDigits || pDigits.endsWith(cleanDigits);
    });
    if (normMatches.length === 1) {
      return { matches: normMatches, exactMatch: normMatches[0] };
    }
    if (normMatches.length > 1) {
      return { matches: normMatches };
    }

    // 4. Substring contains match (as fallback)
    const subMatches = policies.filter((p) =>
      p.policyNumber.toLowerCase().includes(clean)
    );
    if (subMatches.length === 1) {
      return { matches: subMatches, exactMatch: subMatches[0] };
    }

    return { matches: subMatches };
  }

  createPolicy(policy: PolicyRecord): PolicyRecord {
    if (!this.db.policies) this.db.policies = [];
    const existingIndex = this.db.policies.findIndex(
      (p) => p.id === policy.id || p.policyNumber === policy.policyNumber
    );
    if (existingIndex >= 0) {
      this.db.policies[existingIndex] = { ...this.db.policies[existingIndex], ...policy };
      this.save();
      return this.db.policies[existingIndex];
    } else {
      this.db.policies.push(policy);
      this.save();
      return policy;
    }
  }

  importPolicies(
    records: Partial<PolicyRecord>[],
    sourceName: string = 'Imported Dataset'
  ): { imported: number; updated: number; errors: string[] } {
    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (!r.policyNumber || !r.farmerName) {
        errors.push(`Record #${i + 1} skipped: Missing policyNumber or farmerName.`);
        continue;
      }

      const cleanPolicyNo = r.policyNumber.trim();
      const existing = this.getPolicies().find((p) => p.policyNumber === cleanPolicyNo);

      const polRecord: PolicyRecord = {
        id: r.id || `pol-${Date.now()}-${i}`,
        policyNumber: cleanPolicyNo,
        applicationId: r.applicationId,
        farmerId: r.farmerId || `farmer-${Date.now()}-${i}`,
        farmerName: r.farmerName.trim(),
        phone: r.phone || '9848000000',
        email: r.email,
        village: r.village || 'Nallabelly',
        district: r.district || 'Warangal Rural',
        state: r.state || 'Telangana',
        surveyNumber: r.surveyNumber || 'N/A',
        khasraNumber: r.khasraNumber || 'N/A',
        crop: r.crop || 'Paddy (Kharif)',
        season: r.season || 'Kharif 2026',
        plotSize: r.plotSize || '1.0 ha',
        sumInsured: Number(r.sumInsured) || 42000,
        sumInsuredRate: r.sumInsuredRate || '₹42,000 / ha',
        lat: typeof r.lat === 'number' && !isNaN(r.lat) ? r.lat : undefined,
        lng: typeof r.lng === 'number' && !isNaN(r.lng) ? r.lng : undefined,
        gpsAccuracyMeters: r.gpsAccuracyMeters || 3.2,
        boundaryCoordinates: Array.isArray(r.boundaryCoordinates) && r.boundaryCoordinates.length >= 3 ? r.boundaryCoordinates : undefined,
        aadhaar: r.aadhaar || 'XXXX-XXXX-0000',
        aadhaarVerified: Boolean(r.aadhaarVerified),
        aadhaarVerificationStatus: r.aadhaarVerificationStatus || (r.aadhaarVerified ? 'Demo Verified (Synthetic Sandbox)' : 'Pending Verification'),
        landRecordsVerified: Boolean(r.landRecordsVerified),
        landRecordsVerificationStatus: r.landRecordsVerificationStatus || (r.landRecordsVerified ? 'Demo Verified (State Portal Sandbox)' : 'Pending Verification'),
        isDemoRecord: r.isDemoRecord !== undefined ? Boolean(r.isDemoRecord) : true,
        source: sourceName,
        importedAt: new Date().toISOString()
      };

      if (existing) {
        this.createPolicy({ ...existing, ...polRecord, id: existing.id });
        updated++;
      } else {
        this.createPolicy(polRecord);
        imported++;
      }
    }

    return { imported, updated, errors };
  }

  updateApplication(id: string, updates: Partial<Application>): Application | undefined {
    const index = this.db.applications.findIndex((a) => a.id === id);
    if (index === -1) return undefined;
    this.db.applications[index] = {
      ...this.db.applications[index],
      ...updates,
      lastUpdated: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    this.save();
    return this.db.applications[index];
  }

  // Notifications
  getNotifications(userId: string): AppNotification[] {
    return this.db.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }

  createNotification(notif: Omit<AppNotification, 'id'>): AppNotification {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    this.db.notifications.unshift(newNotif);
    this.save();
    return newNotif;
  }

  markNotificationRead(id: string, userId: string): boolean {
    const notif = this.db.notifications.find((n) => n.id === id && n.userId === userId);
    if (notif) {
      notif.read = true;
      this.save();
      return true;
    }
    return false;
  }

  // Institutional Usage (Phase 10: Realistic Commercial & Readiness Model)
  getInstitutionalUsage(): InstitutionalUsage {
    if (!this.db.institutionalUsage) {
      this.db.institutionalUsage = { ...INITIAL_INSTITUTIONAL_USAGE };
      this.save();
    }
    return this.db.institutionalUsage;
  }

  recordInstitutionalMetric(metric: 'claims' | 'ai' | 'weather' | 'survey') {
    if (!this.db.institutionalUsage) {
      this.db.institutionalUsage = { ...INITIAL_INSTITUTIONAL_USAGE };
    }
    if (metric === 'claims') this.db.institutionalUsage.claimsIngested += 1;
    if (metric === 'ai') this.db.institutionalUsage.aiVisionRuns += 1;
    if (metric === 'weather') this.db.institutionalUsage.weatherCorroborations += 1;
    if (metric === 'survey') this.db.institutionalUsage.fieldSurveysDispatched += 1;
    this.save();
  }

  // Clean state reset for repeated regression testing
  resetDatabaseForTesting(): void {
    const cleanDb: DatabaseSchema = {
      users: [...INITIAL_USERS],
      applications: JSON.parse(JSON.stringify(INITIAL_APPLICATIONS)),
      policies: JSON.parse(JSON.stringify(INITIAL_POLICIES)),
      notifications: JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS)),
      sessions: {
        'token-officer-demo': 'usr-officer-1',
        'token-surveyor-demo': 'usr-surveyor-1',
        'token-farmer-demo': 'usr-farmer-1'
      },
      institutionalUsage: { ...INITIAL_INSTITUTIONAL_USAGE }
    };
    this.db = cleanDb;
    this.save(cleanDb);
  }
}

export const dataStore = new DataStore();
