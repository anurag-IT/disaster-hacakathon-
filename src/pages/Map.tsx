import React, { useState, useEffect } from 'react';
import { LocationMap } from '../components/LocationMap';
import { CitizenLocation, FloodZoneOverlay, EmergencyPoint } from '../types/location';
import { emergencyService } from '../services/emergencyService';
import { MAP_CONFIG } from '../config/mapConfig';
import {
  AlertOctagon,
  Shield,
  Filter,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from 'lucide-react';

interface MapPageProps {
  location: CitizenLocation | null;
  onRequestLocation: () => Promise<CitizenLocation | void> | CitizenLocation | void;
  onNavigateReport: () => void;
}

export const MapPage: React.FC<MapPageProps> = ({
  location,
  onRequestLocation,
  onNavigateReport,
}) => {
  const [zones, setZones] = useState<FloodZoneOverlay[]>([]);
  const [points, setPoints] = useState<EmergencyPoint[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'SAFE_ZONE' | 'FLOOD' | 'MEDICAL_POST'>('ALL');

  useEffect(() => {
    emergencyService.getPublicEmergencyZones().then((res) => {
      setZones(res.zones);
      setPoints(res.points);
    });
  }, []);

  return (
    <div
      id="map-page-container"
      className="flex flex-col h-full w-full flex-1 min-h-0 overflow-hidden relative select-none bg-stone-100 px-2 pb-2 pt-2 rounded-[28px] border border-stone-200 shadow-lg shadow-stone-300/40 ring-1 ring-white/80"
      style={{ height: '100%', width: '100%', maxHeight: '72vh', minHeight: '420px' }}
    >
      {/* Top Map Header & Filter Chips */}
      <div className="bg-stone-950 text-stone-100 px-3 py-2 border border-stone-800 rounded-t-2xl rounded-b-xl shrink-0 z-10 shadow-lg shadow-stone-950/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 truncate">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
            <span className="font-bold text-[11px] tracking-wide truncate text-stone-100">
              {MAP_CONFIG.areaNameNe}
            </span>
          </div>
          <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-stone-400 shrink-0">
            Live
          </span>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-[10px]">
          <button
            id="filter-all"
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
              filterType === 'ALL'
                ? 'bg-red-600 text-white font-bold shadow-sm'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            सबै (All)
          </button>
          <button
            id="filter-safe"
            onClick={() => setFilterType('SAFE_ZONE')}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
              filterType === 'SAFE_ZONE'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <span>🛡️</span>
            <span>सुरक्षित आश्रय</span>
          </button>
          <button
            id="filter-flood"
            onClick={() => setFilterType('FLOOD')}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
              filterType === 'FLOOD'
                ? 'bg-amber-600 text-white font-bold shadow-sm'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <span>🌊</span>
            <span>बाढी क्षेत्र</span>
          </button>
          <button
            id="filter-medical"
            onClick={() => setFilterType('MEDICAL_POST')}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
              filterType === 'MEDICAL_POST'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <span>🏥</span>
            <span>स्वास्थ्य शिविर</span>
          </button>
        </div>
      </div>

      {/* Main Full-Height Leaflet Map */}
      <div
        id="map-canvas-wrapper"
        className="flex-1 min-h-0 relative w-full h-full flex flex-col overflow-hidden rounded-b-2xl rounded-t-none border border-stone-200 border-t-0 bg-white shadow-md shadow-stone-200/80"
        style={{ height: '100%', width: '100%', minHeight: '320px', maxHeight: '62vh' }}
      >
        <LocationMap
          currentLocation={location}
          onRequestLocation={onRequestLocation}
          zones={zones}
          points={points}
          variant="full"
          filterType={filterType}
          interactive={true}
          className="w-full h-full min-h-[350px]"
        />

        {/* Bottom Legend Pill Bar (Non-intrusive) */}
        <div className="absolute bottom-4 left-3 right-3 z-[990] pointer-events-none flex justify-center">
          <div className="pointer-events-auto bg-stone-900/90 backdrop-blur-md text-stone-200 px-3 py-1 rounded-full text-[10px] border border-stone-700 shadow-md flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> बाढी
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> सुरक्षित
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> तपाईं
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
