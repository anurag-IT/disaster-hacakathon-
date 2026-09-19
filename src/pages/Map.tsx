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
  onRequestLocation: () => void;
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
      className="flex flex-col h-full w-full flex-1 min-h-0 overflow-hidden relative select-none"
      style={{ height: '100%', width: '100%' }}
    >
      {/* Top Map Header & Filter Chips */}
      <div className="bg-stone-900 text-stone-100 px-3 py-2 border-b border-stone-800 shrink-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
            <span className="font-bold text-xs truncate">
              {MAP_CONFIG.areaNameNe}
            </span>
          </div>
          <span className="text-[10px] font-mono text-stone-400 shrink-0">
            प्रत्यक्ष उद्धार नक्सा
          </span>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-[11px]">
          <button
            id="filter-all"
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-0.5 rounded-full whitespace-nowrap transition-colors ${
              filterType === 'ALL'
                ? 'bg-red-600 text-white font-bold'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            सबै (All)
          </button>
          <button
            id="filter-safe"
            onClick={() => setFilterType('SAFE_ZONE')}
            className={`px-2.5 py-0.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
              filterType === 'SAFE_ZONE'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <span>🛡️</span>
            <span>सुरक्षित आश्रय</span>
          </button>
          <button
            id="filter-flood"
            onClick={() => setFilterType('FLOOD')}
            className={`px-2.5 py-0.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
              filterType === 'FLOOD'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <span>🌊</span>
            <span>बाढी क्षेत्र</span>
          </button>
          <button
            id="filter-medical"
            onClick={() => setFilterType('MEDICAL_POST')}
            className={`px-2.5 py-0.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
              filterType === 'MEDICAL_POST'
                ? 'bg-blue-600 text-white font-bold'
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
        className="flex-1 min-h-0 relative w-full h-full flex flex-col overflow-hidden"
        style={{ height: '100%', width: '100%', minHeight: '350px' }}
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
        <div className="absolute bottom-20 left-3 right-3 z-[990] pointer-events-none flex justify-center">
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

        {/* Quick Report Emergency floating button over map */}
        <div className="absolute bottom-4 left-3 right-3 z-[990] max-w-sm mx-auto">
          <button
            id="btn-map-quick-report"
            onClick={onNavigateReport}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 px-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wide border-2 border-white/20 active:scale-98 transition-all cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>REPORT EMERGENCY (मद्दत चाहिन्छ)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
