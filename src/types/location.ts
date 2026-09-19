export interface CitizenLocation {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  timestamp: number;
  isSimulated?: boolean;
}

export interface EmergencyPoint {
  id: string;
  name: string;
  nameNe: string;
  lat: number;
  lng: number;
  type: 'SAFE_ZONE' | 'RELIEF_POINT' | 'MEDICAL_POST';
  description: string;
  descriptionNe: string;
  capacity?: string;
  contact?: string;
}

export interface FloodZoneOverlay {
  id: string;
  severity: 'SEVERE' | 'WARNING' | 'SAFE';
  name: string;
  nameNe: string;
  color: string;
  center: [number, number];
  radius: number; // in meters
  description: string;
  descriptionNe: string;
}
