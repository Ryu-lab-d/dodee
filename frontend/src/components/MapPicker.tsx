'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker, Icon as LeafletIcon, LeafletMouseEvent } from 'leaflet';
import { Search, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018]; // Bangkok

// "13.7563, 100.5018" or "13.7563 100.5018" - user pasting a coordinate pair directly.
const COORD_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/;

interface SearchResult {
  displayName: string;
  lat: number;
  lng: number;
}

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
  const iconRef = useRef<LeafletIcon | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const jumpTo = async (nextLat: number, nextLng: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([nextLat, nextLng], 17);

    const L = await import('leaflet');
    if (markerRef.current) {
      markerRef.current.setLatLng([nextLat, nextLng]);
    } else if (iconRef.current) {
      markerRef.current = L.marker([nextLat, nextLng], { icon: iconRef.current, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng();
        onChange(pos.lat, pos.lng);
      });
    }
    onChange(nextLat, nextLng);
  };

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearchError(null);
    setResults([]);

    const coordMatch = q.match(COORD_PATTERN);
    if (coordMatch) {
      await jumpTo(Number(coordMatch[1]), Number(coordMatch[2]));
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=th&accept-language=th&q=${encodeURIComponent(q)}`,
      );
      if (!res.ok) throw new Error('ค้นหาไม่สำเร็จ');
      const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json();
      if (data.length === 0) {
        setSearchError('ไม่พบสถานที่ที่ค้นหา ลองใส่พิกัด (ละติจูด, ลองจิจูด) แทน');
      } else if (data.length === 1) {
        await jumpTo(Number(data[0].lat), Number(data[0].lon));
      } else {
        setResults(data.map((d) => ({ displayName: d.display_name, lat: Number(d.lat), lng: Number(d.lon) })));
      }
    } catch {
      setSearchError('ค้นหาไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSearching(false);
    }
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  };

  const pickResult = async (r: SearchResult) => {
    setResults([]);
    setQuery(r.displayName);
    await jumpTo(r.lat, r.lng);
  };

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
      iconRef.current = defaultIcon;

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
      {/* Not a <form>: this sits inside the property form's own <form>, and nested
          <form> elements are invalid HTML - the browser drops the inner one and the
          "search" button ends up submitting the outer property form instead (looks
          like the whole page just reloads). Enter-to-search and the button's onClick
          call the same handler directly instead. */}
      <div className="relative mb-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="ค้นหาชื่อหมู่บ้าน/สถานที่ หรือใส่พิกัด เช่น 13.7563, 100.5018"
            className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {results.length > 0 && (
            <div className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickResult(r)}
                  className="block w-full border-b border-slate-50 px-3 py-2 text-left text-xs text-slate-600 last:border-0 hover:bg-blue-50"
                >
                  {r.displayName}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={searching}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          ค้นหา
        </button>
      </div>
      {searchError && <p className="mb-2 text-xs text-red-600">{searchError}</p>}

      <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-xl border border-slate-200" />
      <p className="mt-1 text-xs text-slate-400">
        ค้นหาชื่อสถานที่หรือใส่พิกัดด้านบน หรือคลิกบนแผนที่เพื่อปักหมุดตำแหน่งทรัพย์สิน (ลากหมุดเพื่อขยับได้)
      </p>
    </div>
  );
}
