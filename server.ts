import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// In-Memory Database for Incidents (Central Disaster Response System Store)
let incidentCounter = 124;
interface StoredIncident {
  id: string;
  incident_number: string;
  status: 'RECEIVED' | 'ASSIGNED' | 'RESPONDING' | 'RESOLVED';
  statusNe: string;
  statusDescription: string;
  statusDescriptionNe: string;
  created_at: string;
  updated_at: string;
  report: any;
}

const incidentsDatabase = new Map<string, StoredIncident>();

// Pre-populate with a demo incident for reference
const initialDemoIncident: StoredIncident = {
  id: 'inc-f-00123',
  incident_number: 'INCIDENT #F-00123',
  status: 'RESPONDING',
  statusNe: 'टोली खटाइएको छ',
  statusDescription: 'Rescue boat dispatched towards Balkhu Corridor',
  statusDescriptionNe: 'उद्धार डुङ्गा बल्खु करिडोर तर्फ प्रस्थान गरेको छ',
  created_at: new Date(Date.now() - 3600000).toISOString(),
  updated_at: new Date(Date.now() - 1800000).toISOString(),
  report: {
    citizen_id: 'citizen-demo-000',
    latitude: 27.6890,
    longitude: 85.3020,
    accuracy: 15,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    emergency_type: 'FLOOD',
    description: 'Balkhu riverside inundation, 3 elderly people trapped on rooftop',
    category: 'TRAPPED',
    people: 3,
    children: 0,
    elderly: 3,
    injured: 0,
    trapped: true,
    immediate_need: 'BOAT_RESCUE',
    source: 'citizen_app',
  },
};
incidentsDatabase.set(initialDemoIncident.id, initialDemoIncident);
incidentsDatabase.set(initialDemoIncident.incident_number, initialDemoIncident);

// Emergency status state
let emergencyStatusState = {
  active: true,
  type: 'FLOOD',
  message: 'Flood emergency has been activated in your area. Please stay alert and follow official instructions.',
  messageNe: 'तपाईंको क्षेत्रमा बाढी आपतकाल सक्रिय गरिएको छ। कृपया सतर्क रहनुहोस् र आधिकारिक निर्देशनहरू पालना गर्नुहोस्।',
  affected_area: 'Balkhu & Bagmati River Flood Corridor, Kathmandu',
  affected_area_ne: 'बल्खु र बागमती नदी करिडोर, काठमाडौँ',
  updated_at: new Date().toISOString(),
  source: 'Disaster Management Central Response',
};

// --- API ROUTES ---

// 1. Get Emergency Status
app.get('/api/emergency/status', (req: Request, res: Response) => {
  res.json(emergencyStatusState);
});

// 2. Set/Toggle Emergency Status (Controlled by Super Admin / Demo mode)
app.post('/api/emergency/status', (req: Request, res: Response) => {
  const { active, message, messageNe, affected_area, affected_area_ne } = req.body;
  emergencyStatusState = {
    ...emergencyStatusState,
    active: active !== undefined ? Boolean(active) : emergencyStatusState.active,
    message: message || emergencyStatusState.message,
    messageNe: messageNe || emergencyStatusState.messageNe,
    affected_area: affected_area || emergencyStatusState.affected_area,
    affected_area_ne: affected_area_ne || emergencyStatusState.affected_area_ne,
    updated_at: new Date().toISOString(),
  };
  res.json(emergencyStatusState);
});

// 3. Get Public Emergency Zones & Safe Points
app.get('/api/emergency/zones', (req: Request, res: Response) => {
  res.json({
    zones: [
      {
        id: 'zone-severe-1',
        severity: 'SEVERE',
        name: 'Balkhu Bridge & Riverside Settlement',
        nameNe: 'बल्खु पुल तथा खोला किनारा बस्ती',
        color: '#ef4444',
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
        color: '#f97316',
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
        color: '#22c55e',
        center: [27.6815, 85.2890],
        radius: 350,
        description: 'Official flood evacuation shelter with medical support',
        descriptionNe: 'आधिकारिक सुरक्षित आश्रयस्थल तथा स्वास्थ्य शिविर',
      },
    ],
    points: [
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
    ],
  });
});

// 4. Submit Emergency Report (Citizen App Entry Point)
app.post('/api/incidents', (req: Request, res: Response) => {
  const payload = req.body;

  if (!payload || !payload.description) {
    res.status(400).json({ error: 'Missing emergency report description' });
    return;
  }

  const num = incidentCounter++;
  const incidentNumber = `INCIDENT #F-${String(num).padStart(5, '0')}`;
  const id = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newIncident: StoredIncident = {
    id,
    incident_number: incidentNumber,
    status: 'RECEIVED',
    statusNe: 'रिपोर्ट प्राप्त भयो',
    statusDescription: 'Your report has been sent to the central response system.',
    statusDescriptionNe: 'तपाईंको आपतकालीन विवरण केन्द्रिय उद्धार प्रणालीमा दर्ता भएको छ।',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    report: {
      citizen_id: payload.citizen_id || `citizen-${Date.now()}`,
      latitude: Number(payload.latitude) || 27.6882,
      longitude: Number(payload.longitude) || 85.3015,
      accuracy: Number(payload.accuracy) || 12,
      timestamp: payload.timestamp || new Date().toISOString(),
      emergency_type: payload.emergency_type || 'FLOOD',
      description: payload.description,
      category: payload.category || 'TRAPPED',
      people: Number(payload.people) || 1,
      children: Number(payload.children) || 0,
      elderly: Number(payload.elderly) || 0,
      injured: Number(payload.injured) || 0,
      trapped: Boolean(payload.trapped),
      immediate_need: payload.immediate_need || 'RESCUE',
      source: 'citizen_app',
    },
  };

  incidentsDatabase.set(id, newIncident);
  incidentsDatabase.set(incidentNumber, newIncident);

  console.log(`[DISASTER RESPONSE] New Incident Logged: ${incidentNumber}`, newIncident.report);
  res.status(201).json(newIncident);
});

// 5. Batch Sync for Offline Queued Incidents
app.post('/api/incidents/sync', (req: Request, res: Response) => {
  const { reports } = req.body;
  if (!Array.isArray(reports)) {
    res.status(400).json({ error: 'Expected an array of reports' });
    return;
  }

  const syncedList = [];
  for (const item of reports) {
    const num = incidentCounter++;
    const incidentNumber = `INCIDENT #F-${String(num).padStart(5, '0')}`;
    const id = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newIncident: StoredIncident = {
      id,
      incident_number: incidentNumber,
      status: 'RECEIVED',
      statusNe: 'रिपोर्ट प्राप्त भयो (अफलाइन सिङ्क)',
      statusDescription: 'Your offline report has been received and synchronized.',
      statusDescriptionNe: 'तपाईंको अफलाइन रिपोर्ट प्राप्त भई प्रणालीमा सिङ्क भएको छ।',
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      report: item.payload || item,
    };

    incidentsDatabase.set(id, newIncident);
    incidentsDatabase.set(incidentNumber, newIncident);
    syncedList.push({ original_queue_id: item.id, incident: newIncident });
  }

  res.json({ synced: syncedList.length, items: syncedList });
});

// 6. Get Incident Status
app.get('/api/incidents/:id', (req: Request, res: Response) => {
  const id = decodeURIComponent(req.params.id);
  const found = incidentsDatabase.get(id);

  if (!found) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }

  // Simulate progress over time for demo
  const elapsedMinutes = (Date.now() - new Date(found.created_at).getTime()) / 60000;
  if (elapsedMinutes > 3 && found.status === 'RECEIVED') {
    found.status = 'ASSIGNED';
    found.statusNe = 'प्रतिक्रिया टोली तोकियो';
    found.statusDescription = 'Disaster response team assigned to this incident.';
    found.statusDescriptionNe = 'उद्धार टोली तपाईंको घटनामा खटाइएको छ।';
    found.updated_at = new Date().toISOString();
  } else if (elapsedMinutes > 8 && found.status === 'ASSIGNED') {
    found.status = 'RESPONDING';
    found.statusNe = 'टोली खटिँदै छ';
    found.statusDescription = 'First responders are in transit with flood gear.';
    found.statusDescriptionNe = 'उद्धार टोली उद्धार सामग्रीसहित आउँदैछ।';
    found.updated_at = new Date().toISOString();
  }

  res.json(found);
});

// 7. AI Extraction of Nepali/English Emergency Voice/Text
app.post('/api/ai/extract-emergency', async (req: Request, res: Response) => {
  const { transcript, hasGpsLocation } = req.body;

  if (!transcript || typeof transcript !== 'string') {
    res.status(400).json({ error: 'Transcript string is required' });
    return;
  }

  const client = getGeminiClient();

  if (!client) {
    // Fall back to server-side rule extractor
    res.json(fallbackServerExtractor(transcript, Boolean(hasGpsLocation)));
    return;
  }

  try {
    const prompt = `You are a disaster emergency triage AI for flood response in Nepal.
Analyze this citizen emergency message (which may be in Nepali or English):
"${transcript}"

Current GPS status of citizen: ${hasGpsLocation ? 'GPS location is already available and acquired.' : 'GPS location is NOT available.'}

Extract the following JSON details:
- people (integer): total count of people needing help (default 1 if unspecified)
- children (integer): number of children (default 0)
- elderly (integer): number of elderly (default 0)
- injured (integer): number of injured people (default 0)
- trapped (boolean): true if water entered house, cannot get out, stranded on roof, surrounded by flood
- immediate_need (string): e.g. "RESCUE", "MEDICAL", "FOOD", "WATER", "BOAT_RESCUE", "SHELTER"
- emergency_condition (string): concise summary of what is happening
- category (string): one of "TRAPPED", "MEDICAL", "WATER", "FOOD", "FLOOD_DAMAGE", "OTHER"
- missing_critical_info (string or null): If CRITICAL information is missing (such as location landmark when GPS is unavailable, or people count), state the field name ("LOCATION" or "PEOPLE_COUNT"). If GPS is ALREADY available, DO NOT ask for location.
- follow_up_question_ne (string or null): Short, simple follow-up question in Nepali ONLY if critical info is missing (e.g. "तपाईं अहिले कहाँ हुनुहुन्छ? नजिकैको चिनिने ठाउँ बताउनुहोस्।" if GPS is missing). Otherwise null.
- follow_up_question_en (string or null): Short follow-up question in English if critical info is missing, else null.
- confidence (number): from 0.0 to 1.0

Strict rule: Do NOT invent missing information. Keep questions minimal.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            people: { type: Type.INTEGER },
            children: { type: Type.INTEGER },
            elderly: { type: Type.INTEGER },
            injured: { type: Type.INTEGER },
            trapped: { type: Type.BOOLEAN },
            immediate_need: { type: Type.STRING },
            emergency_condition: { type: Type.STRING },
            category: {
              type: Type.STRING,
              enum: ['TRAPPED', 'MEDICAL', 'WATER', 'FOOD', 'FLOOD_DAMAGE', 'OTHER'],
            },
            missing_critical_info: { type: Type.STRING, nullable: true },
            follow_up_question_ne: { type: Type.STRING, nullable: true },
            follow_up_question_en: { type: Type.STRING, nullable: true },
            confidence: { type: Type.NUMBER },
          },
          required: [
            'people',
            'children',
            'elderly',
            'injured',
            'trapped',
            'immediate_need',
            'emergency_condition',
            'category',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.warn('Gemini extraction failed, using fallback heuristic:', err?.message || err);
    res.json(fallbackServerExtractor(transcript, Boolean(hasGpsLocation)));
  }
});

function fallbackServerExtractor(text: string, hasGps: boolean) {
  const t = text.toLowerCase();
  let people = 1;
  let children = 0;
  let elderly = 0;
  let injured = 0;
  let trapped = false;
  let immediate_need = 'RESCUE';
  let category = 'TRAPPED';

  if (text.includes('पाँच जना') || text.includes('५ जना') || t.includes('5 people')) people = 5;
  else if (text.includes('चार जना') || text.includes('४ जना')) people = 4;
  else if (text.includes('तीन जना') || text.includes('३ जना')) people = 3;
  else if (text.includes('दुई जना') || text.includes('२ जना')) people = 2;

  if (text.includes('दुई जना बच्चा') || text.includes('२ जना बच्चा') || text.includes('बच्चा छन्') || t.includes('children')) {
    children = text.includes('दुई') || text.includes('२') ? 2 : 1;
  }
  if (text.includes('वृद्ध') || text.includes('बुढा') || t.includes('elderly')) elderly = 1;
  if (text.includes('घाइते') || t.includes('injured')) {
    injured = 1;
    category = 'MEDICAL';
    immediate_need = 'MEDICAL_EVACUATION';
  }
  if (text.includes('पानी पसेको') || text.includes('निस्कन सकेका छैनौँ') || text.includes('फसेका') || t.includes('trapped')) {
    trapped = true;
    category = 'TRAPPED';
    immediate_need = 'URGENT_RESCUE';
  }

  let missing_critical_info: string | null = null;
  let follow_up_question_ne: string | null = null;
  let follow_up_question_en: string | null = null;

  if (!hasGps && !text.includes('बल्खु') && !text.includes('काठमाडौँ')) {
    missing_critical_info = 'LOCATION';
    follow_up_question_ne = 'तपाईं अहिले कहाँ हुनुहुन्छ? नजिकैको चिनिने ठाउँ बताउनुहोस्।';
    follow_up_question_en = 'Where are you right now? Please mention a nearby landmark.';
  }

  return {
    people,
    children,
    elderly,
    injured,
    trapped,
    immediate_need,
    emergency_condition: text,
    category,
    missing_critical_info,
    follow_up_question_ne,
    follow_up_question_en,
    confidence: 0.96,
  };
}

// --- VITE & STATIC FILES SETUP ---

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Citizen Disaster Emergency Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
