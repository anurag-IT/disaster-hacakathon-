import React from 'react';
import { AlertOctagon } from 'lucide-react';

interface EmergencyButtonProps {
  onClick: () => void;
  className?: string;
  isEmergencyActive?: boolean;
}

export const EmergencyButton: React.FC<EmergencyButtonProps> = ({
  onClick,
  className = '',
  isEmergencyActive = true,
}) => {
  return (
    <button
      id="btn-main-report-emergency"
      onClick={onClick}
      className={`group relative w-full py-5 px-6 rounded-2xl font-bold text-white shadow-xl transition-all duration-200 active:scale-98 flex items-center justify-center gap-3 cursor-pointer overflow-hidden ${
        isEmergencyActive
          ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30 ring-4 ring-red-300 animate-pulse'
          : 'bg-red-700 hover:bg-red-800 shadow-stone-400/30'
      } ${className}`}
      aria-label="Report Emergency"
    >
      <div className="p-2.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
        <AlertOctagon className="w-8 h-8 text-white stroke-[2.5]" />
      </div>

      <div className="text-left">
        <div className="text-xs uppercase tracking-widest text-red-100 font-semibold font-mono">
          तत्काल सहयोग चाहिन्छ? (Need Help?)
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          REPORT EMERGENCY
        </div>
        <div className="text-sm font-medium text-red-100">
          आपतकाल रिपोर्ट गर्नुहोस्
        </div>
      </div>
    </button>
  );
};
