export type EmergencyCategory =
  | 'TRAPPED'
  | 'MEDICAL'
  | 'WATER'
  | 'FOOD'
  | 'FLOOD_DAMAGE'
  | 'OTHER';

export interface EmergencyStatus {
  active: boolean;
  type: string;
  message: string;
  messageNe: string;
  affected_area: string;
  affected_area_ne?: string;
  updated_at: string;
  source?: string;
}

export interface EmergencyReportPayload {
  citizen_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  emergency_type: string;
  description: string;
  category: EmergencyCategory;
  people: number;
  children: number;
  elderly: number;
  injured: number;
  trapped: boolean;
  immediate_need: string;
  source: 'citizen_app';
}

export type IncidentStatusType =
  | 'RECEIVED'
  | 'ASSIGNED'
  | 'RESPONDING'
  | 'RESOLVED';

export interface IncidentRecord {
  id: string;
  incident_number: string; // e.g. "INCIDENT #F-00124"
  status: IncidentStatusType;
  statusNe: string;
  statusDescription: string;
  statusDescriptionNe: string;
  created_at: string;
  updated_at: string;
  report: EmergencyReportPayload;
}

export interface QueuedOfflineReport {
  id: string;
  created_at: string;
  payload: EmergencyReportPayload;
  status: 'WAITING_FOR_CONNECTION' | 'SYNCED' | 'FAILED';
  synced_incident_id?: string;
}

export interface AIExtractionResult {
  people: number;
  children: number;
  elderly: number;
  injured: number;
  trapped: boolean;
  immediate_need: string;
  emergency_condition: string;
  category: EmergencyCategory;
  missing_critical_info?: string;
  follow_up_question_ne?: string;
  follow_up_question_en?: string;
  confidence: number;
}
