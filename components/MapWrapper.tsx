"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los íconos de Leaflet en Next.js
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapWrapperProps {
  lat: number;
  lng: number;
  popupTitle?: string;
  popupSubtitle?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
  showMarker?: boolean;
  zoom?: number;
  flyToCoords?: [number, number] | null;
}

function LocationPicker({ onLocationSelect }: { onLocationSelect?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

function MapUpdater({ flyToCoords, zoom }: { flyToCoords?: [number, number] | null, zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (flyToCoords && flyToCoords.length === 2) {
      map.flyTo(flyToCoords, zoom || map.getZoom(), { duration: 1.5 });
    }
  }, [flyToCoords?.[0], flyToCoords?.[1], zoom, map]); // Destructure coordinates to keep dependency array size constant
  return null;
}

export default function MapWrapper({ lat, lng, popupTitle, popupSubtitle, onLocationSelect, showMarker = true, zoom, flyToCoords }: MapWrapperProps) {
  return (
    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-[#4b934e]/30 shadow-inner z-0 cursor-crosshair">
      <MapContainer
        center={[lat, lng]}
        zoom={zoom || 12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater flyToCoords={flyToCoords} zoom={zoom} />
        <LocationPicker onLocationSelect={onLocationSelect} />
        {showMarker && (
          <Marker position={[lat, lng]}>
            {(popupTitle || popupSubtitle) && (
              <Popup>
                <div className="text-center">
                  {popupTitle && <strong className="block text-[#090d16] text-sm">{popupTitle}</strong>}
                  {popupSubtitle && <span className="block text-slate-500 text-xs mt-1">{popupSubtitle}</span>}
                </div>
              </Popup>
            )}
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
