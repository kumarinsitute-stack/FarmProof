/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * FarmProof RealLeafletMap Component
 * Supports both Single Cadastral Plot view and Multi-Claim Geographical Cluster view
 * with OpenStreetMap compliance and distinct status markers.
 */

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Claim } from "../types";

interface RealLeafletMapProps {
  // Single location mode
  lat?: number;
  lng?: number;
  accuracy?: number;
  interactive?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
  // Multi-claim mode
  claims?: Claim[];
  selectedClaimId?: string;
  onSelectClaim?: (claim: Claim) => void;
  height?: string;
  className?: string;
}

export const RealLeafletMap: React.FC<RealLeafletMapProps> = ({
  lat = 17.9689,
  lng = 79.5941,
  accuracy = 12,
  interactive = true,
  onLocationChange,
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

    // Sanitize initial coordinates
    const initialLat =
      typeof lat === "number" && !isNaN(lat) && lat >= -90 && lat <= 90
        ? lat
        : 17.9689;
    const initialLng =
      typeof lng === "number" && !isNaN(lng) && lng >= -180 && lng <= 180
        ? lng
        : 79.5941;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: claims && claims.length > 1 ? 12 : 16,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: false,
      attributionControl: true, // Comply with OpenStreetMap tile usage requirements
    });

    // OpenStreetMap Standard Tiles with proper attribution
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

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

        // Filter invalid or zero coordinates
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

        // Color by status
        let pinColor = "#3b82f6"; // default blue (Submitted / Under Review)
        if (claim.status === "Approved")
          pinColor = "#10b981"; // emerald
        else if (
          claim.status === "Survey Assigned" ||
          claim.status === "Survey in Progress" ||
          claim.status === "Survey Completed"
        )
          pinColor = "#f59e0b"; // amber
        else if (claim.status === "Correction Required")
          pinColor = "#8b5cf6"; // purple
        else if (claim.status === "Rejected") pinColor = "#ef4444"; // red

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

        // Bind informative popup
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

      // Fit bounds if multiple points exist
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
    else {
      const validLat =
        typeof lat === "number" && !isNaN(lat) && lat >= -90 && lat <= 90
          ? lat
          : 17.9689;
      const validLng =
        typeof lng === "number" && !isNaN(lng) && lng >= -180 && lng <= 180
          ? lng
          : 79.5941;

      // Cadastral plot polygon around coordinates (approx 1.2 ha)
      const deltaLat = 0.0006;
      const deltaLng = 0.0009;
      const plotPolygonCoords: [number, number][] = [
        [validLat - deltaLat * 0.7, validLng - deltaLng * 0.8],
        [validLat - deltaLat * 0.5, validLng + deltaLng * 0.9],
        [validLat + deltaLat * 0.8, validLng + deltaLng * 0.7],
        [validLat + deltaLat * 0.6, validLng - deltaLng * 0.7],
      ];

      const polygon = L.polygon(plotPolygonCoords, {
        color: "#16a34a",
        fillColor: "#22c55e",
        fillOpacity: 0.28,
        weight: 2.5,
        dashArray: "4, 4",
      }).addTo(markersLayer);
      polygonRef.current = polygon;

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
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: rgba(239, 68, 68, 0.3); animation: ping 1.5s infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([validLat, validLng], {
        icon: customPinIcon,
        draggable: interactive && Boolean(onLocationChange),
      }).addTo(markersLayer);
      singleMarkerRef.current = marker;

      if (interactive && onLocationChange) {
        marker.on("dragend", (e) => {
          const newPos = e.target.getLatLng();
          onLocationChange(
            Number(newPos.lat.toFixed(4)),
            Number(newPos.lng.toFixed(4)),
          );
        });

        map.on("click", (e) => {
          marker.setLatLng(e.latlng);
          circle.setLatLng(e.latlng);
          onLocationChange(
            Number(e.latlng.lat.toFixed(4)),
            Number(e.latlng.lng.toFixed(4)),
          );
        });
      }

      map.panTo([validLat, validLng]);
    }
  }, [claims, selectedClaimId, lat, lng, accuracy]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-300 shadow-xs ${height} ${className}`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Overlay Badge */}
      <div className="absolute top-2 left-2 z-20 bg-white/95 backdrop-blur-xs border border-slate-300 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold text-slate-800 shadow-xs flex items-center gap-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
        <span>
          {claims && claims.length > 0
            ? `Cadastral Plot Grid (${claims.length} Intimations Plotted)`
            : `Cadastre: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E (±${accuracy}m)`}
        </span>
      </div>

      <div className="absolute bottom-6 right-2 z-20 bg-slate-900/90 text-white px-2 py-0.5 rounded text-[9px] font-bold font-mono shadow-xs pointer-events-none">
        OpenStreetMap Standard
      </div>
    </div>
  );
};
