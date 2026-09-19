import {
  EmergencyStatus,
  EmergencyReportPayload,
  IncidentRecord,
  QueuedOfflineReport,
} from '../types/emergency';
import { FloodZoneOverlay, EmergencyPoint } from '../types/location';
import { offlineService } from './offlineService';
import { MAP_CONFIG } from '../config/mapConfig';

const MY_INCIDENTS_KEY = 'citizen_submitted_incidents';
const DEMO_STATUS_OVERRIDE_KEY = 'citizen_demo_status_override';

// Default mock zones for Balkhu / Bagmati River flood zone
export const DEFAULT_PUBLIC_ZONES: FloodZoneOverlay[] = [
  {
    id: 'zone-severe-1',
    severity: 'SEVERE',
    name: 'Balkhu Bridge & Riverside Settlement',
    nameNe: 'बल्खु पुल तथा खोला किनारा बस्ती',
    color: '#ef4444', // red
    center: [27.6885, 85.3010],
    radius: 400,
    description: 'Bagmati River overflowing, high inundation risk',
    descriptionNe: 'बागमती नदीको सतह खतरा पार, तीव्र जलमग्न क्षेत्र',
  },
  {
    id: 'zone-warning-2',
    severity: 'WARNING',
    name: 'Kalanki & Sanepa Marg Buffer',
    nameNe: 'कलंकी तथा सानेपा मार्ग क्षेत्र',
    color: '#f97316', // orange
    center: [27.6920, 85.2950],
    radius: 550,
    description: 'Flash water logging and road blockage',
    descriptionNe: 'सडक जलमग्न र आवतजावतमा अवरोध',
  },
  {
    id: 'zone-safe-3',
    severity: 'SAFE',
    name: 'Tribhuvan University Higher Ground Relief Camp',
    nameNe: 'त्रिभुवन विश्वविद्यालय उच्च भूभाग राहत केन्द्र',
    color: '#22c55e', // green
    center: [27.6815, 85.2890],
    radius: 350,
    description: 'Official flood evacuation shelter with medical support',
    descriptionNe: 'आधिकारिक सुरक्षित आश्रयस्थल तथा स्वास्थ्य शिविर',
  },
];

export const DEFAULT_EMERGENCY_POINTS: EmergencyPoint[] = [
  {
    id: 'point-safe-1',
    name: 'Kirtipur Community Relief Shelter',
    nameNe: 'कीर्तिपुर सामुदायिक राहत आश्रयस्थल',
    lat: 27.6795,
    lng: 85.2825,
    type: 'SAFE_ZONE',
    description: 'High ground shelter with dry food & clean drinking water',
    descriptionNe: 'सुरक्षित उच्च भूभाग, खाद्यान्न र खानेपानी उपलब्ध',
    capacity: '300 persons',
    contact: '01-4330000',
  },
  {
    id: 'point-med-2',
    name: 'Patan Hospital Mobile Medical Post',
    nameNe: 'पाटन अस्पताल आकस्मिक स्वास्थ्य टोली',
    lat: 27.6730,
    lng: 85.3180,
    type: 'MEDICAL_POST',
    description: 'First aid, wound dressing, oral rehydration kits',
    descriptionNe: 'प्राथमिक उपचार, औषधि तथा घाइते उद्धार टोली',
    contact: '102 / 01-5522295',
  },
  {
    id: 'point-relief-3',
    name: 'Red Cross Emergency Food & Boat Dispatch',
    nameNe: 'नेपाल रेडक्रस आकस्मिक डुङ्गा उद्धार टोली',
    lat: 27.6940,
    lng: 85.3080,
    type: 'RELIEF_POINT',
    description: 'Inflatable boat rescue team for stranded families',
    descriptionNe: 'बाढीमा फसेका नागरिकका लागि रबरको डुङ्गा उद्धार टोली',
    contact: '1130',
  },
];

class EmergencyService {
  /**
   * Fetch current flood emergency status
   */
  public async getEmergencyStatus(): Promise<EmergencyStatus> {
    // Check if demo override exists in localStorage
    const demoOverride = localStorage.getItem(DEMO_STATUS_OVERRIDE_KEY);
    if (demoOverride) {
      try {
        return JSON.parse(demoOverride);
      } catch {
        // ignore
      }
    }

    if (offlineService.isOnline()) {
      try {
        const res = await fetch('/api/emergency/status');
        if (res.ok) {
          const data = await res.json();
          return data;
        }
      } catch (err) {
        console.warn('Could not fetch server emergency status, using cached/demo status:', err);
      }
    }

    // Default emergency state (flood active by default as requested for demo)
    return {
      active: true,
      type: 'FLOOD',
      message: 'Flood emergency has been activated in your area.',
      messageNe: 'तपाईंको क्षेत्रमा बाढी आपतकाल सक्रिय गरिएको छ।',
      affected_area: MAP_CONFIG.areaName,
      affected_area_ne: MAP_CONFIG.areaNameNe,
      updated_at: new Date().toISOString(),
      source: 'Disaster Management Authority',
    };
  }

  /**
   * Set emergency status in demo mode (for hackathon testing)
   */
  public async setDemoEmergencyStatus(active: boolean): Promise<EmergencyStatus> {
    const status: EmergencyStatus = {
      active,
      type: 'FLOOD',
      message: active
        ? 'Flood emergency has been activated in your area. Please stay alert.'
        : 'Normal conditions. No active flood emergency detected in this zone.',
      messageNe: active
        ? 'तपाईंको क्षेत्रमा बाढी आपतकाल सक्रिय गरिएको छ। कृपया सुरक्षित रहनुहोस्।'
        : 'अवस्था सामान्य छ। तपाईंको क्षेत्रमा कुनै सक्रिय आपतकाल छैन।',
      affected_area: MAP_CONFIG.areaName,
      affected_area_ne: MAP_CONFIG.areaNameNe,
      updated_at: new Date().toISOString(),
      source: 'DEMO MODE',
    };
    localStorage.setItem(DEMO_STATUS_OVERRIDE_KEY, JSON.stringify(status));

    // Also notify server if online
    if (offlineService.isOnline()) {
      try {
        await fetch('/api/emergency/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(status),
        });
      } catch {
        // ignore
      }
    }

    return status;
  }

  /**
   * Submit an emergency report
   * If online: sends directly to server and generates Incident ID
   * If offline: queues in offline storage and returns waiting record
   */
  public async submitEmergencyReport(
    payload: EmergencyReportPayload
  ): Promise<{
    incident?: IncidentRecord;
    queued?: QueuedOfflineReport;
    isOffline: boolean;
  }> {
    const isOnline = offlineService.isOnline();

    if (!isOnline) {
      // Enqueue offline
      const queuedItem = offlineService.enqueueReport(payload);
      return { queued: queuedItem, isOffline: true };
    }

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const incident: IncidentRecord = await res.json();
        this.saveMyIncident(incident);
        return { incident, isOffline: false };
      }
      throw new Error(`Server returned ${res.status}`);
    } catch (err) {
      console.warn('Direct submission failed, storing to offline queue:', err);
      const queuedItem = offlineService.enqueueReport(payload);
      return { queued: queuedItem, isOffline: true };
    }
  }

  /**
   * Fetch status of a citizen's incident
   */
  public async getIncidentStatus(incidentId: string): Promise<IncidentRecord | null> {
    // Check locally saved incidents first
    const myIncidents = this.getMySavedIncidents();
    const local = myIncidents.find((i) => i.id === incidentId || i.incident_number === incidentId);

    if (offlineService.isOnline()) {
      try {
        const res = await fetch(`/api/incidents/${encodeURIComponent(incidentId)}`);
        if (res.ok) {
          const fresh = await res.json();
          this.saveMyIncident(fresh);
          return fresh;
        }
      } catch {
        // fall back to local
      }
    }

    return local || null;
  }

  /**
   * Sync all offline queued reports to central system
   */
  public async syncOfflineReports(): Promise<{ synced: number; failed: number }> {
    if (!offlineService.isOnline()) {
      return { synced: 0, failed: 0 };
    }

    const queue = offlineService.getQueuedReports();
    const pending = queue.filter((i) => i.status === 'WAITING_FOR_CONNECTION');

    if (pending.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        const res = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });

        if (res.ok) {
          const incident: IncidentRecord = await res.json();
          offlineService.updateQueuedReportStatus(item.id, 'SYNCED', incident.incident_number);
          this.saveMyIncident(incident);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  }

  /**
   * Get public emergency zones and safe points (filtered to public safe data only)
   */
  public async getPublicEmergencyZones(): Promise<{
    zones: FloodZoneOverlay[];
    points: EmergencyPoint[];
  }> {
    if (offlineService.isOnline()) {
      try {
        const res = await fetch('/api/emergency/zones');
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // fall back to default
      }
    }

    return {
      zones: DEFAULT_PUBLIC_ZONES,
      points: DEFAULT_EMERGENCY_POINTS,
    };
  }

  // --- Citizen Local Incident Store (Citizen Privacy: only sees own submitted incidents) ---

  public getMySavedIncidents(): IncidentRecord[] {
    try {
      const data = localStorage.getItem(MY_INCIDENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveMyIncident(incident: IncidentRecord) {
    const list = this.getMySavedIncidents();
    const index = list.findIndex((i) => i.id === incident.id || i.incident_number === incident.incident_number);
    if (index >= 0) {
      list[index] = incident;
    } else {
      list.unshift(incident);
    }
    localStorage.setItem(MY_INCIDENTS_KEY, JSON.stringify(list));
  }
}

export const emergencyService = new EmergencyService();
