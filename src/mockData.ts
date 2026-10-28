import { Claim, PhotoChecklistItem } from './types';

// Authentic 5-photo statutory evidence kit from FarmProof specs & PMFBY guidelines
export const REQUIRED_PHOTOS: PhotoChecklistItem[] = [
  {
    id: 1,
    label: "Wide Field Overview",
    tip: "Hold phone at eye level showing the full damaged perimeter & horizon (5-10m panorama)",
    purpose: "Establishes macro scale and overall perimeter lodging/flooding extent",
    minDistance: "Eye level (5-10m panorama)",
    defaultImage: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80"
  },
  {
    id: 2,
    label: "Root Inundation & Soil Base",
    tip: "Capture standing water, submerged stem base, or soil scouring around root crowns",
    purpose: "Verifies water depth, submergence duration, or physical stem lodging trauma at soil line",
    minDistance: "Ground-level 0.5m perspective",
    defaultImage: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1000&q=80"
  },
  {
    id: 3,
    label: "Crop Canopy Close-up",
    tip: "Hold phone 30 cm away showing leaf laceration, lodging trauma, or fruit/boll shedding",
    purpose: "Micro-texture verification for hail perforations vs pest vs root disease pattern",
    minDistance: "30 cm macro distance",
    defaultImage: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1000&q=80"
  },
  {
    id: 4,
    label: "Cadastral Landmark Reference",
    tip: "Capture permanent boundary fence, canal bank, survey stone, or road bordering the plot",
    purpose: "Fraud prevention: anchors photo set to official cadastral village map & survey parcel",
    minDistance: "Fixed boundary marker",
    defaultImage: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1000&q=80"
  },
  {
    id: 5,
    label: "Farmer Identification & Self-Verification",
    tip: "Beneficiary photograph standing in front of the damaged parcel",
    purpose: "Statutory beneficiary identity anchoring to prevent proxy or fraudulent claims",
    minDistance: "Portrait with field background",
    defaultImage: "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=1000&q=80"
  }
];

export const INITIAL_CLAIMS: Claim[] = [
  {
    id: "FP-2041",
    farmerName: "Ramulu K.",
    phone: "9848023145",
    aadhaar: "XXXX-XXXX-8492",
    bankAccount: "3849102847",
    bankName: "State Bank of India (Warangal)",
    policyNumber: "PMFBY/TS/WR/2026/89401",
    village: "Nallabelly",
    district: "Warangal Rural",
    state: "Telangana",
    surveyNumber: "412/A",
    plotSize: "1.2 ha",
    crop: "Paddy (Kharif)",
    cause: "Hail",
    aiDamage: "Severe",
    aiConfidence: 84,
    damagePercentage: 84,
    weatherMatch: "Match",
    weatherDetails: "Hailstorm & 48mm rain recorded on 16 Oct within 4km",
    weatherStats: {
      recordedRainMm: 48.2,
      maxWindKmh: 46.5,
      historicalMeanRainMm: 3.1,
      hailRadarDetected: true
    },
    priority: "Visit",
    suggestedAction: "Visit: Damage is severe, spot-check required before payout",
    status: "Officer Review",
    submissionTime: "16 Oct, 14:32",
    photosCount: 5,
    gpsLocked: true,
    lat: 17.9689,
    lng: 79.5941,
    estimatedPayoutInr: 42500,
    payoutStatus: "Pending",
    officerNotes: "Fieldwork spot-check assigned to Mandal AO; 4 adjacent plots also suffered localized hailstorm lodging.",
    photos: [
      {
        id: 1,
        label: "Wide Plot View",
        url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80",
        timestamp: "14:28:10 IST",
        date: "16 Oct 2026",
        gps: "17.9689° N, 79.5941° E",
        accuracyMeters: 3.2,
        tamperChecked: true,
        sampleType: "wide_lodging",
        detectedDamage: "82% lodging across 1.2 ha basin"
      },
      {
        id: 2,
        label: "Close-up of Damaged Leaves",
        url: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1000&q=80",
        timestamp: "14:29:45 IST",
        date: "16 Oct 2026",
        gps: "17.9691° N, 79.5943° E",
        accuracyMeters: 2.8,
        tamperChecked: true,
        sampleType: "damaged_leaves",
        detectedDamage: "Extensive hail tear & midrib snapping"
      },
      {
        id: 3,
        label: "Plant Count Sample",
        url: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1000&q=80",
        timestamp: "14:30:30 IST",
        date: "16 Oct 2026",
        gps: "17.9688° N, 79.5940° E",
        accuracyMeters: 3.0,
        tamperChecked: true,
        sampleType: "quadrat_sample",
        detectedDamage: "24 of 28 stems flattened in 1m x 1m quadrat"
      },
      {
        id: 4,
        label: "Boundary & Landmark",
        url: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1000&q=80",
        timestamp: "14:31:12 IST",
        date: "16 Oct 2026",
        gps: "17.9685° N, 79.5938° E",
        accuracyMeters: 3.5,
        tamperChecked: true,
        sampleType: "boundary_stone",
        detectedDamage: "Irrigation canal marker matches Survey 412/A"
      },
      {
        id: 5,
        label: "Undamaged Comparison",
        url: "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=1000&q=80",
        timestamp: "14:32:00 IST",
        date: "16 Oct 2026",
        gps: "17.9695° N, 79.5948° E",
        accuracyMeters: 4.0,
        tamperChecked: true,
        sampleType: "control_plot",
        detectedDamage: "Adjacent sheltered plot intact (baseline healthy)"
      }
    ]
  },
  {
    id: "FP-2043",
    farmerName: "Srinivas Rao",
    phone: "9440182931",
    aadhaar: "XXXX-XXXX-3190",
    bankAccount: "2094810293",
    bankName: "Andhra Bank (Parkal)",
    policyNumber: "PMFBY/TS/WR/2026/89403",
    village: "Parkal",
    district: "Warangal Rural",
    state: "Telangana",
    surveyNumber: "108/B",
    plotSize: "0.8 ha",
    crop: "Cotton",
    cause: "Flood",
    aiDamage: "Moderate",
    aiConfidence: 78,
    damagePercentage: 45,
    weatherMatch: "Match",
    weatherDetails: "Heavy rain 62mm recorded on 15 Oct",
    weatherStats: {
      recordedRainMm: 62.4,
      maxWindKmh: 38.0,
      historicalMeanRainMm: 4.2,
      hailRadarDetected: false
    },
    priority: "Review",
    suggestedAction: "Review remotely: Clear waterlogging pattern",
    status: "Under Review",
    submissionTime: "16 Oct, 11:15",
    photosCount: 5,
    gpsLocked: true,
    lat: 18.1964,
    lng: 79.7042,
    estimatedPayoutInr: 22000,
    payoutStatus: "Pending",
    officerNotes: "Waterlogged furrows verified remotely; roots show submerged stress.",
    photos: [
      {
        id: 1,
        label: "Wide Plot View",
        url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80",
        timestamp: "11:10:00 IST",
        date: "16 Oct 2026",
        gps: "18.1964° N, 79.7042° E",
        accuracyMeters: 3.4,
        tamperChecked: true
      },
      {
        id: 2,
        label: "Close-up of Damaged Leaves",
        url: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1000&q=80",
        timestamp: "11:11:15 IST",
        date: "16 Oct 2026",
        gps: "18.1965° N, 79.7043° E",
        accuracyMeters: 2.9,
        tamperChecked: true
      },
      {
        id: 3,
        label: "Plant Count Sample",
        url: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1000&q=80",
        timestamp: "11:12:30 IST",
        date: "16 Oct 2026",
        gps: "18.1963° N, 79.7040° E",
        accuracyMeters: 3.1,
        tamperChecked: true
      },
      {
        id: 4,
        label: "Boundary & Landmark",
        url: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1000&q=80",
        timestamp: "11:13:45 IST",
        date: "16 Oct 2026",
        gps: "18.1960° N, 79.7038° E",
        accuracyMeters: 3.6,
        tamperChecked: true
      },
      {
        id: 5,
        label: "Undamaged Comparison",
        url: "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=1000&q=80",
        timestamp: "11:14:50 IST",
        date: "16 Oct 2026",
        gps: "18.1970° N, 79.7048° E",
        accuracyMeters: 4.2,
        tamperChecked: true
      }
    ]
  },
  {
    id: "FP-2047",
    farmerName: "Anjaiah B.",
    phone: "9849201948",
    aadhaar: "XXXX-XXXX-9182",
    bankAccount: "1098492810",
    bankName: "Telangana Grameena Bank",
    policyNumber: "PMFBY/TS/WR/2026/89407",
    village: "Geesugonda",
    district: "Warangal Rural",
    state: "Telangana",
    surveyNumber: "219/C",
    plotSize: "2.1 ha",
    crop: "Paddy (Kharif)",
    cause: "Hail",
    aiDamage: "Severe",
    aiConfidence: 91,
    damagePercentage: 88,
    weatherMatch: "Match",
    weatherDetails: "Hailstorm event recorded on 16 Oct",
    weatherStats: {
      recordedRainMm: 52.1,
      maxWindKmh: 49.0,
      historicalMeanRainMm: 3.0,
      hailRadarDetected: true
    },
    priority: "Verified",
    suggestedAction: "Auto-approve: High AI confidence & weather match",
    status: "Approved",
    submissionTime: "16 Oct, 09:40",
    photosCount: 5,
    gpsLocked: true,
    lat: 17.9234,
    lng: 79.6421,
    estimatedPayoutInr: 72000,
    payoutStatus: "Disbursed to Bank",
    officerNotes: "Auto-sanctioned DBT payout under high confidence protocol.",
    photos: [
      {
        id: 1,
        label: "Wide Plot View",
        url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80",
        timestamp: "09:35:10 IST",
        date: "16 Oct 2026",
        gps: "17.9234° N, 79.6421° E",
        accuracyMeters: 3.1,
        tamperChecked: true
      },
      {
        id: 2,
        label: "Close-up of Damaged Leaves",
        url: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1000&q=80",
        timestamp: "09:36:20 IST",
        date: "16 Oct 2026",
        gps: "17.9235° N, 79.6422° E",
        accuracyMeters: 2.7,
        tamperChecked: true
      },
      {
        id: 3,
        label: "Plant Count Sample",
        url: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1000&q=80",
        timestamp: "09:37:35 IST",
        date: "16 Oct 2026",
        gps: "17.9233° N, 79.6420° E",
        accuracyMeters: 3.2,
        tamperChecked: true
      },
      {
        id: 4,
        label: "Boundary & Landmark",
        url: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1000&q=80",
        timestamp: "09:38:40 IST",
        date: "16 Oct 2026",
        gps: "17.9230° N, 79.6418° E",
        accuracyMeters: 3.7,
        tamperChecked: true
      },
      {
        id: 5,
        label: "Undamaged Comparison",
        url: "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=1000&q=80",
        timestamp: "09:39:50 IST",
        date: "16 Oct 2026",
        gps: "17.9240° N, 79.6425° E",
        accuracyMeters: 4.1,
        tamperChecked: true
      }
    ]
  },
  {
    id: "FP-2050",
    farmerName: "Laxmi M.",
    phone: "9128391048",
    aadhaar: "XXXX-XXXX-5521",
    bankAccount: "4920194821",
    bankName: "State Bank of India (Atmakur)",
    policyNumber: "PMFBY/TS/WR/2026/89410",
    village: "Atmakur",
    district: "Warangal Rural",
    state: "Telangana",
    surveyNumber: "84/1",
    plotSize: "1.5 ha",
    crop: "Maize",
    cause: "Drought",
    aiDamage: "Low",
    aiConfidence: 61,
    damagePercentage: 20,
    weatherMatch: "No match",
    weatherDetails: "No extreme heat/drought index trigger found for date",
    weatherStats: {
      recordedRainMm: 0.0,
      maxWindKmh: 18.0,
      historicalMeanRainMm: 2.5,
      hailRadarDetected: false
    },
    priority: "Visit",
    suggestedAction: "Visit: Integrity low & weather unsupported",
    status: "Flagged",
    submissionTime: "15 Oct, 16:20",
    photosCount: 4,
    gpsLocked: false,
    lat: 18.1294,
    lng: 79.6105,
    estimatedPayoutInr: 12000,
    payoutStatus: "Pending",
    officerNotes: "Surveyor inspection required: only 4 photos submitted and drought condition uncorroborated.",
    photos: [
      {
        id: 1,
        label: "Wide Plot View",
        url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80",
        timestamp: "16:15:00 IST",
        date: "15 Oct 2026",
        gps: "18.1294° N, 79.6105° E",
        accuracyMeters: 14.2,
        tamperChecked: false
      },
      {
        id: 2,
        label: "Close-up of Damaged Leaves",
        url: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1000&q=80",
        timestamp: "16:16:20 IST",
        date: "15 Oct 2026",
        gps: "18.1296° N, 79.6107° E",
        accuracyMeters: 12.0,
        tamperChecked: false
      },
      {
        id: 3,
        label: "Plant Count Sample",
        url: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1000&q=80",
        timestamp: "16:17:45 IST",
        date: "15 Oct 2026",
        gps: "18.1290° N, 79.6103° E",
        accuracyMeters: 15.1,
        tamperChecked: false
      },
      {
        id: 4,
        label: "Boundary & Landmark",
        url: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1000&q=80",
        timestamp: "16:19:10 IST",
        date: "15 Oct 2026",
        gps: "18.1288° N, 79.6100° E",
        accuracyMeters: 16.5,
        tamperChecked: false
      }
    ]
  }
];
