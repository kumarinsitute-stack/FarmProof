import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface RealLeafletMapProps {
  lat: number;
  lng: number;
  accuracy?: number;
  interactive?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

export const RealLeafletMap: React.FC<RealLeafletMapProps> = ({
  lat,
  lng,
  accuracy = 12,
  interactive = true,
  onLocationChange,
  height = 'h-48',
  className = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fix default marker icon assets in Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Custom pulse dot marker for Indian cadastral mapping
    const customPinIcon = L.divIcon({
      className: 'custom-leaflet-pin',
      html: `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: rgba(239, 68, 68, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #dc2626; border: 2.5px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: false,
      attributionControl: false
    });

    // OpenStreetMap high-contrast tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Cadastral plot polygon around Warangal coordinates (approx 1.2 ha)
    const deltaLat = 0.0006;
    const deltaLng = 0.0009;
    const plotPolygonCoords: [number, number][] = [
      [lat - deltaLat * 0.7, lng - deltaLng * 0.8],
      [lat - deltaLat * 0.5, lng + deltaLng * 0.9],
      [lat + deltaLat * 0.8, lng + deltaLng * 0.7],
      [lat + deltaLat * 0.6, lng - deltaLng * 0.7]
    ];

    const polygon = L.polygon(plotPolygonCoords, {
      color: '#16a34a',
      fillColor: '#22c55e',
      fillOpacity: 0.28,
      weight: 2.5,
      dashArray: '4, 4'
    }).addTo(map);
    polygonRef.current = polygon;

    // Accuracy Circle
    const circle = L.circle([lat, lng], {
      radius: accuracy,
      color: '#0284c7',
      fillColor: '#38bdf8',
      fillOpacity: 0.15,
      weight: 1
    }).addTo(map);
    circleRef.current = circle;

    // Draggable / clickable marker
    const marker = L.marker([lat, lng], {
      icon: customPinIcon,
      draggable: interactive
    }).addTo(map);
    markerRef.current = marker;

    if (interactive && onLocationChange) {
      marker.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        onLocationChange(Number(newPos.lat.toFixed(4)), Number(newPos.lng.toFixed(4)));
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
        onLocationChange(Number(e.latlng.lat.toFixed(4)), Number(e.latlng.lng.toFixed(4)));
      });
    }

    mapInstanceRef.current = map;

    // Invalidate map size after DOM settles
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update marker position when lat/lng change from outside
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      const newLatLng = new L.LatLng(lat, lng);
      markerRef.current.setLatLng(newLatLng);
      circleRef.current.setLatLng(newLatLng);
      mapInstanceRef.current.panTo(newLatLng);
    }
  }, [lat, lng]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-slate-300 shadow-xs ${height} ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Overlay Badge */}
      <div className="absolute top-2 left-2 z-20 bg-white/90 backdrop-blur-xs border border-slate-300 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold text-slate-800 shadow-xs flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
        <span>Warangal Cadastre: {lat.toFixed(4)}°N, {lng.toFixed(4)}°E (±{accuracy}m)</span>
      </div>

      <div className="absolute bottom-2 right-2 z-20 bg-emerald-800 text-white px-2 py-0.5 rounded text-[9px] font-bold font-mono shadow-xs">
        1.2 ha Survey Plot
      </div>
    </div>
  );
};
