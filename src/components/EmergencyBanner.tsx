import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { EmergencyStatus } from '../types/emergency';

interface EmergencyBannerProps {
  status: EmergencyStatus;
  onToggleDemoEmergency?: (active: boolean) => void;
  showDemoControl?: boolean;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({
  status,
  onToggleDemoEmergency,
  showDemoControl = true,
}) => {
  const isActive = status.active;

  return (
    <div
      id="emergency-status-banner"
      className={`w-full transition-all duration-300 ${
        isActive
          ? 'bg-red-600 text-white border-b-4 border-red-800 shadow-md'
          : 'bg-emerald-700 text-white border-b-4 border-emerald-900 shadow-sm'
      }`}
    >
      <div className="max-w-md mx-auto px-4 py-4 sm:py-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                isActive ? 'bg-red-200 animate-ping' : 'bg-emerald-300'
              }`}
            />
            <span className="text-xs font-mono tracking-wider font-semibold uppercase text-stone-100">
              {isActive ? '🔴 FLOOD EMERGENCY ACTIVE' : '🟢 STATUS: NORMAL'}
            </span>
          </div>

          {showDemoControl && onToggleDemoEmergency && (
            <button
              id="btn-demo-toggle-emergency"
              onClick={() => onToggleDemoEmergency(!isActive)}
              className="text-[10px] font-mono uppercase bg-black/30 hover:bg-black/40 text-white/90 px-2 py-0.5 rounded border border-white/20 transition-colors"
              title="Toggle emergency state for hackathon testing"
            >
              Demo: {isActive ? 'Set Normal' : 'Set Active'}
            </button>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-lg bg-black/20 shrink-0">
            {isActive ? (
              <ShieldAlert className="w-7 h-7 text-white" />
            ) : (
              <CheckCircle className="w-7 h-7 text-emerald-100" />
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight font-sans tracking-tight">
              {isActive ? 'बाढी आपतकाल सक्रिय' : 'अवस्था सामान्य छ'}
            </h1>
            <p className="text-sm font-medium mt-1 text-white/95 leading-relaxed">
              {isActive
                ? status.messageNe || 'तपाईंको क्षेत्रमा बाढी आपतकाल सक्रिय गरिएको छ। सतर्क रहनुहोस्।'
                : status.messageNe || 'तपाईं हाल सक्रिय आपतकालीन क्षेत्रमा हुनुहुन्न।'}
            </p>
            {status.affected_area && (
              <p className="text-xs mt-1.5 text-white/80 font-mono">
                📍 {status.affected_area_ne || status.affected_area}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
