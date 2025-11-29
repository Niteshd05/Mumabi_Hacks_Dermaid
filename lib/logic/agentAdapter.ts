import { CosmeticScanResult, MedicalScanResult, WeatherState, UserProfile } from '@/lib/types';
import { AgentResponse, AgentPersona, AgentAction } from '@/lib/types/agent';
import { RecommendationEngine } from './RecommendationEngine';

/**
 * Generate basic medical message
 */
function generateMedicalMessage(scan: MedicalScanResult): string {
  if (scan.risk_flag === 'high') {
    return `I've detected signs of ${scan.condition_match.replace(/_/g, ' ')}. This requires professional evaluation.`;
  }
  if (scan.risk_flag === 'medium') {
    return `I see potential signs of ${scan.condition_match.replace(/_/g, ' ')}. It's best to get this checked by a dermatologist.`;
  }
  if (scan.condition_match === 'normal') {
    return "Your skin looks healthy! No medical concerns detected.";
  }
  return `I've detected ${scan.condition_match.replace(/_/g, ' ')}. Let's see how we can manage this.`;
}

/**
 * Convert medical scan to AgentResponse with risk-based routing
 */
export function fromMedicalScan(
  scan: MedicalScanResult,
  user: UserProfile,
  weather: WeatherState
): AgentResponse {
  const baseMessage = generateMedicalMessage(scan);

  // Fire-and-forget server execution for medical agent via API
  (async () => {
    try {
      const res = await fetch('/api/agents/medical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          scan,
          userProfile: user,
          weather,
          history: [], // Initial turn, no history
        }),
      });

      if (res.ok) {
        const out = await res.json(); // MedicalAgentOutput
        
        // Store the agent's response (Text, Question, or Final)
        const { saveAgentMessage } = await import('@/lib/firebase/agent');
        
        await saveAgentMessage(user.id, {
          agentType: 'medical',
          tone: 'clinical',
          message: out.message,
          type: out.type || 'text', // 'question' or 'text'
          options: out.options, // Choices for question
          thoughtProcess: out.thoughtProcess, // Visual thinking steps
          meta: {
            severity: out.urgency === 'critical' ? 'danger' : out.urgency === 'high' ? 'warning' : 'info',
            timestamp: new Date(),
            triggeredBy: 'scan',
            riskLevel: out.riskLevel,
            requiresDermatologist: out.requiresDermatologist,
            urgency: out.urgency,
            tips: out.tips,
            products: out.products,
          },
        } as any);
      }
    } catch (err) {
      console.error('Medical agent error:', err);
    }
  })();

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
  }

  return {
    id: `medical-${Date.now()}`,
    agentType: 'medical',
    tone: 'clinical',
    message: baseMessage, // Immediate feedback while agent thinks
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
      id: 'view-routine',
      label: 'View Updates',
      intent: 'apply_routine',
      variant: 'default',
    }
  ];

  return {
    id: `env-${Date.now()}`,
    agentType,
    tone: 'friendly',
    message,
    alerts: alerts.length > 0 ? alerts : undefined,
    actions,
    meta: {
      severity: 'info',
      timestamp: new Date(),
      triggeredBy: 'environment',
    },
  };
}

/**
 * Convert cosmetic scan to AgentResponse
 */
export function fromCosmeticScan(
  scan: CosmeticScanResult,
  user: UserProfile,
  weather: WeatherState
): AgentResponse {
  // Generate initial message (simple fallback while agent processes)
  const detected = scan.detected_conditions.map(c => c.replace(/_/g, ' '));
  const detectedStr = detected.join(', ');
  let baseMessage: string;
  if (detectedStr) {
    baseMessage = `I'm analyzing your scan results showing ${detectedStr}. Let me create a personalized routine for you.`;
  } else {
    baseMessage = `I'm analyzing your scan results. Let me create a personalized routine for you.`;
  }
  
  const highlights: string[] = [];
  if (detected.length > 0) {
    highlights.push(`Detected: ${detectedStr}`);
  }

  const actions: AgentAction[] = [
    {
      id: 'apply-routine',
      label: 'View Routine',
      intent: 'apply_routine',
      variant: 'default',
    }
  ];

  // Optional predicted age from face-api.js injected by scan page
  let predictedAge: number | undefined = undefined;
  try {
    if (typeof window !== 'undefined') {
      const g: any = window as any;
      if (typeof g.__faceAge === 'number') {
        predictedAge = g.__faceAge;
      }
    }
  } catch {}

  // Fire-and-forget server execution via API so planner (Gemini) runs with server env
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  (async () => {
    try {
      let location: { lat: number; lon: number } | undefined = undefined;
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        try {
          location = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
              () => resolve(undefined),
              { maximumAge: 60_000, timeout: 3_000 }
            );
          }) as any;
        } catch {
          location = undefined;
        }
      }
      
      const res = await fetch('/api/agents/cosmetic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          scan,
          userProfile: user,
          location,
          predictedAge,
          history: [], // Initial turn, no history
          weather,
        }),
      });
      if (res.ok) {
        const out = await res.json();
        
        // Save agent message (question or final)
        const { saveAgentMessage } = await import('@/lib/firebase/agent');
        await saveAgentMessage(user.id, {
          agentType: 'cosmetic',
          tone: 'friendly',
          message: out.message,
          type: out.type || 'text',
          options: out.options,
          thoughtProcess: out.thoughtProcess,
          meta: {
            severity: 'info',
            confidence: scan.confidence,
            triggeredBy: 'scan',
          },
        } as any);
        
        // Save recommendation bundle (only if final)
        if (out.type === 'final') {
          const { saveRecommendationLog } = await import('@/lib/firebase/firestore');
          await saveRecommendationLog(user.id, {
            agentType: 'cosmetic',
            recommendations: {
              routine: out?.routine,
              products: out?.topProducts,
            },
            scanResult: scan,
            notes: out?.notes,
            trace: out?.trace,
            skinScore: out?.skinScore,
          } as any);
        }
      }
    } catch {
      // ignore errors; message already rendered
    }
  })();

  return {
    id: `cosmetic-${Date.now()}`,
    agentType: 'cosmetic',
    tone: 'friendly',
    message: baseMessage,
    highlights: highlights.length > 0 ? highlights : undefined,
    alerts: undefined, // cosmetic alerts generated by server now
    actions,
    meta: {
      severity: scan.severity_score > 0.7 ? 'warning' : 'info',
      confidence: scan.confidence,
      timestamp: new Date(),
      triggeredBy: 'scan',
    },
  };
}

// Export AgentAdapter object for backward compatibility
export const AgentAdapter = {
  fromMedicalScan,
  fromCosmeticScan,
  fromEnvironmentalChange,
};
