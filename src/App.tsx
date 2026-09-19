import React, { useState, useEffect, useCallback } from 'react';
import {
  Home as HomeIcon,
  Map as MapIcon,
  AlertOctagon,
  ShieldCheck,
  Clock,
  Sliders,
  Sparkles,
  MapPin,
  RefreshCw,
  X,
} from 'lucide-react';
import { Home } from './pages/Home';
import { MapPage } from './pages/Map';
import { ReportEmergency } from './pages/ReportEmergency';
import { Safety } from './pages/Safety';
import { IncidentStatusPage } from './pages/IncidentStatus';
import { OfflineIndicator } from './components/OfflineIndicator';
import { EmergencyStatus, IncidentRecord } from './types/emergency';
import { CitizenLocation } from './types/location';
import { emergencyService } from './services/emergencyService';
import { locationService, DEMO_LOCATION } from './services/locationService';
import { offlineService } from './services/offlineService';
import { MAP_CONFIG } from './config/mapConfig';

export type NavigationTab = 'HOME' | 'MAP' | 'REPORT' | 'SAFETY' | 'STATUS';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('HOME');
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus>({
    active: true,
    type: 'FLOOD',
    message: 'Flood emergency has been activated in your area.',
    messageNe: 'तपाईंको क्षेत्रमा बाढी आपतकाल सक्रिय गरिएको छ। सतर्क रहनुहोस्।',
    affected_area: MAP_CONFIG.areaName,
    affected_area_ne: MAP_CONFIG.areaNameNe,
    updated_at: new Date().toISOString(),
  });

  const [citizenLocation, setCitizenLocation] = useState<CitizenLocation | null>(null);
  const [latestIncident, setLatestIncident] = useState<IncidentRecord | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Load initial location, emergency status, and active incidents
  const refreshEmergencyStatus = useCallback(async () => {
    try {
      const status = await emergencyService.getEmergencyStatus();
      setEmergencyStatus(status);
    } catch (err) {
      console.warn('Status error:', err);
    }
  }, []);

  const requestGpsLocation = useCallback(async () => {
    try {
      const loc = await locationService.requestLocation(false);
      setCitizenLocation(loc);
    } catch (err) {
      console.warn('Location request error:', err);
    }
  }, []);

  useEffect(() => {
    refreshEmergencyStatus();
    requestGpsLocation();

    // Subscribe to location changes
    const unsubLoc = locationService.subscribe((loc) => {
      setCitizenLocation(loc);
    });

    // Check previously submitted incidents
    const saved = emergencyService.getMySavedIncidents();
    if (saved.length > 0) {
      setLatestIncident(saved[0]);
    }

    return () => {
      unsubLoc();
    };
  }, [refreshEmergencyStatus, requestGpsLocation]);

  const handleToggleEmergency = async (active: boolean) => {
    const updated = await emergencyService.setDemoEmergencyStatus(active);
    setEmergencyStatus(updated);
  };

  const handleReportSubmitted = (incident: IncidentRecord) => {
    setLatestIncident(incident);
    setCurrentTab('STATUS');
  };

  return (
    <div
      className={`bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-red-500 selection:text-white ${
        currentTab === 'MAP' ? 'h-screen overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Offline Connectivity & Queue Banner */}
      <OfflineIndicator
        onSyncComplete={() => {
          const saved = emergencyService.getMySavedIncidents();
          if (saved.length > 0) {
            setLatestIncident(saved[0]);
          }
        }}
      />

      {/* Main Top Header */}
      <header className="bg-stone-950 text-white sticky top-0 z-40 border-b border-stone-800 shadow-md">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div
            onClick={() => setCurrentTab('HOME')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white font-extrabold shadow-sm">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight leading-none text-white">
                CITIZEN FLOOD EMERGENCY
              </div>
              <div className="text-[10px] text-stone-400 font-mono leading-tight mt-0.5">
                नागरिक आपतकालीन उद्धार (Nepal)
              </div>
            </div>
          </div>

          {/* Demo Control Trigger */}
          <button
            id="btn-open-demo-panel"
            onClick={() => setShowDemoModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold transition-colors cursor-pointer"
            title="Open Demo Panel for Hackathon testing"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>DEMO MODE</span>
          </button>
        </div>
      </header>

      {/* Main Screen Router */}
      <main
        className={`flex-1 w-full mx-auto ${
          currentTab === 'MAP'
            ? 'h-[calc(100dvh-56px-64px)] max-w-2xl flex flex-col overflow-hidden pb-0'
            : 'max-w-md pb-20'
        }`}
        style={
          currentTab === 'MAP'
            ? { height: 'calc(100dvh - 56px - 64px)', minHeight: '380px' }
            : undefined
        }
      >
        {currentTab === 'HOME' && (
          <Home
            status={emergencyStatus}
            location={citizenLocation}
            onNavigate={(tab) => setCurrentTab(tab)}
            onToggleDemoEmergency={handleToggleEmergency}
            onRequestLocation={requestGpsLocation}
            latestIncident={latestIncident}
          />
        )}

        {currentTab === 'MAP' && (
          <MapPage
            location={citizenLocation}
            onRequestLocation={requestGpsLocation}
            onNavigateReport={() => setCurrentTab('REPORT')}
          />
        )}

        {currentTab === 'REPORT' && (
          <ReportEmergency
            location={citizenLocation}
            onRequestLocation={requestGpsLocation}
            onReportSubmitted={handleReportSubmitted}
            onCancel={() => setCurrentTab('HOME')}
          />
        )}

        {currentTab === 'SAFETY' && <Safety />}

        {currentTab === 'STATUS' && (
          <IncidentStatusPage
            currentIncident={latestIncident}
            onNavigateHome={() => setCurrentTab('HOME')}
            onNavigateReport={() => setCurrentTab('REPORT')}
            onNavigateMap={() => setCurrentTab('MAP')}
          />
        )}
      </main>

      {/* Fixed Bottom Emergency Navigation Bar */}
      <nav
        id="citizen-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-2xl"
      >
        <div className="max-w-md mx-auto px-2 h-16 grid grid-cols-5 items-center">
          {/* 1. HOME */}
          <button
            id="nav-tab-home"
            onClick={() => setCurrentTab('HOME')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              currentTab === 'HOME'
                ? 'text-red-600 font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <HomeIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">गृह (Home)</span>
          </button>

          {/* 2. MAP */}
          <button
            id="nav-tab-map"
            onClick={() => setCurrentTab('MAP')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              currentTab === 'MAP'
                ? 'text-red-600 font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <MapIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">नक्सा (Map)</span>
          </button>

          {/* 3. REPORT EMERGENCY (Center Hero Action) */}
          <button
            id="nav-tab-report"
            onClick={() => setCurrentTab('REPORT')}
            className="flex flex-col items-center justify-center py-1 -mt-4 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/40 group-hover:scale-105 group-active:scale-95 transition-transform border-2 border-white">
              <AlertOctagon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-black text-red-600 tracking-tight mt-0.5 uppercase">
              REPORT
            </span>
          </button>

          {/* 4. STATUS */}
          <button
            id="nav-tab-status"
            onClick={() => setCurrentTab('STATUS')}
            className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              currentTab === 'STATUS'
                ? 'text-red-600 font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">स्थिति (Status)</span>
            {latestIncident && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          {/* 5. SAFETY */}
          <button
            id="nav-tab-safety"
            onClick={() => setCurrentTab('SAFETY')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              currentTab === 'SAFETY'
                ? 'text-red-600 font-bold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">सुरक्षा (Safety)</span>
          </button>
        </div>
      </nav>

      {/* DEMO MODE DRAWER MODAL (Hackathon Helper) */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-mono font-bold text-xs">
                  DEMO MODE
                </span>
                <h3 className="text-base font-black text-stone-900">
                  Hackathon Testing Controls
                </h3>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              These controls allow you to simulate live emergencies, GPS coordinates, and network disconnects directly during the hackathon evaluation.
            </p>

            {/* Controls */}
            <div className="space-y-3 pt-1">
              {/* 1. Toggle Emergency */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    Emergency Active State
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {emergencyStatus.active ? '🔴 FLOOD EMERGENCY ACTIVE' : '🟢 STATUS: NORMAL'}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleEmergency(!emergencyStatus.active)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    emergencyStatus.active
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {emergencyStatus.active ? 'Set Normal' : 'Activate Emergency'}
                </button>
              </div>

              {/* 2. Simulate GPS Location */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    Citizen GPS Location
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono">
                    {citizenLocation ? `${citizenLocation.latitude.toFixed(4)}, ${citizenLocation.longitude.toFixed(4)}` : 'None'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    locationService.setSimulatedLocation(
                      DEMO_LOCATION.latitude,
                      DEMO_LOCATION.longitude,
                      12
                    );
                    setShowDemoModal(false);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                >
                  Set Nepal Flood GPS
                </button>
              </div>

              {/* 3. Pre-fill Nepali Voice Scenario */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="text-xs font-bold text-stone-900">
                  Predefined Nepali Emergency Scenario
                </div>
                <div className="text-xs text-stone-700 italic bg-white p-2 rounded-lg border border-stone-200">
                  "हामी पाँच जना छौँ। दुई जना बच्चा छन्। घरभित्र पानी पसेको छ र हामी बाहिर निस्कन सकेका छैनौँ।"
                </div>
                <button
                  onClick={() => {
                    setCurrentTab('REPORT');
                    setShowDemoModal(false);
                  }}
                  className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold"
                >
                  Go to Report Screen with Scenario
                </button>
              </div>

              {/* 4. Network Simulator */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div>
                  <div className="text-xs font-bold text-stone-900">
                    Simulate Network Disconnect
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Test offline queue & auto-sync
                  </div>
                </div>
                <button
                  onClick={() => {
                    offlineService.setSimulatedOffline(!offlineService.getSimulatedOffline());
                    setShowDemoModal(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    offlineService.getSimulatedOffline()
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                  }`}
                >
                  {offlineService.getSimulatedOffline() ? 'Restore Network' : 'Simulate Offline'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowDemoModal(false)}
              className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-colors"
            >
              Close Demo Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
