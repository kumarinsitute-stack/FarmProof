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
  label: string;
  url: string;
  timestamp: string;
  date: string;
  gps: string;
  accuracyMeters: number;
  tamperChecked: boolean;
  sampleType?: string;
  detectedDamage?: string;
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
  description: string;
  aiDamage: 'Severe' | 'Moderate' | 'Low';
  aiConfidence: number;
  damagePercentage: number;
  weatherMatch: 'Match' | 'Partial' | 'No match';
  weatherDetails: string;
  weatherStats?: {
    recordedRainMm: number;
    maxWindKmh: number;
    historicalMeanRainMm: number;
    hailRadarDetected: boolean;
  };
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

interface DatabaseSchema {
  users: User[];
  applications: Application[];
  notifications: AppNotification[];
  sessions: { [token: string]: string }; // token -> userId
}

const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

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
    policyNumber: 'PMFBY/TS/WR/2026/78219',
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
        return JSON.parse(raw);
      } catch (err) {
        console.error('Error reading db.json, re-initializing:', err);
      }
    }
    const initial: DatabaseSchema = {
      users: INITIAL_USERS,
      applications: INITIAL_APPLICATIONS,
      notifications: INITIAL_NOTIFICATIONS,
      sessions: {
        'token-officer-demo': 'usr-officer-1',
        'token-surveyor-demo': 'usr-surveyor-1',
        'token-farmer-demo': 'usr-farmer-1'
      }
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
    this.save();
    return app;
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
}

export const dataStore = new DataStore();
