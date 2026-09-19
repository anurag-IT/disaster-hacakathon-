import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ChevronRight,
  Phone,
  Maximize2,
  Shield,
  Navigation,
  LifeBuoy,
} from 'lucide-react';
import { EmergencyBanner } from '../components/EmergencyBanner';
import { EmergencyButton } from '../components/EmergencyButton';
import { LocationMap } from '../components/LocationMap';
import { EmergencyStatus, IncidentRecord } from '../types/emergency';
import { CitizenLocation, FloodZoneOverlay, EmergencyPoint } from '../types/location';
import { emergencyService } from '../services/emergencyService';

interface HomeProps {
  status: EmergencyStatus;
  location: CitizenLocation | null;
  onNavigate: (tab: 'HOME' | 'MAP' | 'REPORT' | 'SAFETY' | 'STATUS') => void;
  onToggleDemoEmergency?: (active: boolean) => void;
  onRequestLocation: () => Promise<CitizenLocation | void> | CitizenLocation | void;
  latestIncident?: IncidentRecord | null;
}

export const Home: React.FC<HomeProps> = ({
  status,
  location,
  onNavigate,
  onToggleDemoEmergency,
  onRequestLocation,
  latestIncident,
}) => {
  const [zones, setZones] = useState<FloodZoneOverlay[]>([]);
  const [points, setPoints] = useState<EmergencyPoint[]>([]);
  const [nearestShelter, setNearestShelter] = useState<{
    point: EmergencyPoint;
    distanceMeters: number;
  } | null>(null);

  useEffect(() => {
    emergencyService.getPublicEmergencyZones().then((res) => {
      setZones(res.zones);
      setPoints(res.points);
    });
  }, []);

  // Compute nearest shelter
  useEffect(() => {
    if (!location || points.length === 0) return;
    const shelters = points.filter((p) => p.type === 'SAFE_ZONE' || p.type === 'RELIEF_POINT');
    if (shelters.length === 0) return;

    let closest = shelters[0];
    let minD = Infinity;

    for (const s of shelters) {
      const dLat = ((s.lat - location.latitude) * Math.PI) / 180;
      const dLon = ((s.lng - location.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((location.latitude * Math.PI) / 180) *
          Math.cos((s.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const dist = 6371e3 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist < minD) {
        minD = dist;
        closest = s;
      }
    }

    setNearestShelter({ point: closest, distanceMeters: Math.round(minD) });
  }, [location, points]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] pb-12">
      {/* Emergency State Banner (Status Normal or Flood Emergency Active) */}
      <EmergencyBanner
        status={status}
        onToggleDemoEmergency={onToggleDemoEmergency}
      />

      <div className="max-w-md mx-auto w-full px-4 pt-4 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Recent Active Incident Pill (if citizen already submitted an incident) */}
          {latestIncident && (
            <div
              onClick={() => onNavigate('STATUS')}
              className="bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/50 p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <div>
                  <div className="text-[11px] font-mono uppercase text-amber-900 font-bold">
                    सक्रिय रिपोर्ट (Active Report)
                  </div>
                  <div className="text-sm font-extrabold text-amber-950 font-mono">
                    {latestIncident.incident_number} — {latestIncident.status}
                  </div>
                </div>
              </div>
              <div className="text-xs font-semibold text-amber-800 flex items-center">
                हेर्नुहोस् <ChevronRight className="w-4 h-4 ml-0.5" />
              </div>
            </div>
          )}

          {/* PRIMARY ACTION: REPORT EMERGENCY SOS BUTTON */}
          <div className="pt-0.5">
            <EmergencyButton
              onClick={() => onNavigate('REPORT')}
              isEmergencyActive={status.active}
            />
          </div>

          {/* REAL INTERACTIVE MAP PREVIEW CARD (Clean, uncluttered) */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                  प्रत्यक्ष बाढी नक्सा (Live Flood Map)
                </span>
              </div>
              <button
                id="btn-home-expand-map"
                onClick={() => onNavigate('MAP')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <span>पूर्ण नक्सा</span>
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Map Canvas (Clean preview mode) */}
            <LocationMap
              currentLocation={location}
              onRequestLocation={onRequestLocation}
              zones={zones}
              points={points}
              variant="preview"
              interactive={true}
              showExpandButton={false}
              onOpenFullMap={() => onNavigate('MAP')}
            />

            {/* Map Footer: Sleek Scannable Legend Strip */}
            <div className="px-3 py-2 bg-stone-50/70 border-t border-stone-200 text-[11px] text-stone-600 flex flex-wrap items-center justify-between gap-y-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>बाढी</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>जोखिम</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>आश्रय</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>तपाईं</span>
                </span>
              </div>

              <button
                onClick={onRequestLocation}
                className="text-blue-600 hover:underline font-medium text-[11px]"
              >
                GPS रिफ्रेस
              </button>
            </div>

            {/* Nearest Safe Shelter Row (Clear & spacious) */}
            {nearestShelter && (
              <div
                onClick={() => onNavigate('MAP')}
                className="px-3 py-2.5 bg-emerald-50/80 border-t border-emerald-100 flex items-center justify-between cursor-pointer hover:bg-emerald-100/70 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="truncate">
                    <div className="text-[10px] uppercase font-bold text-emerald-800">
                      नजिकको सुरक्षित आश्रय
                    </div>
                    <div className="text-xs font-bold text-emerald-950 truncate">
                      {nearestShelter.point.nameNe}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full font-mono">
                    {nearestShelter.distanceMeters >= 1000
                      ? `${(nearestShelter.distanceMeters / 1000).toFixed(1)} km`
                      : `${nearestShelter.distanceMeters} m`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-emerald-700" />
                </div>
              </div>
            )}
          </div>

          {/* TWO PRIMARY ESSENTIAL ACTION TILES */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="btn-home-shelters"
              onClick={() => onNavigate('MAP')}
              className="p-3 bg-white hover:bg-stone-50 rounded-2xl border border-stone-200 shadow-2xs flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900">
                  सुरक्षित आश्रय स्थलहरू
                </div>
                <div className="text-[10px] text-stone-500 font-medium">
                  राहत केन्द्र तथा शिविर नक्सा
                </div>
              </div>
            </button>

            <button
              id="btn-home-safety-info"
              onClick={() => onNavigate('SAFETY')}
              className="p-3 bg-white hover:bg-stone-50 rounded-2xl border border-stone-200 shadow-2xs flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900">
                  सुरक्षा तथा उद्धार गाइड
                </div>
                <div className="text-[10px] text-stone-500 font-medium">
                  बाढीमा बाँच्ने जरूरी उपायहरू
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Emergency Hotlines Strip (Nepal National Disaster Contacts) */}
        <div className="mt-3 pt-3 border-t border-stone-200 text-center">
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">
            आपतकालीन सिधा सम्पर्क (Emergency Call)
          </div>
          <div className="grid grid-cols-4 gap-2">
            <a
              id="btn-call-police"
              href="tel:100"
              className="py-1.5 px-1 bg-white hover:bg-stone-50 rounded-xl border border-stone-200 shadow-2xs flex flex-col items-center justify-center transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-blue-600 mb-0.5" />
              <span className="text-xs font-black text-stone-900">100</span>
              <span className="text-[9px] text-stone-500">प्रहरी</span>
            </a>

            <a
              id="btn-call-fire"
              href="tel:101"
              className="py-1.5 px-1 bg-white hover:bg-stone-50 rounded-xl border border-stone-200 shadow-2xs flex flex-col items-center justify-center transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-red-600 mb-0.5" />
              <span className="text-xs font-black text-stone-900">101</span>
              <span className="text-[9px] text-stone-500">दमकल</span>
            </a>

            <a
              id="btn-call-ambulance"
              href="tel:102"
              className="py-1.5 px-1 bg-white hover:bg-stone-50 rounded-xl border border-stone-200 shadow-2xs flex flex-col items-center justify-center transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600 mb-0.5" />
              <span className="text-xs font-black text-stone-900">102</span>
              <span className="text-[9px] text-stone-500">एम्बुलेन्स</span>
            </a>

            <a
              id="btn-call-flood-hotline"
              href="tel:1155"
              className="py-1.5 px-1 bg-white hover:bg-stone-50 rounded-xl border border-stone-200 shadow-2xs flex flex-col items-center justify-center transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-amber-600 mb-0.5" />
              <span className="text-xs font-black text-stone-900">1155</span>
              <span className="text-[9px] text-stone-500">बाढी सूचना</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
