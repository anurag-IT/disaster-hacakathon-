import React from 'react';
import {
  ShieldAlert,
  ArrowUpCircle,
  BatteryCharging,
  Waves,
  Users,
  Radio,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';

export const Safety: React.FC = () => {
  const instructions = [
    {
      icon: ArrowUpCircle,
      titleNe: 'उच्च वा सुरक्षित स्थानमा जानुहोस्',
      titleEn: 'Move to a safer/higher location',
      descNe: 'आधिकारिक निर्देशन प्राप्त हुनासाथ खोला किनार छोडी सुरक्षित उच्च भूभाग वा राहत शिविरमा जानुहोस्।',
      descEn: 'Move immediately to higher ground or assigned relief shelters if instructed by authorities.',
      badge: 'URGENT',
    },
    {
      icon: BatteryCharging,
      titleNe: 'फोनको ब्याट्री जोगाउनुहोस्',
      titleEn: 'Keep your phone charged and saved',
      descNe: 'मोबाइल पावर सेभिङ मोडमा राख्नुहोस्, अनावश्यक एप र भिडियो बन्द गरी उद्धार टोलीसँगको सम्पर्कका लागि ब्याट्री सुरक्षित गर्नुहोस्।',
      descEn: 'Switch phone to battery saver mode to ensure emergency communication remains possible.',
      badge: 'POWER',
    },
    {
      icon: Waves,
      titleNe: 'बग्दै गरेको बाढीमा कहिल्यै नपस्नुहोस्',
      titleEn: 'Avoid entering moving floodwater',
      descNe: 'केवल ६ इन्चको तीव्र पानीले मानिसलाई बगाउन सक्छ। पानी जमेका सडक तथा भत्किएका पुलबाट टाढा रहनुहोस्।',
      descEn: 'Just 6 inches of fast-moving water can sweep you away. Never attempt to walk or drive through floodwater.',
      badge: 'HAZARD',
    },
    {
      icon: Users,
      titleNe: 'बालबालिका र ज्येष्ठ नागरिकसँगै बस्नुहोस्',
      titleEn: 'Stay with vulnerable family members',
      descNe: 'बालबालिका, अपाङ्गता भएका व्यक्ति तथा ज्येष्ठ नागरिकलाई सुरक्षित कोठा वा अग्लो स्थानमा राख्नुहोस् र सँगै रहनुहोस्।',
      descEn: 'Keep children, seniors, and injured individuals close and help them reach safe structures.',
      badge: 'CARE',
    },
    {
      icon: Radio,
      titleNe: 'आधिकारिक निर्देशनहरूको पालना गर्नुहोस्',
      titleEn: 'Follow official emergency instructions',
      descNe: 'रेडियो, स्थानीय प्रशासन र आधिकारिक सूचनाहरू मात्र सुन्नुहोस्। सामाजिक सञ्जालको अफवाहमा विश्वास नगर्नुहोस्।',
      descEn: 'Rely on official alerts from local disaster management personnel and radio broadcasts.',
      badge: 'VERIFIED',
    },
  ];

  const emergencyContacts = [
    { name: 'बाढी पूर्वसूचना (Flood Alert Toll-Free)', number: '1155' },
    { name: 'नेपाल प्रहरी (Nepal Police Emergency)', number: '100' },
    { name: 'सशस्त्र प्रहरी बल (Armed Police Disaster Rescue)', number: '1114' },
    { name: 'एम्बुलेन्स सेवा (Nepal Ambulance Service)', number: '102' },
    { name: 'रेडक्रस उद्धार (Red Cross Blood & Rescue)', number: '1130' },
  ];

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-12">
      {/* Title */}
      <div>
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full inline-block mb-2">
          CITIZEN PROTOCOL
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          SAFETY INSTRUCTIONS
        </h1>
        <p className="text-sm font-semibold text-stone-600 mt-1">
          बाढी आपतकालीन सुरक्षा निर्देशनहरू
        </p>
      </div>

      {/* Instructions list */}
      <div className="space-y-3">
        {instructions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold text-stone-900 leading-snug">
                    {item.titleNe}
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {item.descNe}
                </p>
                <p className="text-[11px] text-stone-400 font-mono mt-1">
                  {item.titleEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Emergency Contacts card */}
      <div className="bg-stone-900 text-stone-100 p-5 rounded-2xl space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
          <PhoneCall className="w-4 h-4" />
          <span>आकस्मिक सम्पर्क नम्बरहरू (Emergency Hotlines)</span>
        </div>

        <div className="space-y-2 text-xs pt-1 divide-y divide-stone-800">
          {emergencyContacts.map((contact, i) => (
            <div key={i} className="flex items-center justify-between pt-2">
              <span className="text-stone-300">{contact.name}</span>
              <a
                href={`tel:${contact.number}`}
                className="font-mono font-bold text-sm text-amber-400 hover:text-amber-300 px-2 py-0.5 bg-stone-800 rounded transition-colors"
              >
                {contact.number}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
