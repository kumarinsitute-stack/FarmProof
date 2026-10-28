/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * FarmProof RealLeafletMap Component
 * Supports both Single Cadastral Plot view and Multi-Claim Geographical Cluster view
 * with OpenStreetMap compliance, accurate cadastral boundaries, and distinct status markers.
 */

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Claim } from "../types";
import { MapPinOff } from "lucide-react";

interface RealLeafletMapProps {
  // Single location mode
  lat?: number | null;
  lng?: number | null;
  accuracy?: number;
  interactive?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
  boundaryCoords?: [number, number][] | null;
  hasBoundaryPolygon?: boolean;
  markerInfo?: {
    farmerName?: string;
    surveyNumber?: string;
    policyNumber?: string;
    village?: string;
    crop?: string;
  };
  noCoordinates?: boolean;
  // Multi-claim mode
  claims?: Claim[];
  selectedClaimId?: string;
  onSelectClaim?: (claim: Claim) => void;
  height?: string;
  className?: string;
}

export const RealLeafletMap: React.FC<RealLeafletMapProps> = ({
  lat,
  lng,
  accuracy = 12,
  interactive = true,
  onLocationChange,
  boundaryCoords,
  hasBoundaryPolygon,
  markerInfo,
  noCoordinates = false,
  claims,
  selectedClaimId,
  onSelectClaim,
  height = "h-52",
  className = "",
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const singleMarkerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Check coordinate validity
  const isMultiMode = Boolean(claims && claims.length > 0);
  const hasValidSingleCoords =
    !noCoordinates &&
    typeof lat === "number" &&
    !isNaN(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === "number" &&
    !isNaN(lng) &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0);

  // Setup Leaflet icon defaults
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!isMultiMode && !hasValidSingleCoords) return;

    const initialLat = hasValidSingleCoords && lat ? lat : 17.9689;
    const initialLng = hasValidSingleCoords && lng ? lng : 79.5941;

    // Destroy existing instance before creating a new one if needed
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: isMultiMode ? 12 : 16,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    // OpenStreetMap Standard Tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isMultiMode, hasValidSingleCoords]);

  // Render Markers for Multi-Claims Mode or Single Cadastral Plot
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // Mode A: Multi-Claims Display
    if (claims && claims.length > 0) {
      const validPoints: [number, number][] = [];

      claims.forEach((claim) => {
        const cLat = Number(claim.lat);
        const cLng = Number(claim.lng);

        if (
          isNaN(cLat) ||
          isNaN(cLng) ||
          (cLat === 0 && cLng === 0) ||
          cLat < -90 ||
          cLat > 90 ||
          cLng < -180 ||
          cLng > 180
        ) {
          return;
        }

        validPoints.push([cLat, cLng]);

        let pinColor = "#3b82f6";
        if (claim.status === "Approved") pinColor = "#10b981";
        else if (
          claim.status === "Survey Assigned" ||
          claim.status === "Survey in Progress" ||
          claim.status === "Survey Completed"
        )
          pinColor = "#f59e0b";
        else if (claim.status === "Correction Required") pinColor = "#8b5cf6";
        else if (claim.status === "Rejected") pinColor = "#ef4444";

        const isSelected = claim.id === selectedClaimId;

        const customHtml = `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${isSelected ? `<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${pinColor}; opacity: 0.35; animation: ping 1.5s infinite;"></div>` : ""}
            <div style="width: ${isSelected ? "20px" : "15px"}; height: ${isSelected ? "20px" : "15px"}; border-radius: 50%; background: ${pinColor}; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
          </div>
        `;

        const icon = L.divIcon({
          className: "custom-claim-marker",
          html: customHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([cLat, cLng], { icon }).addTo(markersLayer);

        const popupContent = document.createElement("div");
        popupContent.className = "text-xs p-1 space-y-1 font-sans";
        popupContent.innerHTML = `
          <div class="font-bold text-slate-900 border-b pb-1 flex items-center justify-between gap-2">
            <span>${claim.id}</span>
            <span style="color: ${pinColor};" class="font-bold uppercase text-[10px]">${claim.status}</span>
          </div>
          <div class="text-slate-600"><strong>Farmer:</strong> ${claim.farmerName}</div>
          <div class="text-slate-600"><strong>Village:</strong> ${claim.village} (Sy. ${claim.surveyNumber})</div>
          <div class="text-slate-600"><strong>Crop:</strong> ${claim.crop} (${claim.cause})</div>
          <div class="text-[10px] text-slate-400 font-mono">${cLat.toFixed(4)}°N, ${cLng.toFixed(4)}°E</div>
          <button id="view-claim-btn-${claim.id}" class="mt-1.5 w-full bg-slate-800 text-white text-[11px] font-semibold py-1 px-2 rounded hover:bg-slate-900 transition">
            Inspect Claim Dossier
          </button>
        `;

        marker.bindPopup(popupContent);

        marker.on("popupopen", () => {
          const btn = document.getElementById(`view-claim-btn-${claim.id}`);
          if (btn && onSelectClaim) {
            btn.onclick = () => {
              onSelectClaim(claim);
              marker.closePopup();
            };
          }
        });

        marker.on("click", () => {
          if (onSelectClaim) onSelectClaim(claim);
        });
      });

      if (validPoints.length > 1) {
        try {
          const bounds = L.latLngBounds(validPoints);
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
        } catch {}
      } else if (validPoints.length === 1) {
        map.setView(validPoints[0], 14);
      }
    }
    // Mode B: Single Cadastral Plot
    else if (hasValidSingleCoords && typeof lat === "number" && typeof lng === "number") {
      const validLat = lat;
      const validLng = lng;

      // CRITICAL DATA INTEGRITY RULE:
      // Only draw a polygon if boundaryCoordinates is provided with at least 3 points!
      // Do NOT invent or fabricate boundary coordinates around arbitrary locations!
      const hasRealPolygon =
        Array.isArray(boundaryCoords) &&
        boundaryCoords.length >= 3 &&
        boundaryCoords.every(
          (pt) =>
            Array.isArray(pt) &&
            typeof pt[0] === "number" &&
            typeof pt[1] === "number" &&
            !isNaN(pt[0]) &&
            !isNaN(pt[1])
        );

      if (hasRealPolygon && boundaryCoords) {
        const polygon = L.polygon(boundaryCoords, {
          color: "#16a34a",
          fillColor: "#22c55e",
          fillOpacity: 0.28,
          weight: 2.5,
          dashArray: "4, 4",
        }).addTo(markersLayer);
        polygonRef.current = polygon;

        try {
          const polyBounds = polygon.getBounds();
          map.fitBounds(polyBounds, { padding: [25, 25], maxZoom: 17 });
        } catch {
          map.panTo([validLat, validLng]);
        }
      } else {
        polygonRef.current = null;
        map.panTo([validLat, validLng]);
      }

      // Accuracy Circle
      const circle = L.circle([validLat, validLng], {
        radius: Math.max(5, accuracy),
        color: "#0284c7",
        fillColor: "#38bdf8",
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(markersLayer);
      circleRef.current = circle;

      // Pin icon
      const customPinIcon = L.divIcon({
        className: "custom-leaflet-pin",
        html: `
          <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: ping 1.5s infinite;"></div>
            <div style="width: 15px; height: 15px; border-radius: 50%; background: #059669; border: 2.5px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.35);"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([validLat, validLng], {
        icon: customPinIcon,
        draggable: interactive && Boolean(onLocationChange),
      }).addTo(markersLayer);
      singleMarkerRef.current = marker;

      // Interactive popup with survey & farmer details
      const popupHtml = `
        <div class="text-xs p-1 space-y-1 font-sans">
          <div class="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between gap-2">
            <span>${markerInfo?.surveyNumber ? `Survey ${markerInfo.surveyNumber}` : "Registered Plot"}</span>
            <span class="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              ${hasRealPolygon ? "Cadastre Boundary Digitized" : "GPS Point Only"}
            </span>
          </div>
          ${markerInfo?.farmerName ? `<div class="text-slate-700 font-semibold">${markerInfo.farmerName}</div>` : ""}
          ${markerInfo?.crop ? `<div class="text-slate-600"><strong>Crop:</strong> ${markerInfo.crop}</div>` : ""}
          ${markerInfo?.village ? `<div class="text-slate-600"><strong>Village:</strong> ${markerInfo.village}</div>` : ""}
          ${markerInfo?.policyNumber ? `<div class="text-slate-500 font-mono text-[10px]">Policy: ${markerInfo.policyNumber}</div>` : ""}
          <div class="text-[10px] text-slate-400 font-mono pt-0.5 border-t border-slate-100">
            GPS: ${validLat.toFixed(4)}°N, ${validLng.toFixed(4)}°E (±${accuracy}m)
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      if (interactive && onLocationChange) {
        marker.on("dragend", (e) => {
          const newPos = e.target.getLatLng();
          onLocationChange(
            Number(newPos.lat.toFixed(4)),
            Number(newPos.lng.toFixed(4))
          );
        });

        map.on("click", (e) => {
          marker.setLatLng(e.latlng);
          circle.setLatLng(e.latlng);
          onLocationChange(
            Number(e.latlng.lat.toFixed(4)),
            Number(e.latlng.lng.toFixed(4))
          );
        });
      }
    }
  }, [claims, selectedClaimId, lat, lng, accuracy, boundaryCoords, hasBoundaryPolygon, markerInfo, hasValidSingleCoords]);

  // Fallback state when coordinates are missing
  if (!isMultiMode && !hasValidSingleCoords) {
    return (
      <div
        className={`relative w-full rounded-2xl overflow-hidden border border-slate-300 bg-slate-50 shadow-xs flex flex-col items-center justify-center p-6 text-center ${height} ${className}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
          <MapPinOff className="w-6 h-6 text-amber-700" />
        </div>
        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
          GPS Coordinates Not Available in Land Record
        </h4>
        <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-relaxed">
          This cadastral parcel does not have digitized GPS coordinates or boundary geometry recorded on file. An on-ground cadastral survey is required to map this field.
        </p>
        <span className="mt-3 px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono font-semibold">
          Status: Unsurveyed Cadastral Record
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-300 shadow-xs ${height} ${className}`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Overlay Badge */}
      <div className="absolute top-2 left-2 z-20 bg-white/95 backdrop-blur-xs border border-slate-300 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold text-slate-800 shadow-xs flex items-center gap-1.5 pointer-events-none">
        <span className={`w-2 h-2 rounded-full ${hasBoundaryPolygon ? "bg-emerald-600 animate-pulse" : "bg-amber-500"}`} />
        <span>
          {claims && claims.length > 0
            ? `Cadastral Plot Grid (${claims.length} Intimations Plotted)`
            : hasBoundaryPolygon
            ? `Cadastral Boundary: Polygon Digitized (${lat?.toFixed(4)}°N, ${lng?.toFixed(4)}°E)`
            : `Cadastre: ${lat?.toFixed(4)}°N, ${lng?.toFixed(4)}°E (±${accuracy}m) • Polygon Unavailable`}
        </span>
      </div>

      <div className="absolute bottom-6 right-2 z-20 bg-slate-900/90 text-white px-2 py-0.5 rounded text-[9px] font-bold font-mono shadow-xs pointer-events-none">
        OpenStreetMap Standard
      </div>
    </div>
  );
};
