import L from 'leaflet';

// Custom SVG icon generator for Leaflet without external asset dependencies
export const createCitizenMarkerIcon = (accuracyMeters: number = 10) => {
  return L.divIcon({
    className: 'citizen-location-marker',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(37, 99, 235, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
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
