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

// Local demo emergency areas around Maitidevi / Dillibazar, Kathmandu
export const DEFAULT_PUBLIC_ZONES: FloodZoneOverlay[] = [
  {
    id: 'zone-severe-1',
    severity: 'SEVERE',
    name: 'Maitidevi Road & Local Settlement',
    nameNe: 'मैतिदेवी सड़क तथा स्थानीय बस्ती',
    color: '#ef4444',
    center: [27.7078, 85.3374],
    radius: 240,
    description: 'Dense residential area near drains and busy road corridors.',
    descriptionNe: 'नाला र व्यस्त सड़कमैत्री बस्तीमा जलजमाव र यातायात अवरोधको जोखिम।',
  },
  {
    id: 'zone-warning-2',
    severity: 'WARNING',
    name: 'Dillibazar Junction Buffer',
    nameNe: 'दिल्लीबजार जंक्शन बफर',
    color: '#f97316',
    center: [27.7035, 85.3348],
    radius: 300,
    description: 'Concentrated junction with higher flood and access risk.',
    descriptionNe: 'घनघन्टेल जंक्शन, सार्वजनिक आवागमन र जलमग्न जोखिमको क्षेत्र।',
  },
  {
    id: 'zone-safe-3',
    severity: 'SAFE',
    name: 'Higher Ground Relief Point',
    nameNe: 'उच्च भूभाग राहत स्थल',
    color: '#22c55e',
    center: [27.7095, 85.3415],
    radius: 180,
    description: 'Safer elevated point for temporary shelter and local support.',
    descriptionNe: 'उच्च भूभागमा सुरक्षित राहत, आश्रय र सहयोगको बिन्दु।',
  },
];

export const DEFAULT_EMERGENCY_POINTS: EmergencyPoint[] = [
  {
    id: 'point-safe-1',
    name: 'Maitidevi Community Relief Shelter',
    nameNe: 'मैतिदेवी सामुदायिक राहत आश्रय',
    lat: 27.7092,
    lng: 85.3381,
    type: 'SAFE_ZONE',
    description: 'Temporary shelter with food, water, and emergency support.',
    descriptionNe: 'खाना, पानी र आपतकालीन सहयोग सहित अस्थायी आश्रय।',
    capacity: '250 persons',
    contact: '01-4421000',
  },
  {
    id: 'point-med-2',
    name: 'Dillibazar Medical Assistance Post',
    nameNe: 'दिल्लीबजार चिकित्सा सहयोग केन्द्र',
    lat: 27.7039,
    lng: 85.3341,
    type: 'MEDICAL_POST',
    description: 'First aid and emergency medical care for local residents.',
    descriptionNe: 'स्थानीय नागरिकका लागि प्राथमिक उपचार र आपतकालीन सहायता।',
    contact: '102 / 01-5500450',
  },
  {
    id: 'point-relief-3',
    name: 'Emergency Relief & Rescue Dispatch',
    nameNe: 'आधारभूत राहत र उद्धार वितरण',
    lat: 27.7083,
    lng: 85.3410,
    type: 'RELIEF_POINT',
    description: 'Rescue and relief collection point for local emergency support.',
    descriptionNe: 'स्थानीय राहत र उद्धारका लागि समन्वय बिन्दु।',
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
