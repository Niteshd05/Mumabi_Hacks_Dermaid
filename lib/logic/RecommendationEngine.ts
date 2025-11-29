/**
 * Recommendation Engine
 * Implements the "Agentic" logic as described in CONTEXT.md
 * 
 * Key Rules:
 * - High UV + Cosmetic Agent = Block Retinol, Force Sunscreen
 * - High Humidity = Switch to lightweight products
 * - Low Humidity/Dry = Emphasize heavy moisturizers
 * - Dark Skin (Fitzpatrick IV-VI) + Acne = Avoid Benzoyl Peroxide, use Azelaic Acid
 */

import {
  WeatherState,
  UserProfile,
  CosmeticScanResult,
  MedicalScanResult,
  Recommendation,
  DailyRoutine,
  EnvironmentalAlert,
  FitzpatrickScale,
} from '@/lib/types';

// ============================================
// Lookup Tables
// ============================================

interface ProductRecommendation {
  id: string;
  name: string;
  type: 'cleanser' | 'treatment' | 'moisturizer' | 'sunscreen' | 'serum';
  ingredients: string[];
  timeOfDay: 'morning' | 'evening' | 'both';
  blockedConditions?: string[];
  melaninSafe?: boolean; // Safe for Fitzpatrick IV-VI
}

const PRODUCT_DATABASE: ProductRecommendation[] = [
  {
    id: 'cleanser-gentle',
    name: 'Gentle Hydrating Cleanser',
    type: 'cleanser',
    ingredients: ['ceramides', 'hyaluronic acid'],
    timeOfDay: 'both',
    melaninSafe: true,
  },
  {
    id: 'retinol-serum',
    name: 'Retinol Night Serum',
    type: 'treatment',
    ingredients: ['retinol', 'vitamin e'],
    timeOfDay: 'evening',
    blockedConditions: ['high_uv'],
    melaninSafe: true,
  },
  {
    id: 'benzoyl-peroxide',
    name: 'Benzoyl Peroxide Spot Treatment',
    type: 'treatment',
    ingredients: ['benzoyl peroxide'],
    timeOfDay: 'evening',
    melaninSafe: false, // Can cause bleaching on dark skin
  },
  {
    id: 'azelaic-acid',
    name: 'Azelaic Acid Serum',
    type: 'treatment',
    ingredients: ['azelaic acid'],
    timeOfDay: 'both',
    melaninSafe: true, // Safe for PIH treatment
  },
  {
    id: 'niacinamide',
    name: 'Niacinamide Brightening Serum',
    type: 'serum',
    ingredients: ['niacinamide', 'zinc'],
    timeOfDay: 'both',
    melaninSafe: true,
  },
  {
    id: 'moisturizer-light',
    name: 'Lightweight Gel Moisturizer',
    type: 'moisturizer',
    ingredients: ['hyaluronic acid', 'aloe'],
    timeOfDay: 'both',
    melaninSafe: true,
  },
  {
    id: 'moisturizer-heavy',
    name: 'Rich Barrier Repair Cream',
    type: 'moisturizer',
    ingredients: ['ceramides', 'shea butter', 'squalane'],
    timeOfDay: 'both',
    melaninSafe: true,
  },
  {
    id: 'sunscreen-50',
    name: 'SPF 50 Broad Spectrum Sunscreen',
    type: 'sunscreen',
    ingredients: ['zinc oxide', 'titanium dioxide'],
    timeOfDay: 'morning',
    melaninSafe: true,
  },
  {
    id: 'vitamin-c',
    name: 'Vitamin C Brightening Serum',
    type: 'serum',
    ingredients: ['vitamin c', 'ferulic acid'],
    timeOfDay: 'morning',
    melaninSafe: true,
  },
];

// ============================================
// Environmental Alert Generation
// ============================================

export function generateEnvironmentalAlerts(weather: WeatherState): EnvironmentalAlert[] {
  const alerts: EnvironmentalAlert[] = [];

  if (weather.isHighUV) {
    alerts.push({
      id: 'alert-high-uv',
      type: 'uv',
      severity: 'warning',
      title: 'High UV Alert',
      message: `UV Index is ${weather.uvIndex}. Protect your skin from sun damage.`,
      actionRequired: 'Apply SPF 50 sunscreen. Avoid retinol and exfoliants until evening.',
    });
  }

  if (weather.isHighHumidity) {
    alerts.push({
      id: 'alert-high-humidity',
      type: 'humidity',
      severity: 'info',
      title: 'High Humidity Advisory',
      message: `Humidity is at ${weather.humidity}%. Switch to lightweight products.`,
      actionRequired: 'Use gel-based moisturizers to prevent clogged pores.',
    });
  }

  if (weather.isDryWeather) {
    alerts.push({
      id: 'alert-dry-weather',
      type: 'humidity',
      severity: 'warning',
      title: 'Dry Weather Alert',
      message: `Humidity is low at ${weather.humidity}%. Your skin barrier needs extra protection.`,
      actionRequired: 'Use heavier moisturizers and consider adding a hydrating serum.',
    });
  }

  return alerts;
}

// ============================================
// Cosmetic Routine Generation
// ============================================

function isDarkSkinTone(fitzpatrick: FitzpatrickScale): boolean {
  return fitzpatrick >= 4;
}

export function generateCosmeticRoutine(
  scanResult: CosmeticScanResult | null,
  weather: WeatherState,
  user: UserProfile
): DailyRoutine {
  const morning: Recommendation[] = [];
  const evening: Recommendation[] = [];
  const alerts: Recommendation[] = [];

  const isDark = isDarkSkinTone(user.fitzpatrickScale);
  const hasAcne = scanResult?.detected_conditions.some(c => 
    ['acne_vulgaris', 'inflammatory_acne', 'whiteheads', 'blackheads'].includes(c)
  );
  const hasPIH = scanResult?.detected_conditions.includes('pih') || 
                 scanResult?.detected_conditions.includes('hyperpigmentation');

  // Morning Routine
  morning.push({
    id: 'step-1-morning',
    type: 'product',
    title: 'Gentle Cleanser',
    description: 'Start with a hydrating cleanser to remove overnight buildup.',
    priority: 'medium',
    timeOfDay: 'morning',
  });

  // Vitamin C in morning (unless high UV blocks it)
  if (!weather.isHighUV || weather.uvIndex < 10) {
    morning.push({
      id: 'step-2-morning',
      type: 'product',
      title: 'Vitamin C Serum',
      description: 'Antioxidant protection and brightening.',
      priority: 'medium',
      timeOfDay: 'morning',
    });
  }

  // Moisturizer based on humidity
  if (weather.isHighHumidity) {
    morning.push({
      id: 'step-3-morning',
      type: 'product',
      title: 'Lightweight Gel Moisturizer',
      description: 'Humidity is high - using lightweight formula to prevent congestion.',
      priority: 'medium',
      timeOfDay: 'morning',
    });
  } else {
    morning.push({
      id: 'step-3-morning',
      type: 'product',
      title: weather.isDryWeather ? 'Rich Barrier Cream' : 'Daily Moisturizer',
      description: weather.isDryWeather 
        ? 'Extra hydration needed due to dry conditions.'
        : 'Balanced hydration for your skin type.',
      priority: 'medium',
      timeOfDay: 'morning',
    });
  }

  // Sunscreen - ALWAYS in morning, especially high UV
  morning.push({
    id: 'step-4-morning',
    type: weather.isHighUV ? 'alert' : 'product',
    title: weather.isHighUV ? 'SPF 50+ Required' : 'SPF 30+ Sunscreen',
    description: weather.isHighUV 
      ? `UV Index is ${weather.uvIndex}! Maximum protection required.`
      : 'Daily sun protection to prevent damage and dark spots.',
    priority: weather.isHighUV ? 'critical' : 'high',
    timeOfDay: 'morning',
  });

  // Evening Routine
  evening.push({
    id: 'step-1-evening',
    type: 'product',
    title: 'Double Cleanse',
    description: 'Oil cleanser followed by gentle cleanser to remove sunscreen and impurities.',
    priority: 'medium',
    timeOfDay: 'evening',
  });

  // Acne Treatment - Melanin-safe recommendations
  if (hasAcne) {
    if (isDark) {
      // For dark skin: Avoid Benzoyl Peroxide, use Azelaic Acid
      evening.push({
        id: 'step-2-evening',
        type: 'product',
        title: 'Azelaic Acid Treatment',
        description: 'Melanin-safe acne treatment that also helps fade dark spots.',
        priority: 'high',
        timeOfDay: 'evening',
      });
      
      alerts.push({
        id: 'alert-melanin-safe',
        type: 'warning',
        title: 'Melanin-Safe Protocol Active',
        description: 'Using Azelaic Acid instead of Benzoyl Peroxide to prevent hyperpigmentation.',
        priority: 'medium',
      });
    } else {
      evening.push({
        id: 'step-2-evening',
        type: 'product',
        title: 'Acne Treatment',
        description: 'Targeted treatment for active breakouts.',
        priority: 'high',
        timeOfDay: 'evening',
      });
    }
  }

  // PIH/Dark Spots Treatment
  if (hasPIH) {
    evening.push({
      id: 'step-3-evening',
      type: 'product',
      title: 'Niacinamide Serum',
      description: 'Helps fade dark spots and even skin tone safely.',
      priority: 'high',
      timeOfDay: 'evening',
    });
  }

  // Retinol - BLOCKED on high UV days
  if (weather.isHighUV) {
    evening.push({
      id: 'step-retinol-blocked',
      type: 'warning',
      title: 'Retinol Skipped Tonight',
      description: 'High UV exposure today. Retinol increases sun sensitivity - using alternative treatment.',
      priority: 'medium',
      timeOfDay: 'evening',
      isBlocked: true,
      blockedReason: 'High UV Index detected',
    });
  } else {
    evening.push({
      id: 'step-4-evening',
      type: 'product',
      title: 'Retinol Serum',
      description: 'Anti-aging and skin renewal treatment.',
      priority: 'medium',
      timeOfDay: 'evening',
    });
  }

  // Night Moisturizer
  evening.push({
    id: 'step-5-evening',
    type: 'product',
    title: weather.isDryWeather ? 'Overnight Repair Mask' : 'Night Moisturizer',
    description: weather.isDryWeather
      ? 'Intensive overnight hydration for dry conditions.'
      : 'Seal in treatments and hydrate overnight.',
    priority: 'medium',
    timeOfDay: 'evening',
  });

  return { morning, evening, alerts };
}

// ============================================
// Medical Recommendations
// ============================================

export function generateMedicalRecommendations(
  scanResult: MedicalScanResult | null,
  weather: WeatherState
): Recommendation[] {
  if (!scanResult) return [];

  const recommendations: Recommendation[] = [];

  // Normal/healthy skin - no medical recommendations needed
  if (scanResult.condition_match === 'normal') {
    recommendations.push({
      id: 'medical-normal',
      type: 'action',
      title: 'Maintain Healthy Skin',
      description: 'Your skin appears healthy! Continue with your regular skincare routine and maintain good sun protection habits.',
      priority: 'low',
    });
    return recommendations;
  }

  // High Risk - Immediate attention
  if (scanResult.risk_flag === 'high') {
    recommendations.push({
      id: 'medical-high-risk',
      type: 'alert',
      title: 'Immediate Attention Required',
      description: 'This scan shows indicators that require professional evaluation. Please consult a dermatologist as soon as possible.',
      priority: 'critical',
    });
    
    // Don't add product recommendations for high risk
    return recommendations;
  }

  // Condition-specific recommendations
  switch (scanResult.condition_match) {
    case 'atopic_dermatitis':
    case 'eczema':
      recommendations.push({
        id: 'medical-eczema-1',
        type: 'action',
        title: 'Moisturize Frequently',
        description: 'Apply fragrance-free moisturizer multiple times daily, especially after washing.',
        priority: 'high',
      });
      recommendations.push({
        id: 'medical-eczema-2',
        type: 'action',
        title: 'Avoid Hot Showers',
        description: 'Use lukewarm water to prevent further irritation and moisture loss.',
        priority: 'medium',
      });
      if (weather.isDryWeather) {
        recommendations.push({
          id: 'medical-eczema-dry',
          type: 'warning',
          title: 'Dry Weather Warning',
          description: 'Low humidity can worsen eczema. Consider using a humidifier indoors.',
          priority: 'high',
        });
      }
      break;

    case 'psoriasis':
      recommendations.push({
        id: 'medical-psoriasis-1',
        type: 'action',
        title: 'Keep Skin Moisturized',
        description: 'Apply thick, fragrance-free moisturizers to affected areas.',
        priority: 'high',
      });
      recommendations.push({
        id: 'medical-psoriasis-2',
        type: 'action',
        title: 'Monitor Triggers',
        description: 'Track stress levels, diet, and weather changes that may cause flares.',
        priority: 'medium',
      });
      break;

    case 'fungal_infection':
      recommendations.push({
        id: 'medical-fungal-1',
        type: 'action',
        title: 'Keep Area Dry',
        description: 'Fungal infections thrive in moisture. Keep the affected area clean and dry.',
        priority: 'high',
      });
      recommendations.push({
        id: 'medical-fungal-2',
        type: 'product',
        title: 'Antifungal Treatment',
        description: 'Consider over-the-counter antifungal cream. If no improvement in 2 weeks, see a doctor.',
        priority: 'high',
      });
      break;

    case 'hives':
      recommendations.push({
        id: 'medical-hives-1',
        type: 'action',
        title: 'Identify Triggers',
        description: 'Note any new foods, medications, or environmental factors.',
        priority: 'high',
      });
      recommendations.push({
        id: 'medical-hives-2',
        type: 'action',
        title: 'Cool Compress',
        description: 'Apply cool, damp cloth to reduce itching and swelling.',
        priority: 'medium',
      });
      break;
  }

  // Add follow-up recommendation for medium risk
  if (scanResult.risk_flag === 'medium') {
    recommendations.push({
      id: 'medical-followup',
      type: 'action',
      title: 'Schedule Appointment',
      description: 'Consider scheduling a non-urgent dermatologist appointment if symptoms persist.',
      priority: 'medium',
    });
  }

  return recommendations;
}

// ============================================
// Main Engine Export
// ============================================

export const RecommendationEngine = {
  generateEnvironmentalAlerts,
  generateCosmeticRoutine,
  generateMedicalRecommendations,
  isDarkSkinTone,
};

export default RecommendationEngine;

