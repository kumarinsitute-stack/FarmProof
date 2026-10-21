# FarmProof — PMFBY Crop Loss Verification & Insurance Portal

> **National Agriculture Insurance Portal**  
> Pradhan Mantri Fasal Bima Yojana (PMFBY)  
> Department of Agriculture & Farmers Welfare • Government of India

FarmProof is an end-to-end digital crop loss verification and Direct Benefit Transfer (DBT) fast-tracking system built according to the PMFBY 72-hour statutory intimation guidelines.

---

## 🌟 Key Features

1. **Government Scheme Profile (Official PMFBY Portal UI)**
   - Official Ministry branding with national tricolor banner and verified badges.
   - Comprehensive scheme details: 72-Hour Claim Mandate, Kharif (2%) / Rabi (1.5%) / Horticultural (5%) premium structures, claim assessment SLAs, and claim eligibility guidelines.
   - Instant Policy & Aadhaar lookup tool with sample farmer profiles.
   - Cadastral village parcel map integration.

2. **Tri-lingual Internationalization (i18n)**
   - Complete toggle between **English**, **हिन्दी (Hindi)**, and **తెలుగు (Telugu)** across all flows, headers, labels, and status badges.

3. **5-Photo Geotagged Evidence Kit (Farmer Camera HUD)**
   - Live camera viewfinder (`getUserMedia`) with grid reticle, GPS stamp, timestamp, and compass bearing.
   - Enforces the 5 PMFBY required photographic perspectives:
     1. Wide Plot View (overall field perimeter)
     2. Soil / Root Inundation
     3. Canopy Damage Close-up
     4. Cadastral Boundary / Landmark Reference
     5. Farmer / Beneficiary Self-Verification
   - Instant daylight agricultural fallback samples and manual file upload support.

4. **Independent Weather Corroboration (Open-Meteo API)**
   - Automatic live weather lookup by latitude, longitude, and loss date.
   - Corroborates heavy rainfall, maximum wind speed, and precipitation consistency.
   - Yields consistency score: **Match**, **Partial**, or **Discrepancy**.

5. **AI Vision Loss Scoring & Severity Bands**
   - Automated crop damage estimation with confidence interval.
   - Statutory classification:
     - **Severe Loss (>70%)**: Fast-track DBT authorization.
     - **Moderate Loss (30% - 70%)**: Fast-track remote officer approval.
     - **Marginal Loss (<30%)**: Physical ground surveyor inspection.

6. **PMFBY Insurance Officer Review Dashboard**
   - Ranked priority review queue based on claim severity and time remaining in the 72-hour statutory window.
   - Cadastral map with survey plot boundaries.
   - Statutory action buttons:
     - **Authorize DBT Payout** (direct credit to farmer's Aadhaar-linked bank account)
     - **Order Physical Survey** (appoint state agricultural surveyor)
     - **Reject Claim** (with reason logging and audit trail)

7. **Farmer Digital Claim Receipt & Tracker**
   - Digital acknowledgement receipt with unique Claim ID (e.g., `FP-2041`).
   - 6-stage lifecycle tracking from evidence submission to bank disbursement.

---

## 📂 Project Structure

```
├── public/
│   ├── favicon.svg             # Official PMFBY emblem favicon
│   └── farmproof-source.zip    # Downloadable ZIP package of the repo
├── src/
│   ├── components/
│   │   ├── FarmerCapture.tsx   # Live camera, 5-photo HUD & upload
│   │   ├── FarmerReport.tsx    # Peril & crop selection form with map
│   │   ├── FarmerTracker.tsx   # Claim status tracker & digital receipt
│   │   ├── Navbar.tsx          # Tri-color national header & language toggle
│   │   ├── OfficerDashboard.tsx# Review portal, AI damage bands & DBT payout
│   │   ├── PhotoRenderer.tsx   # Photo display with daylight fallbacks & zoom
│   │   ├── RealLeafletMap.tsx  # Leaflet GPS map with plot cadastral overlay
│   │   └── RoleSelect.tsx      # Default PMFBY Scheme Profile & portal hub
│   ├── App.tsx                 # Core application controller & routing
│   ├── index.css               # Tailwind CSS styles & gov portal theme
│   ├── main.tsx                # React DOM entry point
│   ├── mockData.ts             # PMFBY claims, daylight photos & checklist
│   ├── translations.ts         # Complete EN / HI / TE dictionary
│   └── types.ts                # TypeScript type definitions
├── index.html                  # HTML entry point with instant gov loader
├── metadata.json               # App metadata
├── package.json                # Dependencies and scripts
├── server.ts                   # Express server & Open-Meteo weather proxy
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite bundler configuration
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- npm or pnpm or bun

### 1. Installation
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### 3. Build for Production
```bash
npm run build
```

### 4. Start Production Server
```bash
npm start
```

---

## 📦 How to Push to Your GitHub Repository

If you want to push this project to a new GitHub repository:

1. Create a new repository on [GitHub](https://github.com/new) (e.g. named `farmproof-pmfby-portal`).
2. In your local project directory, run:
```bash
# Initialize git
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit: FarmProof PMFBY Crop Loss Verification Portal"

# Set default branch to main
git branch -M main

# Link to your remote GitHub repository
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git

# Push code to GitHub
git push -u origin main
```

---

## 📜 License
Apache-2.0. Built for the Pradhan Mantri Fasal Bima Yojana (PMFBY) modernization initiative.
