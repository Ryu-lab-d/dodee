'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018]; // Bangkok

export default function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    // Leaflet touches `window` on import, so it must be loaded client-side only (not at SSR time).
    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;

      const defaultIcon = L.icon({
        iconUrl: markerIcon.src,
        iconRetinaUrl: markerIcon2x.src,
        shadowUrl: markerShadow.src,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const center: [number, number] = lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER;
      const map = L.map(containerRef.current).setView(center, lat != null ? 16 : 12);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const attachDrag = (marker: LeafletMarker) => {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChange(pos.lat, pos.lng);
        });
      };

      if (lat != null && lng != null) {
        markerRef.current = L.marker(center, { icon: defaultIcon, draggable: true }).addTo(map);
        attachDrag(markerRef.current);
      }

      map.on('click', (e: LeafletMouseEvent) => {
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else {
          markerRef.current = L.marker(e.latlng, { icon: defaultIcon, draggable: true }).addTo(map);
          attachDrag(markerRef.current);
        }
        onChange(e.latlng.lat, e.latlng.lng);
      });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-xl border border-slate-200" />
      <p className="mt-1 text-xs text-slate-400">คลิกบนแผนที่เพื่อปักหมุดตำแหน่งทรัพย์สิน (ลากหมุดเพื่อขยับได้)</p>
    </div>
  );
}
