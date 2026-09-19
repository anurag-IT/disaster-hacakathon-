import React from 'react';
import { Clock, CheckCircle2, Navigation, AlertCircle, Shield } from 'lucide-react';
import { IncidentRecord, IncidentStatusType } from '../types/emergency';

interface StatusCardProps {
  incident: IncidentRecord;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  incident,
  onRefresh,
  isRefreshing = false,
}) => {
  const steps: { key: IncidentStatusType; labelEn: string; labelNe: string; color: string }[] = [
    { key: 'RECEIVED', labelEn: 'Report Received', labelNe: 'रिपोर्ट प्राप्त भयो', color: 'orange' },
    { key: 'ASSIGNED', labelEn: 'Response Assigned', labelNe: 'प्रतिक्रिया तोकियो', color: 'blue' },
    { key: 'RESPONDING', labelEn: 'Team Responding', labelNe: 'टोली खटिँदैछ', color: 'amber' },
    { key: 'RESOLVED', labelEn: 'Resolved', labelNe: 'उद्धार सम्पन्न', color: 'emerald' },
  ];

  const currentIdx = steps.findIndex((s) => s.key === incident.status);

  return (
    <div id={`incident-card-${incident.id}`} className="w-full bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400">
            DISASTER RESPONSE INCIDENT
          </span>
          <div className="text-xl font-mono font-extrabold text-amber-400">
            {incident.incident_number}
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{incident.status}</span>
        </div>
      </div>

      {/* Confirmation & Reassurance Note */}
      <div className="p-5">
        <div className="flex items-start gap-3 bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r-xl mb-5">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold text-sm text-amber-950 mb-0.5">
              रिपोर्ट प्राप्त भयो (Report Received)
            </p>
            <p>
              Your emergency report has been sent to the response system. Keep your phone battery safe and stay in higher ground if possible.
            </p>
            <p className="mt-1 text-amber-800 italic">
              (तपाईंको विवरण उद्धार प्रणालीमा पठाइएको छ।)
            </p>
          </div>
        </div>

        {/* Status Stepper Progression */}
        <div className="mb-6">
          <div className="text-xs font-bold text-stone-600 mb-3 tracking-wide uppercase">
            प्रतिक्रिया स्थिति (Incident Status)
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => {
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isFuture = idx > currentIdx;

              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-50/70 border-amber-300 shadow-sm'
                      : isPast
                      ? 'bg-stone-50 border-stone-200 opacity-90'
                      : 'bg-white border-dashed border-stone-200 opacity-50'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                        : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-stone-900 truncate">
                        {step.labelNe}
                      </div>
                      <div className="text-[11px] font-mono text-stone-500">
                        {step.labelEn}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Emergency Report Details summary */}
        <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1.5">
          <div className="flex justify-between font-mono text-[11px] text-stone-500 border-b border-stone-200 pb-1.5">
            <span>दर्ता समय (Logged At):</span>
            <span>{new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">स्थान (GPS Location):</span>
            <span className="font-mono font-medium">
              {incident.report.latitude.toFixed(4)}, {incident.report.longitude.toFixed(4)} (~{incident.report.accuracy}m)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">मानिस सङ्ख्या (People):</span>
            <span className="font-semibold">
              {incident.report.people} जना {incident.report.children > 0 ? `(${incident.report.children} बच्चा)` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">अवस्था (Condition):</span>
            <span className="font-semibold text-red-600">
              {incident.report.trapped ? '🚨 फसेको (Trapped)' : 'सामान्य'}
            </span>
          </div>
          <div className="pt-1.5 text-stone-800 italic border-t border-stone-200">
            "{incident.report.description}"
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="mt-4 w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors border border-stone-300 cursor-pointer"
          >
            <Clock className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>स्थिति ताजा गर्नुहोस् (Refresh Status)</span>
          </button>
        )}
      </div>
    </div>
  );
};
