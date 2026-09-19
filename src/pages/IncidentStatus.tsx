import React, { useState, useEffect } from 'react';
import { StatusCard } from '../components/StatusCard';
import { IncidentRecord } from '../types/emergency';
import { emergencyService } from '../services/emergencyService';
import { ArrowLeft, AlertCircle, PlusCircle, MapPin } from 'lucide-react';

interface IncidentStatusPageProps {
  currentIncident: IncidentRecord | null;
  onNavigateHome: () => void;
  onNavigateReport: () => void;
  onNavigateMap: () => void;
}

export const IncidentStatusPage: React.FC<IncidentStatusPageProps> = ({
  currentIncident,
  onNavigateHome,
  onNavigateReport,
  onNavigateMap,
}) => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [activeIncident, setActiveIncident] = useState<IncidentRecord | null>(currentIncident);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const list = emergencyService.getMySavedIncidents();
    setIncidents(list);
    if (!activeIncident && list.length > 0) {
      setActiveIncident(list[0]);
    } else if (currentIncident) {
      setActiveIncident(currentIncident);
    }
  }, [currentIncident]);

  const handleRefresh = async () => {
    if (!activeIncident) return;
    setIsRefreshing(true);
    try {
      const updated = await emergencyService.getIncidentStatus(activeIncident.incident_number);
      if (updated) {
        setActiveIncident(updated);
        const list = emergencyService.getMySavedIncidents();
        setIncidents(list);
      }
    } catch (e) {
      console.warn('Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 p-2 rounded-lg bg-white border border-stone-200 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>मुख्य पृष्ठ (Home)</span>
        </button>

        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          CITIZEN TRACKER
        </span>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          REPORT RECEIVED
        </h1>
        <p className="text-sm font-semibold text-stone-600 mt-1">
          तपाईंको आपतकालीन रिपोर्ट दर्ता भएको छ।
        </p>
      </div>

      {/* Multiple Incident Switcher if citizen filed more than one */}
      {incidents.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {incidents.map((inc) => (
            <button
              key={inc.id}
              onClick={() => setActiveIncident(inc)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold shrink-0 border transition-all cursor-pointer ${
                activeIncident?.id === inc.id
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
            >
              {inc.incident_number}
            </button>
          ))}
        </div>
      )}

      {/* Active Incident Status Display */}
      {activeIncident ? (
        <StatusCard
          incident={activeIncident}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-stone-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-stone-900">
              हाल कुनै सक्रिय रिपोर्ट फेला परेन
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              No active emergency report logged in this browser session.
            </p>
          </div>
          <button
            onClick={onNavigateReport}
            className="py-3 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            नयाँ आपतकाल रिपोर्ट गर्नुहोस्
          </button>
        </div>
      )}

      {/* Navigation Shortcuts */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onNavigateMap}
          className="p-3 bg-white hover:bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold text-stone-800 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>नक्सा हेर्नुहोस् (View Map)</span>
        </button>

        <button
          onClick={onNavigateReport}
          className="p-3 bg-white hover:bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold text-red-600 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-red-600" />
          <span>अर्को रिपोर्ट (Report More)</span>
        </button>
      </div>
    </div>
  );
};
