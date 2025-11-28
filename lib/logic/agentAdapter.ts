/**
 * Agent Adapter
 * Converts RecommendationEngine outputs and scan results into AgentResponse format
 */

import {
  AgentResponse,
  AgentAction,
  AgentPersona,
  AgentTone,
  RoutineDiff,
} from '@/lib/types/agent';
import {
  DailyRoutine,
  CosmeticScanResult,
  MedicalScanResult,
  WeatherState,
  UserProfile,
  EnvironmentalAlert,
  Recommendation,
} from '@/lib/types';
import { RecommendationEngine } from './RecommendationEngine';

/**
 * Generate friendly cosmetic message based on scan results
 */
function generateCosmeticMessage(
  scan: CosmeticScanResult,
  user: UserProfile,
  weather: WeatherState
): string {
  const { detected_conditions, severity_score } = scan;
  const hasAcne = detected_conditions.some(c => 
    ['acne_vulgaris', 'inflammatory_acne'].includes(c)
  );
  const hasPIH = detected_conditions.includes('pih') || detected_conditions.includes('hyperpigmentation');
  const isDarkSkin = user.fitzpatrickScale >= 4;

  if (severity_score < 0.3) {
    return "Your skin is looking great! Let's maintain this healthy glow with your current routine. ✨";
  }

  if (hasAcne && hasPIH && isDarkSkin) {
    return "I noticed some active breakouts and dark spots. Good news: I've adapted your routine with melanin-safe treatments that tackle both concerns without causing more hyperpigmentation.";
  }

  if (hasAcne) {
    if (weather.isHighUV) {
      return "I see some active acne, but the UV index is high today! I've adjusted your routine to protect your skin from sun damage while treating breakouts in the evening.";
    }
    return "I've detected some breakouts. Let's treat them gently with products that won't irritate your skin barrier.";
  }

  if (hasPIH) {
    return "I can see some dark spots from past breakouts. I've included brightening treatments that are safe for your skin tone to help fade them over time.";
  }

  return "I've analyzed your skin and personalized your routine based on what I see. Let's work together to improve your skin health!";
}

/**
 * Generate clinical medical message based on scan results
 */
function generateMedicalMessage(scan: MedicalScanResult): string {
  const { condition_match, risk_flag } = scan;

  if (risk_flag === 'high') {
    return "⚠️ I've detected visual markers that require immediate professional attention. Please consult a dermatologist as soon as possible. Your health is our priority.";
  }

  const conditionName = condition_match.replace(/_/g, ' ');

  if (risk_flag === 'medium') {
    return `I've identified patterns consistent with ${conditionName}. While this appears manageable, I recommend scheduling a non-urgent appointment with a dermatologist to confirm and get appropriate treatment.`;
  }

  return `This looks like ${conditionName}, which appears to be mild. I've prepared some care recommendations to help manage it. Let's monitor this together and track any changes.`;
}

/**
 * Compare routines to detect changes
 */
function detectRoutineDiff(
  previousRoutine: DailyRoutine | null,
  newRoutine: DailyRoutine
): RoutineDiff | undefined {
  if (!previousRoutine) return undefined;

  const allPrevious = [...previousRoutine.morning, ...previousRoutine.evening];
  const allNew = [...newRoutine.morning, ...newRoutine.evening];

  const blocked = allNew.filter(r => r.isBlocked);
  const added = allNew.filter(r => 
    !r.isBlocked && !allPrevious.some(p => p.id === r.id)
  );
  const removed = allPrevious.filter(p => 
    !allNew.some(n => n.id === p.id)
  );

  if (blocked.length === 0 && added.length === 0 && removed.length === 0) {
    return undefined;
  }

  return {
    added,
    removed,
    blocked,
    modified: [],
  };
}

/**
 * Convert cosmetic scan to AgentResponse
 */
export function fromCosmeticScan(
  scan: CosmeticScanResult,
  user: UserProfile,
  weather: WeatherState,
  previousRoutine?: DailyRoutine | null
): AgentResponse {
  const newRoutine = RecommendationEngine.generateCosmeticRoutine(scan, weather, user);
  const alerts = RecommendationEngine.generateEnvironmentalAlerts(weather);
  const routineDiff = detectRoutineDiff(previousRoutine || null, newRoutine);

  const highlights: string[] = [];
  
  if (scan.detected_conditions.includes('pih') && user.fitzpatrickScale >= 4) {
    highlights.push('Using melanin-safe treatments to prevent further dark spots');
  }
  
  if (weather.isHighUV) {
    highlights.push('Adjusted routine for high UV protection');
  }

  if (weather.isDryWeather) {
    highlights.push('Added extra hydration for dry weather conditions');
  }

  const actions: AgentAction[] = [
    {
      id: 'view-routine',
      label: 'View Full Routine',
      intent: 'apply_routine',
      variant: 'default',
    },
  ];

  if (scan.severity_score > 0.5) {
    actions.push({
      id: 'set-reminder',
      label: 'Check Again in 1 Week',
      intent: 'set_reminder',
      variant: 'outline',
      payload: { days: 7 },
    });
  }

  return {
    id: `cosmetic-${Date.now()}`,
    agentType: 'cosmetic',
    tone: 'friendly',
    message: generateCosmeticMessage(scan, user, weather),
    highlights: highlights.length > 0 ? highlights : undefined,
    alerts: alerts.length > 0 ? alerts : undefined,
    actions,
    routineDiff,
    meta: {
      severity: scan.severity_score > 0.7 ? 'warning' : 'info',
      confidence: scan.confidence,
      timestamp: new Date(),
      triggeredBy: 'scan',
    },
  };
}

/**
 * Convert medical scan to AgentResponse
 */
export function fromMedicalScan(
  scan: MedicalScanResult,
  weather: WeatherState
): AgentResponse {
  const recommendations = RecommendationEngine.generateMedicalRecommendations(scan, weather);

  const highlights: string[] = [];
  
  if (scan.visual_markers.length > 0) {
    highlights.push(`Visual markers: ${scan.visual_markers.join(', ')}`);
  }

  const actions: AgentAction[] = [];

  if (scan.risk_flag === 'high') {
    actions.push({
      id: 'find-doctor',
      label: 'Find Dermatologist',
      intent: 'view_education',
      variant: 'destructive',
    });
  } else {
    actions.push({
      id: 'set-reminder',
      label: 'Remind Me in 3 Days',
      intent: 'set_reminder',
      variant: 'default',
      payload: { days: 3 },
    });
    
    if (scan.risk_flag === 'medium') {
      actions.push({
        id: 'view-education',
        label: 'Learn More',
        intent: 'view_education',
        variant: 'outline',
      });
    }
  }

  return {
    id: `medical-${Date.now()}`,
    agentType: 'medical',
    tone: 'clinical',
    message: generateMedicalMessage(scan),
    highlights: highlights.length > 0 ? highlights : undefined,
    actions,
    meta: {
      severity: scan.risk_flag === 'high' ? 'danger' : scan.risk_flag === 'medium' ? 'warning' : 'info',
      timestamp: new Date(),
      triggeredBy: 'scan',
    },
  };
}

/**
 * Convert environmental change to AgentResponse
 */
export function fromEnvironmentalChange(
  weather: WeatherState,
  user: UserProfile,
  agentType: AgentPersona
): AgentResponse {
  const alerts = RecommendationEngine.generateEnvironmentalAlerts(weather);
  
  let message = "The weather conditions have changed. I've updated your recommendations accordingly.";
  
  if (weather.isHighUV) {
    message = "Heads up! The UV index just spiked. I'm pausing any sun-sensitive treatments and emphasizing SPF protection today. Your skin will thank you! ☀️";
  } else if (weather.isDryWeather) {
    message = "It's getting dry out there! I've switched your routine to include richer moisturizers to protect your skin barrier from moisture loss.";
  } else if (weather.isHighHumidity) {
    message = "High humidity alert! I've swapped in lightweight products to keep your pores clear and prevent congestion.";
  }

  const actions: AgentAction[] = [
    {
      id: 'view-changes',
      label: 'See What Changed',
      intent: 'apply_routine',
      variant: 'default',
    },
    {
      id: 'dismiss',
      label: 'Got It',
      intent: 'dismiss',
      variant: 'outline',
    },
  ];

  return {
    id: `env-${Date.now()}`,
    agentType,
    tone: agentType === 'cosmetic' ? 'friendly' : 'clinical',
    message,
    alerts: alerts.length > 0 ? alerts : undefined,
    actions,
    meta: {
      severity: weather.isHighUV ? 'warning' : 'info',
      timestamp: new Date(),
      triggeredBy: 'environment',
    },
  };
}

/**
 * Convert onboarding completion to AgentResponse
 */
export function fromOnboardingComplete(user: UserProfile): AgentResponse {
  const message = `Welcome aboard, ${user.name}! 🎉 I'm excited to be your skin health companion. I've set up a personalized routine based on your profile. Let's start your journey to healthier, happier skin!`;

  const highlights = [
    `Optimized for ${user.skinType} skin`,
    `Melanin-safe recommendations for Fitzpatrick Type ${user.fitzpatrickScale}`,
    `Focused on: ${user.concerns.map(c => c.replace('-', ' ')).join(', ')}`,
  ];

  const actions: AgentAction[] = [
    {
      id: 'start-scan',
      label: 'Take Your First Scan',
      intent: 'start_scan',
      variant: 'default',
    },
    {
      id: 'view-dashboard',
      label: 'Explore Dashboard',
      intent: 'apply_routine',
      variant: 'outline',
    },
  ];

  return {
    id: `onboarding-${Date.now()}`,
    agentType: 'neutral',
    tone: 'friendly',
    message,
    highlights,
    actions,
    meta: {
      severity: 'info',
      timestamp: new Date(),
      triggeredBy: 'onboarding',
    },
  };
}

export const AgentAdapter = {
  fromCosmeticScan,
  fromMedicalScan,
  fromEnvironmentalChange,
  fromOnboardingComplete,
};

export default AgentAdapter;

