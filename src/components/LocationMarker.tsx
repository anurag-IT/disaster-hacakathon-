import L from 'leaflet';

// Custom SVG icon generator for Leaflet without external asset dependencies
export const createCitizenMarkerIcon = (accuracyMeters: number = 10) => {
  const pulseSize = Math.max(52, Math.min(90, accuracyMeters * 2.2));

  return L.divIcon({
    className: 'citizen-location-marker',
    html: `
      <div style="position: relative; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 10px rgba(239,68,68,0.45));">
        <div style="position: absolute; width: ${pulseSize}px; height: ${pulseSize}px; border-radius: 50%; background: rgba(239, 68, 68, 0.18); border: 2px solid rgba(239,68,68,0.4); animation: pulse 2.2s ease-out infinite;"></div>
        <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: #ef4444; border: 3px solid #ffffff; box-shadow: 0 0 0 3px rgba(239,68,68,0.15), 0 4px 16px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      </div>
    `,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
    popupAnchor: [0, -20],
  });
};

export const createSafePointIcon = (type: 'SAFE_ZONE' | 'RELIEF_POINT' | 'MEDICAL_POST') => {
  const bg = type === 'SAFE_ZONE' ? '#16a34a' : type === 'MEDICAL_POST' ? '#dc2626' : '#d97706';
  const symbol = type === 'SAFE_ZONE' ? '🛡️' : type === 'MEDICAL_POST' ? '🏥' : '📦';

  return L.divIcon({
    className: 'safe-point-marker',
    html: `
      <div style="width: 32px; height: 32px; border-radius: 50%; background: ${bg}; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; font-size: 14px;">
        ${symbol}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};
