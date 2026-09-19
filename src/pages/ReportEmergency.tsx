import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Keyboard,
  Send,
  AlertOctagon,
  CheckCircle,
  AlertTriangle,
  Users,
  Baby,
  HeartPulse,
  Home,
  Droplets,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { CitizenLocation } from '../types/location';
import {
  EmergencyCategory,
  EmergencyReportPayload,
  AIExtractionResult,
  IncidentRecord,
} from '../types/emergency';
import { aiService } from '../services/aiService';
import { emergencyService } from '../services/emergencyService';
import { offlineService } from '../services/offlineService';

interface ReportEmergencyProps {
  location: CitizenLocation | null;
  onRequestLocation: () => void;
  onReportSubmitted: (incident: IncidentRecord) => void;
  onCancel: () => void;
}

const CATEGORIES: { key: EmergencyCategory; labelNe: string; labelEn: string; icon: any; color: string }[] = [
  { key: 'TRAPPED', labelNe: 'फसेको (उद्धार चाहियो)', labelEn: 'TRAPPED', icon: AlertOctagon, color: 'bg-red-600' },
  { key: 'MEDICAL', labelNe: 'घाइते / उपचार', labelEn: 'MEDICAL', icon: HeartPulse, color: 'bg-rose-600' },
  { key: 'WATER', labelNe: 'खानेपानी', labelEn: 'WATER', icon: Droplets, color: 'bg-blue-600' },
  { key: 'FOOD', labelNe: 'खाद्यान्न', labelEn: 'FOOD', icon: Home, color: 'bg-amber-600' },
  { key: 'FLOOD_DAMAGE', labelNe: 'घर डुबान / क्षति', labelEn: 'FLOOD DAMAGE', icon: Home, color: 'bg-purple-600' },
  { key: 'OTHER', labelNe: 'अन्य आपतकाल', labelEn: 'OTHER', icon: HelpCircle, color: 'bg-stone-600' },
];

export const ReportEmergency: React.FC<ReportEmergencyProps> = ({
  location,
  onRequestLocation,
  onReportSubmitted,
  onCancel,
}) => {
  const [inputMode, setInputMode] = useState<'VOICE' | 'TEXT'>('VOICE');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiResult, setAiResult] = useState<AIExtractionResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EmergencyCategory>('TRAPPED');
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [offlineQueuedSuccess, setOfflineQueuedSuccess] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ne-NP'; // Nepali primary

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        if (currentText.trim()) {
          setTranscript((prev) => (prev ? `${prev} ${currentText}` : currentText));
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Failed to initialize speech recognition:', e);
      setSpeechSupported(false);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Could not start recognition:', err);
      }
    }
  };

  // Hackathon Demo Scenario loader as requested:
  // "हामी पाँच जना छौँ। दुई जना बच्चा छन्। घरभित्र पानी पसेको छ र हामी बाहिर निस्कन सकेका छैनौँ।"
  const loadDemoScenario = () => {
    const text = 'हामी पाँच जना छौँ। दुई जना बच्चा छन्। घरभित्र पानी पसेको छ र हामी बाहिर निस्कन सकेका छैनौँ।';
    setTranscript(text);
    handleAnalyzeTranscript(text);
  };

  // AI Extraction of Emergency Situation
  const handleAnalyzeTranscript = async (textToAnalyze?: string) => {
    const content = textToAnalyze || transcript;
    if (!content.trim()) return;

    setIsProcessingAI(true);
    try {
      const hasGps = Boolean(location && location.latitude && location.longitude);
      const result = await aiService.extractEmergencyDetails(content, hasGps);
      setAiResult(result);
      if (result.category) {
        setSelectedCategory(result.category);
      }
    } catch (e) {
      console.warn('AI analysis error:', e);
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    const finalDescription = followUpAnswer
      ? `${transcript} [थप जानकारी: ${followUpAnswer}]`
      : transcript || `${selectedCategory} Emergency reported by citizen`;

    const payload: EmergencyReportPayload = {
      citizen_id: `citizen-${Date.now().toString().slice(-6)}`,
      latitude: location?.latitude || 27.6882,
      longitude: location?.longitude || 85.3015,
      accuracy: location?.accuracy || 15,
      timestamp: new Date().toISOString(),
      emergency_type: 'FLOOD',
      description: finalDescription,
      category: selectedCategory,
      people: aiResult?.people || 1,
      children: aiResult?.children || 0,
      elderly: aiResult?.elderly || 0,
      injured: aiResult?.injured || 0,
      trapped: aiResult?.trapped !== undefined ? aiResult.trapped : true,
      immediate_need: aiResult?.immediate_need || 'RESCUE',
      source: 'citizen_app',
    };

    setSubmitting(true);
    try {
      const res = await emergencyService.submitEmergencyReport(payload);

      if (res.isOffline && res.queued) {
        // Offline confirmation
        setOfflineQueuedSuccess(res.queued.id);
      } else if (res.incident) {
        // Online direct submission confirmation
        onReportSubmitted(res.incident);
      }
    } catch (err) {
      console.warn('Submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // When offline report is saved in local queue
  if (offlineQueuedSuccess) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="bg-amber-500/10 border-2 border-amber-500 rounded-3xl p-6 text-center shadow-lg">
          <div className="w-16 h-16 bg-amber-500 text-stone-950 rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
            <WifiOff className="w-8 h-8" />
          </div>

          <div className="text-xs font-mono font-bold uppercase tracking-widest text-amber-900 mb-1">
            अफलाइन रिपोर्ट सुरक्षित (Offline Queue Saved)
          </div>
          <h2 className="text-2xl font-black text-stone-900 mb-2">
            WAITING FOR CONNECTION
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed mb-4">
            तपाईंको आपतकालीन रिपोर्ट तपाईंको फोनमै सुरक्षित राखिएको छ। इन्टरनेट वा नेटवर्क आउनासाथ यो स्वतः केन्द्रिय उद्धार प्रणालीमा पठाइनेछ।
          </p>
          <div className="bg-white p-3 rounded-xl border border-stone-200 text-xs font-mono text-stone-600 mb-6">
            Queue ID: <span className="font-bold text-stone-900">{offlineQueuedSuccess}</span>
          </div>

          <button
            onClick={onCancel}
            className="w-full py-4 bg-stone-900 text-white font-bold rounded-2xl hover:bg-stone-800 transition-colors cursor-pointer"
          >
            नक्सा र मुख्य पृष्ठमा फर्कनुहोस्
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 p-2 rounded-lg bg-white border border-stone-200 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>रद्द गर्नुहोस् (Cancel)</span>
        </button>

        <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
          EMERGENCY DISPATCH
        </span>
      </div>

      {/* Primary Question Prompt */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Tell us what is happening.
        </h1>
        <p className="text-base font-semibold text-stone-600 mt-1">
          के भइरहेको छ बताउनुहोस्।
        </p>
      </div>

      {/* Two Clear Options: SPEAK or TYPE */}
      <div className="grid grid-cols-2 gap-3">
        <button
          id="btn-mode-speak"
          onClick={() => setInputMode('VOICE')}
          className={`py-3.5 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
            inputMode === 'VOICE'
              ? 'bg-red-600 text-white border-red-700 shadow-md scale-[1.02]'
              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
          }`}
        >
          <Mic className="w-5 h-5" />
          <span>🎤 SPEAK (बोल्नुहोस्)</span>
        </button>

        <button
          id="btn-mode-type"
          onClick={() => setInputMode('TEXT')}
          className={`py-3.5 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
            inputMode === 'TEXT'
              ? 'bg-red-600 text-white border-red-700 shadow-md scale-[1.02]'
              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
          }`}
        >
          <Keyboard className="w-5 h-5" />
          <span>⌨️ TYPE (लेख्नुहोस्)</span>
        </button>
      </div>

      {/* Input Form Section (Voice or Text) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-sm space-y-4">
        {inputMode === 'VOICE' ? (
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            {speechSupported ? (
              <button
                id="btn-toggle-mic"
                onClick={toggleRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl cursor-pointer ${
                  isRecording
                    ? 'bg-red-600 text-white ring-8 ring-red-200 animate-pulse'
                    : 'bg-stone-900 text-white hover:bg-stone-800'
                }`}
                aria-label="Toggle Microphone"
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
            ) : (
              <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                तपाईंको ब्राउजरमा प्रत्यक्ष अडियो रेकर्डर नभएकोले तलको डेमो अडियो बटन वा टाइपिङ प्रयोग गर्नुहोस्।
              </div>
            )}

            <div className="text-sm font-bold text-stone-800">
              {isRecording ? (
                <span className="text-red-600 animate-pulse font-mono">
                  सुन्दैछ... नेपालीमा बोल्नुहोस् (Listening...)
                </span>
              ) : (
                <span>माइक थिचेर नेपालीमा बोल्नुहोस्</span>
              )}
            </div>

            {/* Quick Demo Scenario Button */}
            <button
              id="btn-demo-scenario"
              onClick={loadDemoScenario}
              className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>डेमो अडियो परिदृश्य राख्नुहोस् (Use Demo Voice Scenario)</span>
            </button>
          </div>
        ) : null}

        {/* Transcript / Textarea Input */}
        <div>
          <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5 tracking-wider">
            तपाईंको सन्देश (Emergency Message):
          </label>
          <textarea
            id="emergency-description-input"
            rows={3}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onBlur={() => handleAnalyzeTranscript()}
            placeholder="उदाहरण: हामी ५ जना छौँ, घरमा पानी पसेको छ, तत्काल उद्धार चाहियो..."
            className="w-full p-3.5 rounded-xl border border-stone-300 text-stone-900 text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none resize-none leading-relaxed"
          />

          {transcript.trim() && !aiResult && !isProcessingAI && (
            <button
              id="btn-ai-analyze"
              onClick={() => handleAnalyzeTranscript()}
              className="mt-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>एआईद्वारा विवरण विश्लेषण गर्नुहोस् (Analyze with AI)</span>
            </button>
          )}

          {isProcessingAI && (
            <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mt-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>एआईले सन्देश विश्लेषण गर्दैछ (AI Extracting details)...</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Extracted Structured Summary */}
      {aiResult && (
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono uppercase text-stone-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              एआई निष्कर्ष (AI Extracted Data)
            </span>
            <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
              विश्वसनीयता {Math.round(aiResult.confidence * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2 rounded-xl border border-stone-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>मानिस: <strong>{aiResult.people} जना</strong></span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-stone-200 flex items-center gap-2">
              <Baby className="w-4 h-4 text-amber-600" />
              <span>बच्चा: <strong>{aiResult.children} जना</strong></span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-stone-200 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              <span>घाइते: <strong>{aiResult.injured} जना</strong></span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-stone-200 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-600" />
              <span>अवस्था: <strong className="text-red-600">{aiResult.trapped ? 'फसेको' : 'अन्य'}</strong></span>
            </div>
          </div>

          {/* AI Follow-up Question if critical info is missing */}
          {aiResult.follow_up_question_ne && (
            <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>आवश्यक थप जानकारी (Critical Follow-up Question):</span>
              </div>
              <p className="text-sm font-bold text-amber-950">
                {aiResult.follow_up_question_ne}
              </p>
              <input
                type="text"
                id="follow-up-answer-input"
                value={followUpAnswer}
                onChange={(e) => setFollowUpAnswer(e.target.value)}
                placeholder="यहाँ लेख्नुहोस् (Type answer)..."
                className="w-full p-2.5 bg-white rounded-lg border border-amber-300 text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Simple Emergency Category Fallback */}
      <div>
        <label className="block text-xs font-bold text-stone-600 uppercase mb-2 tracking-wider">
          मुख्य समस्या छान्नुहोस् (Emergency Category):
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-stone-900/20'
                    : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
                    isSelected ? 'bg-red-500' : cat.color
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{cat.labelNe}</div>
                  <div className="text-[10px] opacity-70 font-mono">{cat.labelEn}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmation Checklist Before Submission */}
      <div className="bg-stone-900 text-stone-100 p-4 rounded-2xl space-y-3">
        <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
          उद्धार टोलीमा पठाइने विवरण (Pre-Submission Check)
        </div>

        <div className="space-y-2 text-xs font-medium">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <span>Location (जीपीएस स्थान):</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
              <CheckCircle className="w-3.5 h-3.5" />
              Available ✓ (~{location?.accuracy || 12}m)
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <span>Emergency info (आपतकालीन विवरण):</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              Available ✓
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span>Network connection (इन्टरनेट स्थिति):</span>
            <span className="font-mono text-xs font-semibold">
              {offlineService.isOnline() ? (
                <span className="text-emerald-400">Online (तत्काल दर्ता)</span>
              ) : (
                <span className="text-amber-400">Offline (अफलाइन कतार)</span>
              )}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-stone-400 pt-1 leading-relaxed">
          Your emergency report will be sent to the disaster-response team.
        </p>
      </div>

      {/* FINAL SUBMIT BUTTON */}
      <button
        id="btn-send-emergency-report"
        onClick={handleFinalSubmit}
        disabled={submitting}
        className="w-full py-5 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xl shadow-xl shadow-red-600/30 flex items-center justify-center gap-3 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
      >
        <Send className={`w-6 h-6 ${submitting ? 'animate-bounce' : ''}`} />
        <span>{submitting ? 'पठाउँदैछ...' : 'SEND EMERGENCY REPORT'}</span>
      </button>
    </div>
  );
};
