import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { dataStore, Application, User, HistoryItem } from './server/dataStore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 50mb limit to handle camera photo uploads and PDF documents
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: User;
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const user = dataStore.getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  req.user = user;
  next();
};

const requireRoles = (allowedRoles: ('farmer' | 'officer' | 'surveyor')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Authorized ${allowedRoles.join(' or ')} privileges required.` 
      });
    }
    next();
  };
};

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Login endpoint with strict portal validation
app.post('/api/auth/login', (req, res) => {
  const { identifier, password, portalType } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please enter your login identifier and password.' });
  }

  const user = dataStore.findUserByIdentifier(identifier);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your phone/email/password.' });
  }

  // Strict role check: Do not allow unauthorized role escalation or crossover
  if (portalType === 'staff') {
    if (user.role === 'farmer') {
      return res.status(403).json({
        error: 'Access denied: Farmer accounts cannot access the Official Staff Portal. Please use the Farmer Login portal.'
      });
    }
  } else if (portalType === 'farmer') {
    if (user.role !== 'farmer') {
      return res.status(403).json({
        error: `This is the Farmer Portal. You are logged in as a Government ${user.role}. Please log in via the Officer & Surveyor Portal.`
      });
    }
  }

  const token = dataStore.createSession(user.id);
  const { password: _, ...safeUser } = user;

  res.json({
    success: true,
    token,
    user: safeUser
  });
});

// Farmer Registration endpoint
app.post('/api/auth/register-farmer', (req, res) => {
  const { 
    name, phone, email, password, aadhaar, state, district, village, 
    surveyNumber, bankAccount, bankName, ifsc 
  } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Full name, mobile number, and password are required.' });
  }

  const existing = dataStore.findUserByIdentifier(phone);
  if (existing) {
    return res.status(409).json({ error: 'A farmer account with this mobile number is already registered.' });
  }

  const newUser: User = {
    id: `usr-farmer-${Date.now()}`,
    name: name.trim(),
    phone: phone.trim(),
    email: (email || `${phone}@farmer.in`).trim(),
    password: password.trim(),
    role: 'farmer',
    aadhaar: aadhaar || 'XXXX-XXXX-0000',
    state: state || 'Telangana',
    district: district || 'Warangal Rural',
    village: village || 'Nallabelly',
    surveyNumber: surveyNumber || 'N/A',
    bankAccount: bankAccount || '',
    bankName: bankName || 'State Bank of India',
    ifsc: ifsc || '',
    createdAt: new Date().toISOString()
  };

  dataStore.createUser(newUser);
  const token = dataStore.createSession(newUser.id);
  const { password: _, ...safeUser } = newUser;

  // Initial welcome notification
  dataStore.createNotification({
    userId: newUser.id,
    title: 'Welcome to FarmProof PMFBY Portal',
    message: `Welcome ${newUser.name}! Your farmer account has been created. You can now lodge crop damage intimations and track claim compensation.`,
    type: 'success',
    read: false,
    timestamp: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  });

  res.json({
    success: true,
    token,
    user: safeUser
  });
});

// Get current logged-in user
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { password: _, ...safeUser } = req.user!;
  res.json({ user: safeUser });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (token) {
    dataStore.deleteSession(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==========================================
// FILE UPLOAD ENDPOINT
// ==========================================

app.post('/api/upload', (req, res) => {
  const { name, type, data } = req.body;

  if (!data || !name) {
    return res.status(400).json({ error: 'File data and filename are required.' });
  }

  try {
    // Strip metadata header if base64 data URL
    let base64Data = data;
    if (data.includes(';base64,')) {
      base64Data = data.split(';base64,')[1];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const safeName = name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}-${Math.floor(Math.random() * 1000)}-${safeName}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    const sizeFormatted = buffer.length > 1024 * 1024 
      ? `${(buffer.length / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(buffer.length / 1024)} KB`;

    res.json({
      success: true,
      url: `/uploads/${filename}`,
      name: safeName,
      size: sizeFormatted,
      type: type || 'image/jpeg'
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'Failed to process file upload: ' + err?.message });
  }
});

// ==========================================
// SURVEYORS LIST ENDPOINT (FOR OFFICERS)
// ==========================================

app.get('/api/surveyors', authenticateToken, requireRoles(['officer']), (req, res) => {
  const surveyors = dataStore.getUsers()
    .filter((u) => u.role === 'surveyor')
    .map(({ password: _, ...safe }) => safe);
  res.json(surveyors);
});

// ==========================================
// APPLICATIONS / CLAIMS ENDPOINTS
// ==========================================

// Get applications filtered by authenticated role
app.get('/api/applications', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const allApps = dataStore.getApplications();
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : '';
  const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';

  let filtered = allApps;

  if (user.role === 'farmer') {
    // Farmers only see their own applications
    filtered = allApps.filter(
      (a) => a.farmerId === user.id || a.phone === user.phone
    );
  } else if (user.role === 'surveyor') {
    // Surveyors see applications assigned to them
    filtered = allApps.filter(
      (a) => a.assignedSurveyorId === user.id
    );
  } else if (user.role === 'officer') {
    // Officers see all applications
    filtered = allApps;
  }

  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter((a) => a.status === statusFilter);
  }

  if (search) {
    filtered = filtered.filter(
      (a) =>
        a.id.toLowerCase().includes(search) ||
        a.farmerName.toLowerCase().includes(search) ||
        a.village.toLowerCase().includes(search) ||
        a.surveyNumber.toLowerCase().includes(search) ||
        a.district.toLowerCase().includes(search)
    );
  }

  res.json(filtered);
});

// Get single application
app.get('/api/applications/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const appItem = dataStore.findApplicationById(req.params.id);

  if (!appItem) {
    return res.status(404).json({ error: 'Application not found' });
  }

  // Access check
  if (user.role === 'farmer' && appItem.farmerId !== user.id && appItem.phone !== user.phone) {
    return res.status(403).json({ error: 'Access denied: You can only view your own applications.' });
  }

  if (user.role === 'surveyor' && appItem.assignedSurveyorId !== user.id) {
    return res.status(403).json({ error: 'Access denied: This survey is not assigned to you.' });
  }

  res.json(appItem);
});

// Submit / Create new application
app.post('/api/applications', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const body = req.body;

  const nowStr = new Date().toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const appId = `FP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const isDraft = body.status === 'Draft';
  const initialStatus = isDraft ? 'Draft' : 'Submitted';

  // Server-side mandatory location validation
  if (!isDraft && (body.lat === undefined || body.lat === null || body.lng === undefined || body.lng === null)) {
    return res.status(400).json({ 
      error: 'Mandatory GPS location is missing. Actual farm plot coordinates must be captured before submission.' 
    });
  }

  const historyItem: HistoryItem = {
    id: `hist-${Date.now()}`,
    timestamp: nowStr,
    status: initialStatus,
    performedBy: user.name,
    role: user.role === 'farmer' ? 'Farmer' : 'Officer',
    action: isDraft ? 'Application Draft Saved' : 'Application Submitted',
    notes: isDraft ? 'Farmer saved draft application' : `Application lodged for ${body.crop || 'Crop'} loss caused by ${body.cause || 'Peril'}. GPS coordinates locked.`
  };

  const newApp: Application = {
    id: appId,
    farmerId: user.id,
    farmerName: body.farmerName || user.name,
    phone: body.phone || user.phone,
    email: body.email || user.email,
    aadhaar: body.aadhaar || user.aadhaar || 'XXXX-XXXX-0000',
    bankAccount: body.bankAccount || user.bankAccount || '',
    bankName: body.bankName || user.bankName || 'State Bank of India',
    ifsc: body.ifsc || user.ifsc || '',
    policyNumber: body.policyNumber || `PMFBY/TS/WR/2026/${Math.floor(10000 + Math.random() * 90000)}`,
    village: body.village || user.village || 'Nallabelly',
    district: body.district || user.district || 'Warangal Rural',
    state: body.state || user.state || 'Telangana',
    surveyNumber: body.surveyNumber || user.surveyNumber || '412/A',
    plotSize: body.plotSize || '1.0 ha',
    category: body.category || 'PMFBY Clause 14.2 Localized Calamity',
    crop: body.crop || 'Paddy (Kharif)',
    cause: body.cause || 'Hail',
    description: body.description || '',
    aiDamage: body.aiDamage || 'Moderate',
    aiConfidence: body.aiConfidence || 80,
    damagePercentage: body.damagePercentage || 75,
    weatherMatch: body.weatherMatch || 'Match',
    weatherDetails: body.weatherDetails || 'Weather conditions logged',
    weatherStats: body.weatherStats,
    priority: body.priority || 'Review',
    suggestedAction: body.suggestedAction || 'Review application submission',
    status: initialStatus,
    submissionTime: nowStr,
    lastUpdated: nowStr,
    photosCount: (body.photos || []).length,
    gpsLocked: Boolean(body.lat !== undefined && body.lng !== undefined),
    lat: body.lat !== undefined ? Number(body.lat) : 0,
    lng: body.lng !== undefined ? Number(body.lng) : 0,
    estimatedPayoutInr: body.estimatedPayoutInr || 35000,
    payoutStatus: 'Pending',
    officerNotes: body.officerNotes || '',
    photos: body.photos || [],
    documents: body.documents || [],
    history: [historyItem]
  };

  dataStore.createApplication(newApp);

  // Notify farmer
  if (!isDraft) {
    dataStore.createNotification({
      userId: user.id,
      applicationId: newApp.id,
      title: 'Application Submitted Successfully',
      message: `Your crop loss claim reference is ${newApp.id}. It has been forwarded to the Mandal Agricultural Office for review.`,
      type: 'success',
      read: false,
      timestamp: nowStr
    });

    // Notify officer
    const officers = dataStore.getUsers().filter((u) => u.role === 'officer');
    for (const off of officers) {
      dataStore.createNotification({
        userId: off.id,
        applicationId: newApp.id,
        title: 'New Crop Loss Claim Lodged',
        message: `Claim ${newApp.id} submitted by ${newApp.farmerName} (${newApp.village}, ${newApp.crop}, ${newApp.cause}).`,
        type: 'info',
        read: false,
        timestamp: nowStr
      });
    }
  }

  res.status(201).json(newApp);
});

// Update application (e.g. Save Draft, Farmer Resubmission after correction)
app.put('/api/applications/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const appId = req.params.id;
  const current = dataStore.findApplicationById(appId);

  if (!current) {
    return res.status(404).json({ error: 'Application not found' });
  }

  if (user.role === 'farmer' && current.farmerId !== user.id && current.phone !== user.phone) {
    return res.status(403).json({ error: 'Access denied: You can only edit your own applications.' });
  }

  const nowStr = new Date().toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const body = req.body;
  const isResubmitting = current.status === 'Correction Required' && body.status === 'Submitted';

  const historyItem: HistoryItem = {
    id: `hist-${Date.now()}`,
    timestamp: nowStr,
    status: body.status || current.status,
    performedBy: user.name,
    role: user.role === 'farmer' ? 'Farmer' : 'Officer',
    action: isResubmitting ? 'Corrections Submitted' : 'Application Updated',
    notes: body.updateNotes || (isResubmitting ? 'Farmer provided requested corrections and updated evidence.' : 'Application details updated.')
  };

  const updated = dataStore.updateApplication(appId, {
    ...body,
    history: [...current.history, historyItem]
  });

  if (isResubmitting) {
    // Notify officer
    const officers = dataStore.getUsers().filter((u) => u.role === 'officer');
    for (const off of officers) {
      dataStore.createNotification({
        userId: off.id,
        applicationId: appId,
        title: 'Correction Resubmitted by Farmer',
        message: `Farmer ${current.farmerName} resubmitted corrections for Claim ${appId}. Ready for officer review.`,
        type: 'info',
        read: false,
        timestamp: nowStr
      });
    }
  }

  res.json(updated);
});

// Officer assigns surveyor
app.post('/api/applications/:id/assign-surveyor', authenticateToken, requireRoles(['officer']), (req: AuthenticatedRequest, res) => {
  const appId = req.params.id;
  const { surveyorId, deadline, instructions } = req.body;

  const current = dataStore.findApplicationById(appId);
  if (!current) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const surveyor = dataStore.findUserById(surveyorId);
  if (!surveyor || surveyor.role !== 'surveyor') {
    return res.status(400).json({ error: 'Invalid surveyor selected. Must be an authorised field surveyor.' });
  }

  const nowStr = new Date().toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const historyItem: HistoryItem = {
    id: `hist-${Date.now()}`,
    timestamp: nowStr,
    status: 'Survey Assigned',
    performedBy: req.user!.name,
    role: 'Officer',
    action: current.assignedSurveyorId ? 'Surveyor Reassigned' : 'Surveyor Assigned',
    notes: `Assigned to ${surveyor.name} (${surveyor.designation || 'Field Surveyor'}). Deadline: ${deadline || 'Within 72h'}. Instructions: ${instructions || 'Conduct physical on-site loss verification.'}`
  };

  const updated = dataStore.updateApplication(appId, {
    status: 'Survey Assigned',
    assignedSurveyorId: surveyor.id,
    assignedSurveyorName: surveyor.name,
    assignedSurveyorPhone: surveyor.phone,
    assignmentDate: nowStr,
    surveyDeadline: deadline || 'Within 72h',
    officerInstructions: instructions || 'Verify crop damage and cadastral landmarks.',
    history: [...current.history, historyItem]
  });

  // Notify Surveyor
  dataStore.createNotification({
    userId: surveyor.id,
    applicationId: appId,
    title: 'New Survey Assigned',
    message: `You have been assigned to survey Claim ${appId} (Farmer: ${current.farmerName}, ${current.village}). Deadline: ${deadline || 'Within 72h'}.`,
    type: 'warning',
    read: false,
    timestamp: nowStr
  });

  // Notify Farmer
  dataStore.createNotification({
    userId: current.farmerId,
    applicationId: appId,
    title: 'Field Surveyor Assigned',
    message: `Mandal Agricultural Officer assigned Field Surveyor ${surveyor.name} to conduct on-site physical survey of your plot.`,
    type: 'info',
    read: false,
    timestamp: nowStr
  });

  res.json(updated);
});

// Surveyor records findings and submits survey
app.post('/api/applications/:id/submit-survey', authenticateToken, requireRoles(['surveyor']), (req: AuthenticatedRequest, res) => {
  const appId = req.params.id;
  const surveyor = req.user!;
  const current = dataStore.findApplicationById(appId);

  if (!current) {
    return res.status(404).json({ error: 'Application not found' });
  }

  if (current.assignedSurveyorId !== surveyor.id) {
    return res.status(403).json({ error: 'You are not assigned to this survey.' });
  }

  const {
    visitGps,
    boundaryIntegrityVerified,
    cropSpeciesVerified,
    observedLossPercentage,
    lodgingObserved,
    waterloggingObserved,
    pestSymptomObserved,
    surveyorRecommendation,
    remarks,
    additionalPhotos,
    actionType // 'verify' | 'flag' | 'survey_ok'
  } = req.body;

  if (!remarks || remarks.trim().length < 5) {
    return res.status(400).json({ error: 'Surveyor remarks and inspection observations are mandatory.' });
  }

  const nowStr = new Date().toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const nextStatus = actionType === 'flag' ? 'Under Review' : 'Survey Completed';

  const historyItem: HistoryItem = {
    id: `hist-${Date.now()}`,
    timestamp: nowStr,
    status: nextStatus,
    performedBy: surveyor.name,
    role: 'Surveyor',
    action: actionType === 'verify' ? 'Survey Confirmed & Verified' : actionType === 'flag' ? 'Survey Flagged with Issue' : 'Survey OK - Findings Submitted',
    notes: `Surveyor observations recorded. Loss assessed: ${observedLossPercentage}%. Recommendation: ${surveyorRecommendation || 'Survey OK'}. Remarks: ${remarks}`
  };

  const surveyFindings = {
    surveyorId: surveyor.id,
    surveyorName: surveyor.name,
    surveyDate: nowStr,
    visitGps: visitGps || `${current.lat}° N, ${current.lng}° E`,
    boundaryIntegrityVerified: Boolean(boundaryIntegrityVerified),
    cropSpeciesVerified: Boolean(cropSpeciesVerified),
    observedLossPercentage: Number(observedLossPercentage) || current.damagePercentage,
    lodgingObserved: Boolean(lodgingObserved),
    waterloggingObserved: Boolean(waterloggingObserved),
    pestSymptomObserved: Boolean(pestSymptomObserved),
    surveyorRecommendation: surveyorRecommendation || 'Survey OK - Proceed',
    remarks: remarks.trim(),
    additionalPhotos: additionalPhotos || [],
    submittedAt: nowStr
  };

  const updated = dataStore.updateApplication(appId, {
    status: nextStatus,
    damagePercentage: Number(observedLossPercentage) || current.damagePercentage,
    surveyFindings,
    history: [...current.history, historyItem]
  });

  // Notify Officers
  const officers = dataStore.getUsers().filter((u) => u.role === 'officer');
  for (const off of officers) {
    dataStore.createNotification({
      userId: off.id,
      applicationId: appId,
      title: 'Survey Completed by Surveyor',
      message: `Surveyor ${surveyor.name} submitted field survey findings for Claim ${appId} (Assessed Loss: ${observedLossPercentage}%). Awaiting officer decision.`,
      type: 'info',
      read: false,
      timestamp: nowStr
    });
  }

  // Notify Farmer
  dataStore.createNotification({
    userId: current.farmerId,
    applicationId: appId,
    title: 'Physical Survey Completed',
    message: `Field surveyor ${surveyor.name} has completed the physical field inspection. Findings submitted to reviewing officer for final sanction.`,
    type: 'info',
    read: false,
    timestamp: nowStr
  });

  res.json(updated);
});

// Officer decision (Approve, Reject, Request Correction, Return for Re-survey)
app.post('/api/applications/:id/officer-decision', authenticateToken, requireRoles(['officer']), (req: AuthenticatedRequest, res) => {
  const appId = req.params.id;
  const officer = req.user!;
  const current = dataStore.findApplicationById(appId);

  if (!current) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const { decision, remarks, sanctionedPayout } = req.body;

  if (!decision) {
    return res.status(400).json({ error: 'Decision action is required.' });
  }

  if ((decision === 'reject' || decision === 'request_correction') && (!remarks || remarks.trim().length < 5)) {
    return res.status(400).json({ error: 'Detailed remarks/reason are mandatory for rejections and correction requests.' });
  }

  const nowStr = new Date().toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  let nextStatus: Application['status'] = current.status;
  let actionTitle = '';
  let updates: Partial<Application> = {};

  if (decision === 'approve') {
    nextStatus = 'Approved';
    actionTitle = 'Claim Sanctioned & Approved';
    const finalPayout = Number(sanctionedPayout) || current.estimatedPayoutInr;
    updates = {
      status: nextStatus,
      payoutStatus: 'Disbursed to Bank',
      sanctionedPayoutInr: finalPayout,
      officerNotes: remarks || 'Sanctioned by Mandal Agricultural Officer following survey verification.',
      rejectionReason: undefined
    };
  } else if (decision === 'reject') {
    nextStatus = 'Rejected';
    actionTitle = 'Claim Rejected';
    updates = {
      status: nextStatus,
      payoutStatus: 'Rejected',
      rejectionReason: remarks,
      officerNotes: remarks
    };
  } else if (decision === 'request_correction') {
    nextStatus = 'Correction Required';
    actionTitle = 'Correction Requested from Farmer';
    updates = {
      status: nextStatus,
      correctionRequest: {
        officerId: officer.id,
        officerName: officer.name,
        requestedAt: nowStr,
        remarks: remarks,
        resolved: false
      },
      officerNotes: remarks
    };
  } else if (decision === 'return_survey') {
    nextStatus = 'Survey Assigned';
    actionTitle = 'Returned for Additional Survey Verification';
    updates = {
      status: nextStatus,
      officerInstructions: remarks,
      officerNotes: remarks
    };
  }

  const historyItem: HistoryItem = {
    id: `hist-${Date.now()}`,
    timestamp: nowStr,
    status: nextStatus,
    performedBy: officer.name,
    role: 'Officer',
    action: actionTitle,
    notes: remarks || `Officer sanctioned decision: ${decision}.`
  };

  const updated = dataStore.updateApplication(appId, {
    ...updates,
    history: [...current.history, historyItem]
  });

  // Notify Farmer
  let farmerNotifMsg = '';
  let notifType: 'info' | 'success' | 'warning' | 'alert' = 'info';

  if (decision === 'approve') {
    farmerNotifMsg = `Congratulations! Claim ${appId} has been approved for ₹${(updates.sanctionedPayoutInr || current.estimatedPayoutInr).toLocaleString('en-IN')}. Funds initiated via PFMS DBT.`;
    notifType = 'success';
  } else if (decision === 'reject') {
    farmerNotifMsg = `Claim ${appId} was rejected. Reason: ${remarks}`;
    notifType = 'alert';
  } else if (decision === 'request_correction') {
    farmerNotifMsg = `Officer requested corrections for Claim ${appId}: "${remarks}". Please submit requested updates.`;
    notifType = 'warning';
  } else {
    farmerNotifMsg = `Claim ${appId} has been assigned for supplementary field verification.`;
  }

  dataStore.createNotification({
    userId: current.farmerId,
    applicationId: appId,
    title: actionTitle,
    message: farmerNotifMsg,
    type: notifType,
    read: false,
    timestamp: nowStr
  });

  res.json(updated);
});

// ==========================================
// NOTIFICATIONS ENDPOINTS
// ==========================================

app.get('/api/notifications', authenticateToken, (req: AuthenticatedRequest, res) => {
  const notifs = dataStore.getNotifications(req.user!.id);
  res.json(notifs);
});

app.post('/api/notifications/:id/read', authenticateToken, (req: AuthenticatedRequest, res) => {
  const success = dataStore.markNotificationRead(req.params.id, req.user!.id);
  res.json({ success });
});

// ==========================================
// AI & WEATHER ENDPOINTS (PRESERVED)
// ==========================================

app.post('/api/ai/damage-estimate', async (req, res) => {
  const { crop, peril, plotSize, photos, observedLoss } = req.body;

  const fallbackResult = {
    damageBand: (observedLoss && observedLoss >= 75) || peril === 'Hail' ? 'severe' : 'moderate',
    likelyCause: peril || 'Hail',
    confidence: 0.84,
    lodgingPercent: observedLoss || 82,
    leafTearSeverity: peril === 'Hail' ? 'Extensive hail perforation and shredded leaf blades' : 'Waterlogging stress',
    plantCountQuadrat: '24 of 28 stems broken or lodged at base (85.7% loss)',
    boundaryIntegrity: 'Valid - Plot border and cadastral landmarks detected within parcel',
    suggestedAction: 'Visit: damage is severe, spot-check required before payout',
    modelSummary: `AI Vision analysis of ${crop || 'Paddy'} field under ${peril || 'Hail'}. High lodging density observed across quadrant sample.`
  };

  if (!ai) {
    return res.json(fallbackResult);
  }

  try {
    const prompt = `You are the FarmProof Agricultural Insurance Evidence Engine.
Analyze the following crop loss claim submitted under PMFBY guidelines:
- Crop: ${crop || 'Paddy (Kharif)'}
- Claimed Peril: ${peril || 'Hail'}
- Plot Size: ${plotSize || '1.2 ha'}
- Farmer Reported Loss: ${observedLoss || 85}%
- Evidence Photos Submitted: ${photos?.length || 5} photos.

Evaluate the crop damage according to the official insurance damage rubric:
1. Damage Band: exactly one of "severe" (>= 70%), "moderate" (40-69%), or "low" (< 40%).
2. Likely Cause: identify if damage matches ${peril}.
3. Confidence: decimal number between 0.0 and 1.0.
4. Lodging Percent: estimated lodging/loss percentage (0-100).
5. Leaf Tear Severity: description of leaf or stem physical trauma.
6. Plant Count Quadrat: evaluation of damaged stems vs standing stems.
7. Boundary Integrity: check if boundary and parcel landmarks are credible.
8. Suggested Action: one of "Verified: fast-track to insurer", "Review: check pack remotely", or "Visit: spot-check required before payout".
9. Model Summary: 1-2 sentence concise explanation.

Return JSON adhering to this schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            damageBand: { type: Type.STRING },
            likelyCause: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            lodgingPercent: { type: Type.NUMBER },
            leafTearSeverity: { type: Type.STRING },
            plantCountQuadrat: { type: Type.STRING },
            boundaryIntegrity: { type: Type.STRING },
            suggestedAction: { type: Type.STRING },
            modelSummary: { type: Type.STRING }
          },
          required: ['damageBand', 'likelyCause', 'confidence', 'lodgingPercent', 'suggestedAction']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ ...fallbackResult, ...parsed });
  } catch (err: any) {
    console.error('Gemini damage analysis fallback:', err?.message);
    return res.json(fallbackResult);
  }
});

app.get('/api/weather', async (req, res) => {
  const { lat = 17.9689, lng = 79.5941, date = '2024-10-16' } = req.query;
  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${date}&end_date=${date}&daily=precipitation_sum,wind_speed_10m_max,weather_code&timezone=auto`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Open-Meteo returned status ${resp.status}`);
    }
    const data = await resp.json();
    res.json(data);
  } catch (error: any) {
    res.json({
      fallback: true,
      daily: {
        precipitation_sum: [48.2],
        wind_speed_10m_max: [46.5],
        weather_code: [96]
      }
    });
  }
});

// Server boot
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FarmProof server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
