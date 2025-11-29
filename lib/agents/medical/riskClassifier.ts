import type { MedicalCondition, RiskFlag } from '@/lib/types';

export interface RiskLevel {
  level: 'high' | 'medium' | 'low';
  requiresDermatologist: boolean;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

const HIGH_RISK_CONDITIONS: MedicalCondition[] = [
  'skin_cancer', 'melanoma', 'bcc', 'scc',
  'actinic_keratosis',
  'lupus',
  'vasculitis',
  'bullous',
  'drug_eruption',
];

const MEDIUM_RISK_CONDITIONS: MedicalCondition[] = [
  'psoriasis',
  'vitiligo',
  'lichen',
  'moles', 'nevus',
  'vascular_tumors',
  'sun_damage',
  'benign_tumors',
];

const LOW_RISK_CONDITIONS: MedicalCondition[] = [
  'acne',
  'rosacea',
  'eczema', 'atopic_dermatitis',
  'tinea', 'ringworm',
  'candidiasis',
  'warts',
  'seborrheic_keratosis',
  'infestations', 'bites',
  'fungal_infection',
  'hives',
  'normal',
];

export function classifyMedicalRisk(condition: MedicalCondition): RiskLevel {
  if (HIGH_RISK_CONDITIONS.includes(condition)) {
    return {
      level: 'high',
      requiresDermatologist: true,
      urgency: condition === 'skin_cancer' || condition === 'melanoma' ? 'critical' : 'high',
      message: 'This condition requires immediate medical evaluation. Please consult a dermatologist as soon as possible.',
    };
  }

  if (MEDIUM_RISK_CONDITIONS.includes(condition)) {
    return {
      level: 'medium',
      requiresDermatologist: true,
      urgency: 'medium',
      message: 'This condition should be evaluated by a dermatologist to confirm diagnosis and discuss treatment options.',
    };
  }

  if (LOW_RISK_CONDITIONS.includes(condition)) {
    return {
      level: 'low',
      requiresDermatologist: false,
      urgency: 'low',
      message: condition === 'normal' 
        ? 'No concerning conditions detected. Your skin appears healthy!' 
        : 'This condition can typically be managed with proper skincare and over-the-counter treatments.',
    };
  }

  // Default to medium risk if unknown
  return {
    level: 'medium',
    requiresDermatologist: true,
    urgency: 'medium',
    message: 'We recommend consulting a dermatologist for proper evaluation and treatment.',
  };
}

export function getTipsForCondition(condition: MedicalCondition): string[] {
  const tips: Record<string, string[]> = {
    // High risk general tips
    default_high: [
      'Schedule an appointment with a dermatologist as soon as possible',
      'Take clear photos of the affected area to track any changes',
      'Avoid self-medication until you have a professional diagnosis',
      'Protect the area from sun exposure',
    ],
    // Medium risk
    psoriasis: [
      'Keep skin moisturized with thick creams',
      'Avoid triggers like stress and certain medications',
      'Consider phototherapy or prescription treatments',
    ],
    // Low risk
    acne: [
      'Cleanse gently twice daily',
      'Use non-comedogenic products',
      'Avoid picking or squeezing',
      'Consider products with salicylic acid or benzoyl peroxide',
    ],
    eczema: [
      'Moisturize frequently with fragrance-free lotions',
      'Avoid hot showers and harsh soaps',
      'Identify and avoid triggers',
      'Use over-the-counter hydrocortisone for flare-ups',
    ],
    fungal_infection: [
      'Keep the area clean and dry',
      'Apply over-the-counter antifungal cream',
      'Avoid sharing towels or clothing',
      'Wear breathable fabrics',
    ],
  };

  const risk = classifyMedicalRisk(condition);
  
  if (risk.level === 'high' || risk.level === 'medium') {
    return tips.default_high;
  }

  return tips[condition] || tips.default_high;
}

