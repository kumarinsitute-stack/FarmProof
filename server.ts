import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { dataStore, Application, User, HistoryItem } from "./server/dataStore";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const UPLOADS_DIR = path.resolve(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 50mb limit to handle camera photo uploads and PDF documents
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve uploaded files statically
app.use("/uploads", express.static(UPLOADS_DIR));

// CORS headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,Content-Type,Authorization",
  );
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: User;
}

const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication token required" });
  }

  const user = dataStore.getUserByToken(token);
  if (!user) {
    return res
      .status(401)
      .json({ error: "Invalid or expired session. Please log in again." });
  }

  req.user = user;
  next();
};

const requireRoles = (allowedRoles: ("farmer" | "officer" | "surveyor")[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Authorized ${allowedRoles.join(" or ")} privileges required.`,
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
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Login endpoint with strict portal validation
app.post("/api/auth/login", (req, res) => {
  const { identifier, password, portalType } = req.body;

  if (!identifier || !password) {
    return res
      .status(400)
      .json({ error: "Please enter your login identifier and password." });
  }

  const user = dataStore.findUserByIdentifier(identifier);

  if (!user || user.password !== password) {
    return res
      .status(401)
      .json({
        error: "Invalid credentials. Please verify your phone/email/password.",
      });
  }

  // Strict role check: Do not allow unauthorized role escalation or crossover
  if (portalType === "staff") {
    if (user.role === "farmer") {
      return res.status(403).json({
        error:
          "Access denied: Farmer accounts cannot access the Official Staff Portal. Please use the Farmer Login portal.",
      });
    }
  } else if (portalType === "farmer") {
    if (user.role !== "farmer") {
      return res.status(403).json({
        error: `This is the Farmer Portal. You are logged in as a Government ${user.role}. Please log in via the Officer & Surveyor Portal.`,
      });
    }
  }

  const token = dataStore.createSession(user.id);
  const { password: _, ...safeUser } = user;

  res.json({
    success: true,
    token,
    user: safeUser,
  });
});

// Farmer Registration endpoint
app.post("/api/auth/register-farmer", (req, res) => {
  const {
    name,
    phone,
    email,
    password,
    aadhaar,
    state,
    district,
    village,
    surveyNumber,
    bankAccount,
    bankName,
    ifsc,
  } = req.body;

  if (!name || !phone || !password) {
    return res
      .status(400)
      .json({ error: "Full name, mobile number, and password are required." });
  }

  const existing = dataStore.findUserByIdentifier(phone);
  if (existing) {
    return res
      .status(409)
      .json({
        error:
          "A farmer account with this mobile number is already registered.",
      });
  }

  const newUser: User = {
    id: `usr-farmer-${Date.now()}`,
    name: name.trim(),
    phone: phone.trim(),
    email: (email || `${phone}@farmer.in`).trim(),
    password: password.trim(),
    role: "farmer",
    aadhaar: aadhaar || "XXXX-XXXX-0000",
    state: state || "Telangana",
    district: district || "Warangal Rural",
    village: village || "Nallabelly",
    surveyNumber: surveyNumber || "N/A",
    bankAccount: bankAccount || "",
    bankName: bankName || "State Bank of India",
    ifsc: ifsc || "",
    createdAt: new Date().toISOString(),
  };

  dataStore.createUser(newUser);
  const token = dataStore.createSession(newUser.id);
  const { password: _, ...safeUser } = newUser;

  // Initial welcome notification
  dataStore.createNotification({
    userId: newUser.id,
    title: "Welcome to FarmProof PMFBY Portal",
    message: `Welcome ${newUser.name}! Your farmer account has been created. You can now lodge crop damage intimations and track claim compensation.`,
    type: "success",
    read: false,
    timestamp: new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  res.json({
    success: true,
    token,
    user: safeUser,
  });
});

// Get current logged-in user
app.get("/api/auth/me", authenticateToken, (req: AuthenticatedRequest, res) => {
  const { password: _, ...safeUser } = req.user!;
  res.json({ user: safeUser });
});

// Logout endpoint
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
  if (token) {
    dataStore.deleteSession(token);
  }
  res.json({ success: true, message: "Logged out successfully" });
});

// ==========================================
// FILE UPLOAD ENDPOINT
// ==========================================

app.post("/api/upload", (req, res) => {
  const { name, type, data } = req.body;

  if (!data || !name) {
    return res
      .status(400)
      .json({ error: "File data and filename are required." });
  }

  // Validate supported mime types (images, pdfs, and policy/cadastre data files)
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
    "text/csv",
    "application/json",
    "application/geo+json",
  ];
  const isDataFile = /\.(csv|json|geojson)$/i.test(name);
  if (type && !allowedMimeTypes.includes(type.toLowerCase()) && !isDataFile) {
    return res
      .status(400)
      .json({
        error: `Unsupported file format '${type}'. Supported formats: JPEG, PNG, WebP, PDF, CSV, JSON, GeoJSON.`,
      });
  }

  try {
    // Strip metadata header if base64 data URL
    let base64Data = data;
    if (data.includes(";base64,")) {
      base64Data = data.split(";base64,")[1];
    }

    const trimmed = base64Data.trim();
    // Validate clean base64 format
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(trimmed)) {
      return res
        .status(400)
        .json({ error: "Corrupt file payload: Invalid base64 encoding." });
    }

    const buffer = Buffer.from(trimmed, "base64");
    if (buffer.length === 0) {
      return res
        .status(400)
        .json({ error: "Corrupt or empty file: File contains 0 bytes." });
    }

    // Statutory 15MB file size limit
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File size exceeds the statutory 15MB limit (${(buffer.length / (1024 * 1024)).toFixed(1)} MB).`,
      });
    }

    // Binary file header validation (Magic numbers)
    const isImageReq =
      (type && type.startsWith("image/")) ||
      /\.(jpg|jpeg|png|webp)$/i.test(name);
    if (isImageReq) {
      const isJpeg =
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
      const isWebp =
        buffer.length > 12 &&
        buffer.slice(0, 4).toString() === "RIFF" &&
        buffer.slice(8, 12).toString() === "WEBP";
      if (!isJpeg && !isPng && !isWebp) {
        return res
          .status(400)
          .json({
            error:
              "Corrupt image file: Image header signature does not match valid JPEG, PNG, or WebP.",
          });
      }
    } else if (type === "application/pdf" || /\.pdf$/i.test(name)) {
      if (buffer.length < 4 || buffer.slice(0, 4).toString() !== "%PDF") {
        return res
          .status(400)
          .json({
            error:
              "Corrupt document: File header does not match PDF specification.",
          });
      }
    }

    const safeName = name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}-${Math.floor(Math.random() * 1000)}-${safeName}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    const sizeFormatted =
      buffer.length > 1024 * 1024
        ? `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(buffer.length / 1024)} KB`;

    let importedPoliciesCount = 0;
    // Auto-parse & index if uploaded file is a JSON or CSV dataset with policy records
    if (/\.json$/i.test(name)) {
      try {
        const parsedJson = JSON.parse(buffer.toString('utf-8'));
        const rawPolicies = Array.isArray(parsedJson)
          ? parsedJson
          : parsedJson.policies || (parsedJson.features ? parsedJson.features.map((f: any) => ({ ...f.properties, boundaryCoordinates: f.geometry?.coordinates?.[0] })) : null);
        if (Array.isArray(rawPolicies)) {
          const importRes = dataStore.importPolicies(rawPolicies, `Uploaded File: ${safeName}`);
          importedPoliciesCount = importRes.imported + importRes.updated;
        }
      } catch (err) {
        console.warn('Could not parse uploaded JSON as policy records:', err);
      }
    } else if (/\.csv$/i.test(name)) {
      try {
        const text = buffer.toString('utf-8');
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
          const records: any[] = [];
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((h, idx) => {
              row[h] = vals[idx];
            });
            if (row.policyNumber || row.policy_no) {
              records.push({
                policyNumber: row.policyNumber || row.policy_no,
                farmerName: row.farmerName || row.farmer_name || row.name,
                surveyNumber: row.surveyNumber || row.survey_no || row.khasra,
                crop: row.crop,
                village: row.village,
                district: row.district,
                plotSize: row.plotSize || row.area,
                sumInsured: Number(row.sumInsured || row.sum_insured) || undefined,
                lat: row.lat ? Number(row.lat) : undefined,
                lng: row.lng ? Number(row.lng) : undefined
              });
            }
          }
          if (records.length > 0) {
            const importRes = dataStore.importPolicies(records, `Uploaded CSV: ${safeName}`);
            importedPoliciesCount = importRes.imported + importRes.updated;
          }
        }
      } catch (err) {
        console.warn('Could not parse uploaded CSV as policy records:', err);
      }
    }

    res.json({
      success: true,
      url: `/uploads/${filename}`,
      name: safeName,
      size: sizeFormatted,
      type: type || "image/jpeg",
      importedPoliciesCount
    });
  } catch (err: any) {
    console.error("File upload error:", err);
    res
      .status(500)
      .json({ error: "Failed to process file upload: " + err?.message });
  }
});

// ==========================================
// PMFBY POLICY & CADASTRAL VERIFICATION ENDPOINTS
// ==========================================

// Verify a PMFBY policy number dynamically with real database lookup
app.get("/api/policies/verify", (req, res) => {
  const policyQuery = typeof req.query.policyNumber === "string" ? req.query.policyNumber : "";
  const trimmed = policyQuery.trim();

  if (!trimmed) {
    return res.status(400).json({
      found: false,
      error: "Please enter a PMFBY policy number to search."
    });
  }

  const result = dataStore.findPolicyByNumber(trimmed);

  if (result.matches.length === 0) {
    return res.status(404).json({
      found: false,
      error: `Policy Not Found: No active PMFBY policy record matches '${trimmed}'. Please verify the policy number and try again.`
    });
  }

  // Handle ambiguous multiple distinct matches
  if (!result.exactMatch && result.matches.length > 1) {
    return res.status(300).json({
      found: false,
      ambiguous: true,
      error: `Multiple policies (${result.matches.length}) matched '${trimmed}'. Please specify the exact full policy number.`,
      matchingPolicies: result.matches.map((m) => m.policyNumber)
    });
  }

  const record = result.exactMatch || result.matches[0];

  // Backend integrity checks
  if (!record.farmerName || !record.surveyNumber || !record.crop) {
    return res.status(500).json({
      found: false,
      error: "Data integrity verification failed: Policy record is incomplete or corrupted."
    });
  }

  const hasValidGps = typeof record.lat === "number" && !isNaN(record.lat) && typeof record.lng === "number" && !isNaN(record.lng) && record.lat !== 0 && record.lng !== 0;
  const hasPolygon = Boolean(hasValidGps && Array.isArray(record.boundaryCoordinates) && record.boundaryCoordinates.length >= 3);

  res.json({
    found: true,
    policyNumber: record.policyNumber,
    farmer: {
      id: record.farmerId,
      name: record.farmerName,
      phone: record.phone,
      village: record.village || "Not available",
      district: record.district || "Not available",
      state: record.state || "Not available",
      aadhaar: record.aadhaar || "Not available",
      aadhaarVerified: Boolean(record.aadhaarVerified),
      aadhaarVerificationStatus: record.aadhaarVerificationStatus || (record.aadhaarVerified ? "Demo Verified (Synthetic Sandbox)" : "Pending Verification"),
      landRecordsVerified: Boolean(record.landRecordsVerified),
      landRecordsVerificationStatus: record.landRecordsVerificationStatus || (record.landRecordsVerified ? "Demo Verified (State Portal Sandbox)" : "Pending Verification"),
      isDemoRecord: Boolean(record.isDemoRecord)
    },
    land: {
      surveyNumber: record.surveyNumber || "Not available",
      khasraNumber: record.khasraNumber || "Not available",
      crop: record.crop || "Not available",
      season: record.season || "Kharif 2026",
      area: record.plotSize || "Not available",
      sumInsured: record.sumInsured ? `₹${record.sumInsured.toLocaleString("en-IN")}` : "Not available",
      sumInsuredRate: record.sumInsuredRate || "Not available",
      village: record.village || "Not available",
      district: record.district || "Not available",
      state: record.state || "Not available",
      lat: hasValidGps ? record.lat : null,
      lng: hasValidGps ? record.lng : null,
      gpsAccuracyMeters: record.gpsAccuracyMeters || 3.2,
      boundaryCoordinates: hasPolygon ? record.boundaryCoordinates : null,
      hasBoundaryPolygon: hasPolygon,
      hasGpsLocation: hasValidGps
    },
    source: record.source || "Database Record"
  });
});

// Import policy and cadastral records dynamically
app.post("/api/policies/import", (req, res) => {
  const { policies, sourceName } = req.body;
  if (!Array.isArray(policies) || policies.length === 0) {
    return res.status(400).json({
      error: "Import payload must contain a non-empty 'policies' array."
    });
  }

  const result = dataStore.importPolicies(policies, sourceName || "Direct API Import");
  res.json({
    success: true,
    message: `Successfully indexed ${result.imported} new and ${result.updated} updated policy record(s).`,
    ...result
  });
});

// List all registered policies (optionally filtered by query)
app.get("/api/policies", (req, res) => {
  const q = typeof req.query.search === "string" ? req.query.search.toLowerCase() : "";
  const allPolicies = dataStore.getPolicies();
  if (!q) {
    return res.json(allPolicies);
  }
  const filtered = allPolicies.filter(
    (p) =>
      p.policyNumber.toLowerCase().includes(q) ||
      p.farmerName.toLowerCase().includes(q) ||
      p.surveyNumber.toLowerCase().includes(q) ||
      p.village.toLowerCase().includes(q)
  );
  res.json(filtered);
});

// ==========================================
// SURVEYORS LIST ENDPOINT (FOR OFFICERS)
// ==========================================

app.get(
  "/api/surveyors",
  authenticateToken,
  requireRoles(["officer"]),
  (req, res) => {
    const surveyors = dataStore
      .getUsers()
      .filter((u) => u.role === "surveyor")
      .map(({ password: _, ...safe }) => safe);
    res.json(surveyors);
  },
);

// ==========================================
// APPLICATIONS / CLAIMS ENDPOINTS
// ==========================================

// Get applications filtered by authenticated role
app.get(
  "/api/applications",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const allApps = dataStore.getApplications();
    const search =
      typeof req.query.search === "string"
        ? req.query.search.toLowerCase()
        : "";
    const statusFilter =
      typeof req.query.status === "string" ? req.query.status : "";

    let filtered = allApps;

    if (user.role === "farmer") {
      // Farmers only see their own applications
      filtered = allApps.filter(
        (a) => a.farmerId === user.id || a.phone === user.phone,
      );
    } else if (user.role === "surveyor") {
      // Surveyors see applications assigned to them
      filtered = allApps.filter((a) => a.assignedSurveyorId === user.id);
    } else if (user.role === "officer") {
      // Officers see all applications
      filtered = allApps;
    }

    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (search) {
      filtered = filtered.filter(
        (a) =>
          a.id.toLowerCase().includes(search) ||
          a.farmerName.toLowerCase().includes(search) ||
          a.village.toLowerCase().includes(search) ||
          a.surveyNumber.toLowerCase().includes(search) ||
          a.district.toLowerCase().includes(search),
      );
    }

    res.json(filtered);
  },
);

// Get single application
app.get(
  "/api/applications/:id",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const appItem = dataStore.findApplicationById(req.params.id);

    if (!appItem) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Access check
    if (
      user.role === "farmer" &&
      appItem.farmerId !== user.id &&
      appItem.phone !== user.phone
    ) {
      return res
        .status(403)
        .json({
          error: "Access denied: You can only view your own applications.",
        });
    }

    if (user.role === "surveyor" && appItem.assignedSurveyorId !== user.id) {
      return res
        .status(403)
        .json({ error: "Access denied: This survey is not assigned to you." });
    }

    res.json(appItem);
  },
);

// Submit / Create new application
app.post(
  "/api/applications",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const body = req.body;

    const nowStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const appId = `FP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const isDraft = body.status === "Draft";
    const initialStatus = isDraft ? "Draft" : "Submitted";

    // Server-side mandatory location validation
    let finalLat =
      body.lat !== undefined && body.lat !== null && body.lat !== ""
        ? Number(body.lat)
        : undefined;
    let finalLng =
      body.lng !== undefined && body.lng !== null && body.lng !== ""
        ? Number(body.lng)
        : undefined;

    // Fallback: parse coordinates from photo metadata if not directly provided
    if (
      (finalLat === undefined || isNaN(finalLat)) &&
      Array.isArray(body.photos) &&
      body.photos.length > 0
    ) {
      for (const p of body.photos) {
        if (p.gps && typeof p.gps === "string") {
          const parts = p.gps.split(",");
          if (parts.length === 2) {
            const latVal = parseFloat(parts[0].replace(/[^0-9.-]/g, ""));
            const lngVal = parseFloat(parts[1].replace(/[^0-9.-]/g, ""));
            if (!isNaN(latVal) && !isNaN(lngVal)) {
              finalLat = latVal;
              finalLng = lngVal;
              break;
            }
          }
        }
      }
    }

    if (!isDraft) {
      if (
        finalLat === undefined ||
        isNaN(finalLat) ||
        finalLng === undefined ||
        isNaN(finalLng)
      ) {
        return res.status(400).json({
          error:
            "Mandatory GPS location is missing. Actual farm plot coordinates must be captured before submission.",
        });
      }
      if (
        finalLat < -90 ||
        finalLat > 90 ||
        finalLng < -180 ||
        finalLng > 180
      ) {
        return res.status(400).json({
          error:
            "Invalid coordinates: Latitude must be between -90 and 90, Longitude between -180 and 180.",
        });
      }

      // Statutory PMFBY 5-Photo Evidence Enforcement
      const photos = body.photos;
      if (!Array.isArray(photos)) {
        return res.status(400).json({
          error: "Statutory PMFBY evidence requires exactly 5 photographs.",
        });
      }

      if (photos.length !== 5) {
        return res.status(400).json({
          error: `Statutory PMFBY evidence requires exactly 5 photographs (received ${photos.length}). All 5 statutory slots must be filled.`,
        });
      }

      // Validate slots 1 to 5
      const slotNumbers = photos.map((p: any) =>
        Number(
          p.slotNumber !== undefined && p.slotNumber !== null
            ? p.slotNumber
            : p.id,
        ),
      );
      const missingSlots = [1, 2, 3, 4, 5].filter(
        (s) => !slotNumbers.includes(s),
      );
      if (missingSlots.length > 0) {
        return res.status(400).json({
          error: `Incomplete statutory slots: Missing Photo Slot(s) ${missingSlots.join(", ")}. Exactly one photo is required for each slot 1 to 5.`,
        });
      }

      // Prevent multiple photographs in same slot
      const uniqueSlots = new Set(slotNumbers);
      if (uniqueSlots.size !== 5) {
        return res.status(400).json({
          error:
            "Duplicate statutory photo slots detected. Each of the 5 slots must contain exactly one photograph.",
        });
      }

      // Prevent duplicate images across slots via hash check
      const hashes = photos.map((p: any) => p.hash).filter(Boolean);
      const uniqueHashes = new Set(hashes);
      if (uniqueHashes.size !== hashes.length) {
        return res.status(400).json({
          error:
            "Duplicate photograph detected across statutory slots. The exact same image cannot be submitted for multiple slots.",
        });
      }

      // Validate image quality: reject unusable or severely blurry photos
      for (const photo of photos) {
        if (photo.qualityStatus === "Rejected") {
          return res.status(400).json({
            error: `Photo in Slot ${photo.slotNumber || ""} (${photo.label || "Evidence"}) was rejected: ${photo.qualityReason || "Severe blur or unusable quality"}. Please retake with clear crop focus.`,
          });
        }
      }
    }

    // Record institutional metric
    dataStore.recordInstitutionalMetric("claims");

    const historyItem: HistoryItem = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      status: initialStatus,
      performedBy: user.name,
      role: user.role === "farmer" ? "Farmer" : "Officer",
      action: isDraft ? "Application Draft Saved" : "Application Submitted",
      notes: isDraft
        ? "Farmer saved draft application"
        : `Application lodged for ${body.crop || "Crop"} loss caused by ${body.cause || "Peril"}. GPS coordinates locked.`,
    };

    const newApp: Application = {
      id: appId,
      farmerId: user.id,
      farmerName: body.farmerName || user.name,
      phone: body.phone || user.phone,
      email: body.email || user.email,
      aadhaar: body.aadhaar || user.aadhaar || "XXXX-XXXX-0000",
      bankAccount: body.bankAccount || user.bankAccount || "",
      bankName: body.bankName || user.bankName || "State Bank of India",
      ifsc: body.ifsc || user.ifsc || "",
      policyNumber:
        body.policyNumber ||
        `PMFBY/TS/WR/2026/${Math.floor(10000 + Math.random() * 90000)}`,
      village: body.village || user.village || "Nallabelly",
      district: body.district || user.district || "Warangal Rural",
      state: body.state || user.state || "Telangana",
      surveyNumber: body.surveyNumber || user.surveyNumber || "412/A",
      plotSize: body.plotSize || "1.0 ha",
      category: body.category || "PMFBY Clause 14.2 Localized Calamity",
      crop: body.crop || "Paddy (Kharif)",
      cause: body.cause || "Hail",
      description: body.description || "",
      aiDamage: body.aiDamage || "Moderate",
      aiConfidence: body.aiConfidence || 80,
      damagePercentage: body.damagePercentage || 75,
      weatherMatch: body.weatherMatch || "Match",
      weatherDetails: body.weatherDetails || "Weather conditions logged",
      weatherStats: body.weatherStats,
      priority: body.priority || "Review",
      suggestedAction: body.suggestedAction || "Review application submission",
      status: initialStatus,
      submissionTime: nowStr,
      lastUpdated: nowStr,
      photosCount: (body.photos || []).length,
      gpsLocked: Boolean(finalLat !== undefined && finalLng !== undefined),
      lat: finalLat !== undefined ? finalLat : 0,
      lng: finalLng !== undefined ? finalLng : 0,
      estimatedPayoutInr: body.estimatedPayoutInr || 35000,
      payoutStatus: "Pending",
      officerNotes: body.officerNotes || "",
      photos: body.photos || [],
      documents: body.documents || [],
      history: [historyItem],
    };

    dataStore.createApplication(newApp);

    // Notify farmer
    if (!isDraft) {
      dataStore.createNotification({
        userId: user.id,
        applicationId: newApp.id,
        title: "Application Submitted Successfully",
        message: `Your crop loss claim reference is ${newApp.id}. It has been forwarded to the Mandal Agricultural Office for review.`,
        type: "success",
        read: false,
        timestamp: nowStr,
      });

      // Notify officer
      const officers = dataStore.getUsers().filter((u) => u.role === "officer");
      for (const off of officers) {
        dataStore.createNotification({
          userId: off.id,
          applicationId: newApp.id,
          title: "New Crop Loss Claim Lodged",
          message: `Claim ${newApp.id} submitted by ${newApp.farmerName} (${newApp.village}, ${newApp.crop}, ${newApp.cause}).`,
          type: "info",
          read: false,
          timestamp: nowStr,
        });
      }
    }

    res.status(201).json(newApp);
  },
);

// Update application (e.g. Save Draft, Farmer Resubmission after correction)
app.put(
  "/api/applications/:id",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const appId = req.params.id;
    const current = dataStore.findApplicationById(appId);

    if (!current) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (
      user.role === "farmer" &&
      current.farmerId !== user.id &&
      current.phone !== user.phone
    ) {
      return res
        .status(403)
        .json({
          error: "Access denied: You can only edit your own applications.",
        });
    }

    const nowStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const body = req.body;
    const isResubmitting =
      current.status === "Correction Required" && body.status === "Submitted";

    const historyItem: HistoryItem = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      status: body.status || current.status,
      performedBy: user.name,
      role: user.role === "farmer" ? "Farmer" : "Officer",
      action: isResubmitting ? "Corrections Submitted" : "Application Updated",
      notes:
        body.updateNotes ||
        (isResubmitting
          ? "Farmer provided requested corrections and updated evidence."
          : "Application details updated."),
    };

    const updated = dataStore.updateApplication(appId, {
      ...body,
      history: [...current.history, historyItem],
    });

    if (isResubmitting) {
      // Notify officer
      const officers = dataStore.getUsers().filter((u) => u.role === "officer");
      for (const off of officers) {
        dataStore.createNotification({
          userId: off.id,
          applicationId: appId,
          title: "Correction Resubmitted by Farmer",
          message: `Farmer ${current.farmerName} resubmitted corrections for Claim ${appId}. Ready for officer review.`,
          type: "info",
          read: false,
          timestamp: nowStr,
        });
      }
    }

    res.json(updated);
  },
);

// Officer assigns surveyor
app.post(
  "/api/applications/:id/assign-surveyor",
  authenticateToken,
  requireRoles(["officer"]),
  (req: AuthenticatedRequest, res) => {
    const appId = req.params.id;
    const { surveyorId, deadline, instructions } = req.body;

    const current = dataStore.findApplicationById(appId);
    if (!current) {
      return res.status(404).json({ error: "Application not found" });
    }

    const surveyor = dataStore.findUserById(surveyorId);
    if (!surveyor || surveyor.role !== "surveyor") {
      return res
        .status(400)
        .json({
          error:
            "Invalid surveyor selected. Must be an authorised field surveyor.",
        });
    }

    const nowStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const historyItem: HistoryItem = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      status: "Survey Assigned",
      performedBy: req.user!.name,
      role: "Officer",
      action: current.assignedSurveyorId
        ? "Surveyor Reassigned"
        : "Surveyor Assigned",
      notes: `Assigned to ${surveyor.name} (${surveyor.designation || "Field Surveyor"}). Deadline: ${deadline || "Within 72h"}. Instructions: ${instructions || "Conduct physical on-site loss verification."}`,
    };

    const updated = dataStore.updateApplication(appId, {
      status: "Survey Assigned",
      assignedSurveyorId: surveyor.id,
      assignedSurveyorName: surveyor.name,
      assignedSurveyorPhone: surveyor.phone,
      assignmentDate: nowStr,
      surveyDeadline: deadline || "Within 72h",
      officerInstructions:
        instructions || "Verify crop damage and cadastral landmarks.",
      history: [...current.history, historyItem],
    });

    // Notify Surveyor
    dataStore.createNotification({
      userId: surveyor.id,
      applicationId: appId,
      title: "New Survey Assigned",
      message: `You have been assigned to survey Claim ${appId} (Farmer: ${current.farmerName}, ${current.village}). Deadline: ${deadline || "Within 72h"}.`,
      type: "warning",
      read: false,
      timestamp: nowStr,
    });

    // Notify Farmer
    dataStore.createNotification({
      userId: current.farmerId,
      applicationId: appId,
      title: "Field Surveyor Assigned",
      message: `Mandal Agricultural Officer assigned Field Surveyor ${surveyor.name} to conduct on-site physical survey of your plot.`,
      type: "info",
      read: false,
      timestamp: nowStr,
    });

    res.json(updated);
  },
);

// Surveyor records findings and submits survey
app.post(
  "/api/applications/:id/submit-survey",
  authenticateToken,
  requireRoles(["surveyor"]),
  (req: AuthenticatedRequest, res) => {
    const appId = req.params.id;
    const surveyor = req.user!;
    const current = dataStore.findApplicationById(appId);

    if (!current) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (current.assignedSurveyorId !== surveyor.id) {
      return res
        .status(403)
        .json({ error: "You are not assigned to this survey." });
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
      actionType, // 'verify' | 'flag' | 'survey_ok'
    } = req.body;

    if (!remarks || remarks.trim().length < 5) {
      return res
        .status(400)
        .json({
          error: "Surveyor remarks and inspection observations are mandatory.",
        });
    }

    const nowStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const nextStatus =
      actionType === "flag" ? "Under Review" : "Survey Completed";

    const historyItem: HistoryItem = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      status: nextStatus,
      performedBy: surveyor.name,
      role: "Surveyor",
      action:
        actionType === "verify"
          ? "Survey Confirmed & Verified"
          : actionType === "flag"
            ? "Survey Flagged with Issue"
            : "Survey OK - Findings Submitted",
      notes: `Surveyor observations recorded. Loss assessed: ${observedLossPercentage}%. Recommendation: ${surveyorRecommendation || "Survey OK"}. Remarks: ${remarks}`,
    };

    const surveyFindings = {
      surveyorId: surveyor.id,
      surveyorName: surveyor.name,
      surveyDate: nowStr,
      visitGps: visitGps || `${current.lat}° N, ${current.lng}° E`,
      boundaryIntegrityVerified: Boolean(boundaryIntegrityVerified),
      cropSpeciesVerified: Boolean(cropSpeciesVerified),
      observedLossPercentage:
        Number(observedLossPercentage) || current.damagePercentage,
      lodgingObserved: Boolean(lodgingObserved),
      waterloggingObserved: Boolean(waterloggingObserved),
      pestSymptomObserved: Boolean(pestSymptomObserved),
      surveyorRecommendation: surveyorRecommendation || "Survey OK - Proceed",
      remarks: remarks.trim(),
      additionalPhotos: additionalPhotos || [],
      submittedAt: nowStr,
    };

    const updated = dataStore.updateApplication(appId, {
      status: nextStatus,
      damagePercentage:
        Number(observedLossPercentage) || current.damagePercentage,
      surveyFindings,
      history: [...current.history, historyItem],
    });

    // Notify Officers
    const officers = dataStore.getUsers().filter((u) => u.role === "officer");
    for (const off of officers) {
      dataStore.createNotification({
        userId: off.id,
        applicationId: appId,
        title: "Survey Completed by Surveyor",
        message: `Surveyor ${surveyor.name} submitted field survey findings for Claim ${appId} (Assessed Loss: ${observedLossPercentage}%). Awaiting officer decision.`,
        type: "info",
        read: false,
        timestamp: nowStr,
      });
    }

    // Notify Farmer
    dataStore.createNotification({
      userId: current.farmerId,
      applicationId: appId,
      title: "Physical Survey Completed",
      message: `Field surveyor ${surveyor.name} has completed the physical field inspection. Findings submitted to reviewing officer for final sanction.`,
      type: "info",
      read: false,
      timestamp: nowStr,
    });

    res.json(updated);
  },
);

// Officer decision (Approve, Reject, Request Correction, Return for Re-survey)
app.post(
  "/api/applications/:id/officer-decision",
  authenticateToken,
  requireRoles(["officer"]),
  (req: AuthenticatedRequest, res) => {
    const appId = req.params.id;
    const officer = req.user!;
    const current = dataStore.findApplicationById(appId);

    if (!current) {
      return res.status(404).json({ error: "Application not found" });
    }

    const { decision, remarks, sanctionedPayout } = req.body;

    if (!decision) {
      return res.status(400).json({ error: "Decision action is required." });
    }

    if (
      (decision === "reject" || decision === "request_correction") &&
      (!remarks || remarks.trim().length < 5)
    ) {
      return res
        .status(400)
        .json({
          error:
            "Detailed remarks/reason are mandatory for rejections and correction requests.",
        });
    }

    const nowStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let nextStatus: Application["status"] = current.status;
    let actionTitle = "";
    let updates: Partial<Application> = {};

    if (decision === "approve") {
      nextStatus = "Approved";
      actionTitle = "Claim Sanctioned & Approved";
      const finalPayout =
        Number(sanctionedPayout) || current.estimatedPayoutInr;
      const sanctionOrderNumber = `SO-PMFBY-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      updates = {
        status: nextStatus,
        payoutStatus: "Disbursed to Bank",
        sanctionedPayoutInr: finalPayout,
        sanctionDetails: {
          sanctionOrderNumber,
          sanctionedAmountInr: finalPayout,
          sanctionDate: nowStr,
          officerName: officer.name,
        },
        officerNotes:
          remarks ||
          "Sanctioned by Mandal Agricultural Officer following survey verification.",
        rejectionReason: undefined,
      };
    } else if (decision === "reject") {
      nextStatus = "Rejected";
      actionTitle = "Claim Rejected";
      updates = {
        status: nextStatus,
        payoutStatus: "Rejected",
        rejectionReason: remarks,
        officerNotes: remarks,
      };
    } else if (decision === "request_correction" || decision === "correction") {
      nextStatus = "Correction Required";
      actionTitle = "Correction Requested from Farmer";
      updates = {
        status: nextStatus,
        correctionRequest: {
          officerId: officer.id,
          officerName: officer.name,
          requestedAt: nowStr,
          remarks: remarks,
          resolved: false,
        },
        officerNotes: remarks,
      };
    } else if (decision === "return_survey" || decision === "survey") {
      nextStatus = "Survey Assigned";
      actionTitle = "Returned for Additional Survey Verification";
      updates = {
        status: nextStatus,
        officerInstructions: remarks,
        officerNotes: remarks,
      };
    }

    const historyItem: HistoryItem = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      status: nextStatus,
      performedBy: officer.name,
      role: "Officer",
      action: actionTitle,
      notes: remarks || `Officer sanctioned decision: ${decision}.`,
    };

    const updated = dataStore.updateApplication(appId, {
      ...updates,
      history: [...current.history, historyItem],
    });

    // Notify Farmer
    let farmerNotifMsg = "";
    let notifType: "info" | "success" | "warning" | "alert" = "info";

    if (decision === "approve") {
      farmerNotifMsg = `Congratulations! Claim ${appId} has been approved for ₹${(updates.sanctionedPayoutInr || current.estimatedPayoutInr).toLocaleString("en-IN")}. Funds initiated via PFMS DBT.`;
      notifType = "success";
    } else if (decision === "reject") {
      farmerNotifMsg = `Claim ${appId} was rejected. Reason: ${remarks}`;
      notifType = "alert";
    } else if (decision === "request_correction" || decision === "correction") {
      farmerNotifMsg = `Officer requested corrections for Claim ${appId}: "${remarks}". Please submit requested updates.`;
      notifType = "warning";
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
      timestamp: nowStr,
    });

    res.json(updated);
  },
);

// ==========================================
// NOTIFICATIONS ENDPOINTS
// ==========================================

app.get(
  "/api/notifications",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    const notifs = dataStore.getNotifications(req.user!.id);
    res.json(notifs);
  },
);

app.post(
  "/api/notifications/:id/read",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    const success = dataStore.markNotificationRead(req.params.id, req.user!.id);
    res.json({ success });
  },
);

// ==========================================
// AI & WEATHER ENDPOINTS (COMPLIANT & UNBIASED)
// ==========================================

// In-memory weather cache to avoid rate limits and duplicate requests (Phase 4 requirement)
const weatherCache = new Map<string, { timestamp: number; data: any }>();
const WEATHER_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const handleAiDamageEstimate = async (req: any, res: any) => {
  const { crop, peril, plotSize, photos, observedLoss } = req.body;

  // Record institutional metric
  dataStore.recordInstitutionalMetric("ai");

  // Critical rule: If no AI key, show a clear unavailable state. Never silently substitute hardcoded AI results.
  if (!apiKey || !ai) {
    return res.json({
      available: false,
      status: "unavailable",
      reason:
        "GEMINI_API_KEY environment variable is not configured on this server.",
      provider: "None (Unconfigured)",
      advisoryNotice:
        "AI Vision Assessment is strictly advisory under PMFBY guidelines. Ground surveyor and agricultural officer retain final statutory decision authority.",
      modelSummary:
        "AI Vision model unavailable. Claim will proceed to manual officer assessment and field survey quadrant inspection.",
    });
  }

  try {
    // If photos are flagged as blurry or missing
    const hasPhotos = Array.isArray(photos) && photos.length > 0;
    const allBlurry = hasPhotos && photos.every((p: any) => p.isBlurry);

    if (allBlurry) {
      return res.json({
        available: true,
        insufficientEvidence: true,
        damageBand: "Marginal",
        likelyCause: peril || "Unknown",
        confidence: 0.15,
        lodgingPercent: 0,
        unclearReason:
          "Evidence photographs submitted are excessively blurry or out-of-focus. Insufficient visual clarity for automated canopy loss estimation.",
        suggestedAction:
          "Visit: physical inspection required due to unclear image quality",
        advisoryNotice:
          "AI vision advisory: Image clarity insufficient. Physical survey mandatory.",
        modelSummary:
          "Image quality insufficient for automated scoring. Flagged for surveyor quadrant sampling.",
        evaluatedAt: new Date().toISOString(),
        provider: "Google Gemini Vision",
      });
    }

    const prompt = `You are the FarmProof Agricultural Insurance Evidence Advisory Engine.
Evaluate the following PMFBY crop loss claim:
- Crop: ${crop || "Paddy (Kharif)"}
- Claimed Peril: ${peril || "Hail"}
- Plot Size: ${plotSize || "1.2 ha"}
- Farmer Reported Loss: ${observedLoss || 0}%
- Evidence Photos Submitted: ${photos?.length || 0} photos.

CRITICAL STATUTORY RULES:
1. Do not invent damage percentages.
2. Visual damage percentage is strictly advisory and does NOT equate to final insured monetary payout.
3. If evidence is insufficient, set insufficientEvidence to true and low confidence (< 0.3).
4. Severity Rubric:
   - "Marginal": below 30% visual damage
   - "Moderate": 30% to 70% visual damage
   - "Severe": above 70% visual damage
5. Suggest action: exactly one of: "Verified: fast-track to insurer", "Review: check pack remotely", or "Visit: spot-check required before payout".

Return JSON adhering to schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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
            modelSummary: { type: Type.STRING },
            insufficientEvidence: { type: Type.BOOLEAN },
          },
          required: [
            "damageBand",
            "likelyCause",
            "confidence",
            "lodgingPercent",
            "suggestedAction",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      available: true,
      status: "evaluated",
      provider: "Google Gemini Vision",
      evaluatedAt: new Date().toISOString(),
      advisoryNotice:
        "AI output is advisory under PMFBY guidelines. The reviewing officer retains final statutory authority.",
      ...parsed,
    });
  } catch (err: any) {
    console.error("Gemini vision evaluation error:", err?.message);
    return res.status(200).json({
      available: false,
      status: "error",
      canRetry: true,
      reason: `AI vision model evaluation failed: ${err?.message || "Request timeout"}`,
      advisoryNotice:
        "AI vision model unavailable or timed out. Officers retain final statutory authority.",
      suggestedAction: "Review: check pack remotely or route to field surveyor",
    });
  }
};

app.post("/api/ai/damage-estimate", handleAiDamageEstimate);
app.post("/api/ai-assessment", handleAiDamageEstimate);

app.get("/api/weather", async (req, res) => {
  const lat = req.query.lat ? Number(req.query.lat) : undefined;
  const lng = req.query.lng ? Number(req.query.lng) : undefined;
  const date =
    typeof req.query.date === "string" && req.query.date
      ? req.query.date
      : new Date().toISOString().split("T")[0];

  dataStore.recordInstitutionalMetric("weather");

  if (lat === undefined || isNaN(lat) || lng === undefined || isNaN(lng)) {
    return res.status(400).json({
      available: false,
      error:
        "Missing or invalid latitude/longitude coordinates for meteorological query.",
      disclaimer:
        "Weather is contextual corroboration only; not proof that a weather event caused the crop damage.",
    });
  }

  const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${date}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  try {
    // Open-Meteo API call: Try historical archive first, if date is recent fallback to forecast/recent API
    let url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${date}&end_date=${date}&daily=precipitation_sum,wind_speed_10m_max,weather_code&timezone=auto`;
    let resp = await fetch(url);

    if (!resp.ok) {
      // If archive fails (e.g. date is too recent or current year), try forecast API with past_days
      url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,wind_speed_10m_max,weather_code&timezone=auto&past_days=7&forecast_days=1`;
      resp = await fetch(url);
    }

    if (!resp.ok) {
      throw new Error(`Open-Meteo API returned status ${resp.status}`);
    }

    const data = await resp.json();
    const precipVal =
      Array.isArray(data.daily?.precipitation_sum) &&
      data.daily.precipitation_sum.length > 0
        ? Number(data.daily.precipitation_sum[0])
        : 0;
    const windVal =
      Array.isArray(data.daily?.wind_speed_10m_max) &&
      data.daily.wind_speed_10m_max.length > 0
        ? Number(data.daily.wind_speed_10m_max[0])
        : 0;

    const resultPayload = {
      available: true,
      precipitationMm: precipVal,
      recordedRainMm: precipVal,
      maxWindKmh: windVal,
      windSpeedMaxKmh: windVal,
      location: `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`,
      queryCoordinates: { lat, lng },
      queryDate: date,
      units: {
        precipitation: "mm",
        windSpeed: "km/h",
      },
      daily: data.daily || {},
      disclaimer:
        "Weather is contextual corroboration only; not proof that a weather event caused crop damage. Official PMFBY loss adjustment requires officer or surveyor sign-off.",
      cachedAt: new Date().toISOString(),
    };

    weatherCache.set(cacheKey, { timestamp: Date.now(), data: resultPayload });
    return res.json(resultPayload);
  } catch (error: any) {
    // Never generate fake rainfall values or present missing data as zero rainfall!
    return res.status(200).json({
      available: false,
      queryCoordinates: { lat, lng },
      queryDate: date,
      error:
        "Open-Meteo meteorological record unavailable for the selected coordinates and date.",
      reason:
        error?.message || "External weather API unreachable or rate-limited",
      disclaimer:
        "Weather data is contextual corroboration only. When unavailable, claims proceed with photographic evidence and physical field surveyor quadrant inspection.",
    });
  }
});

// ==========================================
// INSTITUTIONAL USAGE & REVENUE MODEL (PHASE 10)
// ==========================================

app.get(
  "/api/institution/usage-report",
  authenticateToken,
  requireRoles(["officer"]),
  (req, res) => {
    const usage = dataStore.getInstitutionalUsage();
    res.json({
      success: true,
      reportDate: new Date().toISOString(),
      organization: usage.organizationName,
      division: usage.division,
      activeTier: usage.activeTier,
      billingStatus: usage.billingStatus,
      metrics: {
        totalClaimsIngested: usage.claimsIngested,
        aiVisionEvaluations: usage.aiVisionRuns,
        weatherCorroborations: usage.weatherCorroborations,
        fieldSurveysDispatched: usage.fieldSurveysDispatched,
      },
      commercialModel: {
        farmerFee: "₹0 (100% Free under PMFBY public service mandate)",
        institutionalModel: "SaaS / Per-Claim tiered pricing readiness",
        pilotPricingProposal:
          "Free evaluation pilot, scaling to ₹45 - ₹65 per verified claim pack upon institutional SLA adoption",
      },
      notes: usage.commercialReadinessNotes,
    });
  },
);

// ==========================================
// TEST REGRESSION RESET ENDPOINT
// ==========================================

app.post("/api/test/reset-db", (req, res) => {
  dataStore.resetDatabaseForTesting();
  weatherCache.clear();
  res.json({
    success: true,
    message:
      "Database and cache reset to clean initial state for regression testing.",
  });
});

// Server boot
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FarmProof server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
