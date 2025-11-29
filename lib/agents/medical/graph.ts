import type { MedicalScanResult, UserProfile, WeatherState } from '@/lib/types';
import { classifyMedicalRisk, getTipsForCondition } from './riskClassifier';
import { findProductsByActives } from '@/lib/agents/tools/productCatalog';
import { filterSuitableProducts, computeActivesForCondition } from '@/lib/agents/tools/suitability';
import { planMedicalNextStep, MedicalNextStep, generateFinalMessage } from '@/lib/agents/llm/gemini';

export interface MedicalAgentInput {
  userId: string;
  scan: MedicalScanResult;
  userProfile?: UserProfile | null;
  weather?: WeatherState;
  history?: Array<{ role: 'agent' | 'user'; content: string }>; // Chat history for context
}

export interface MedicalAgentOutput {
  // Interaction
  type: 'text' | 'question' | 'final';
  message: string;
  options?: string[];
  
  // State updates (to be sent back by client next time)
  thoughtProcess?: string[];

  // Final Result (only if type === 'final')
  riskLevel?: 'high' | 'medium' | 'low';
  requiresDermatologist?: boolean;
  urgency?: 'critical' | 'high' | 'medium' | 'low';
  tips?: string[];
  products?: Array<{ product_id: string; product_name: string }>;
}

export async function runMedicalAgent(input: MedicalAgentInput): Promise<MedicalAgentOutput> {
  const { scan, userProfile, weather, history = [] } = input;
  const thoughtProcess: string[] = [];

  // 1. Immediate Risk Check (Safety First)
  // If high risk, we bypass the agentic loop and refer immediately.
  const risk = classifyMedicalRisk(scan.condition_match);
  if (risk.requiresDermatologist && risk.level === 'high') {
    const tips = getTipsForCondition(scan.condition_match);
    return {
      type: 'final',
      message: risk.message,
      riskLevel: risk.level,
      requiresDermatologist: true,
      urgency: risk.urgency,
      tips,
      thoughtProcess: ['Detected high-risk condition. Immediate referral required.'],
    };
  }

  // 2. Agentic Planning Loop (for Low/Medium risk)
  // We ask the LLM what to do next based on history.
  
  // Prepare context for planner
  const scanContext = `${scan.condition_match} (Risk: ${risk.level})`;
  const knownInfo = {
    weather: weather ? `Humidity: ${weather.humidity}%, UV: ${weather.uvIndex}` : 'Unknown',
    user: userProfile ? `${userProfile.skinType}, Fitzpatrick ${userProfile.fitzpatrickScale}` : 'Unknown',
  };

  thoughtProcess.push('Analyzing scan results and history...');
  
  console.log('[Medical Agent] History received:', JSON.stringify(history, null, 2));
  
  // Extract last items for use throughout the function
  const lastItem = history.length > 0 ? history[history.length - 1] : null;
  const secondLastItem = history.length > 1 ? history[history.length - 2] : null;
  
  // Check if we just received an answer (last two items: agent question + user answer)
  const justReceivedAnswer = history.length >= 2 && 
    secondLastItem?.role === 'agent' && 
    lastItem?.role === 'user';
  
  // Count questions asked and answers given - be very explicit
  const questionsAsked = history.filter(h => h && h.role === 'agent').length;
  const answersGiven = history.filter(h => h && h.role === 'user').length;
  const hasUserAnswer = answersGiven > 0 || (lastItem && lastItem.role === 'user');
  
  console.log('[Medical Agent] Analysis:', { 
    justReceivedAnswer, 
    questionsAsked, 
    answersGiven,
    hasUserAnswer,
    historyLength: history.length,
    lastItem: lastItem?.role,
    secondLastItem: secondLastItem?.role,
    lastItemContent: lastItem?.content?.substring(0, 50),
    secondLastItemContent: secondLastItem?.content?.substring(0, 50),
    fullHistory: JSON.stringify(history)
  });
  
  // Let the LLM reason about the user's answer
  // We'll call the planner and let it decide, but prevent asking the SAME question again
  let shouldCallPlanner = true;
  let lastQuestionAsked = null;
  
  if (justReceivedAnswer && secondLastItem) {
    lastQuestionAsked = secondLastItem.content;
    thoughtProcess.push('Received your answer. Reasoning about your response...');
  }
  
  if (history.length === 0) {
    // No history - this is the first turn, ask a question
    const plan = await planMedicalNextStep({
      scanResult: scanContext,
      history,
      knownInfo
    });

    thoughtProcess.push(`Decision: ${plan.reason}`);

    if (plan.action === 'ask_user') {
      return {
        type: 'question',
        message: plan.question || 'Could you tell me more about your symptoms?',
        options: plan.options || ['Yes', 'No'],
        thoughtProcess,
      };
    } else if (plan.action === 'check_weather') {
      thoughtProcess.push('Checked environmental factors.');
    } else if (plan.action === 'search_knowledge') {
      thoughtProcess.push(`Searching medical knowledge for: ${plan.query}`);
    }
    // Fall through to finalize for other actions
  } else {
    // History exists - let the LLM reason about it (including user answers)
    console.log('[Medical Agent] Calling planner with history to reason about user response...');
    const plan = await planMedicalNextStep({
      scanResult: scanContext,
      history, // Includes user's answer - LLM can reason about it
      knownInfo
    });

    thoughtProcess.push(`Reasoning: ${plan.reason}`);

    if (plan.action === 'ask_user') {
      const proposedQuestion = plan.question || 'Could you tell me more about your symptoms?';
      
      // Prevent asking the SAME question that was just answered
      if (lastQuestionAsked && proposedQuestion.toLowerCase().includes(lastQuestionAsked.toLowerCase().split(' ')[0])) {
        console.log('[Medical Agent] Planner wants to ask same question again, forcing finalize instead');
        thoughtProcess.push('Already asked this question. Finalizing based on your previous answer...');
        // Fall through to finalize
      } else if (questionsAsked >= 2) {
        // Limit to 2 questions max
        console.log('[Medical Agent] Already asked 2 questions, forcing finalize');
        thoughtProcess.push('Gathered enough information. Finalizing diagnosis...');
        // Fall through to finalize
      } else {
        // Different question - allow it
        return {
          type: 'question',
          message: proposedQuestion,
          options: plan.options || ['Yes', 'No'],
          thoughtProcess,
        };
      }
    } else if (plan.action === 'check_weather') {
      thoughtProcess.push('Checked environmental factors.');
    } else if (plan.action === 'search_knowledge') {
      thoughtProcess.push(`Searching medical knowledge for: ${plan.query}`);
    }
    // Fall through to finalize for 'finalize' action or after other actions
  }

  // 4. Finalize (Product Recs or Advice)
  const user = userProfile || { skinType: 'combination', fitzpatrickScale: 3 };
  
  // Map condition to actives
  const conditionForActives = mapMedicalToSkincare(scan.condition_match);
  const decision = computeActivesForCondition(
    conditionForActives,
    { skinType: user.skinType, fitzpatrickScale: user.fitzpatrickScale || 3 },
    weather || { uvIndex: 0, humidity: 50, temperature: 20, isHighUV: false, isHighHumidity: false, isDryWeather: false }
  );
  
  // Find products
  const candidates = await findProductsByActives(decision.recommended, { limit: 20, mustIncludeAll: false });
  const suitable = filterSuitableProducts(candidates, decision, 5);
  
  const products = suitable.slice(0, 5).map(s => ({
    product_id: s.product.product_id,
    product_name: s.product.product_name,
  }));

  const tips = getTipsForCondition(scan.condition_match);

  // Generate personalized message using LLM based on reasoning
  const userAnswer = lastItem?.role === 'user' ? lastItem.content : undefined;
  const lastQuestion = secondLastItem?.role === 'agent' ? secondLastItem.content : undefined;
  
  console.log('[Medical Agent] Generating final message with LLM:', {
    condition: scan.condition_match,
    riskLevel: risk.level,
    hasAnswer: !!userAnswer,
    thoughtProcessSteps: thoughtProcess.length
  });

  // Map urgency to the expected format
  const urgencyMap: Record<string, 'immediate' | 'soon' | 'routine'> = {
    'critical': 'immediate',
    'high': 'soon',
    'medium': 'soon',
    'low': 'routine',
  };

  const finalMessage = await generateFinalMessage({
    scanCondition: scan.condition_match,
    history,
    thoughtProcess,
    riskLevel: risk.level,
    requiresDermatologist: risk.requiresDermatologist,
    urgency: urgencyMap[risk.urgency] || 'routine',
    userAnswer,
    lastQuestion,
  });

  return {
    type: 'final',
    message: finalMessage,
    riskLevel: risk.level,
    requiresDermatologist: risk.requiresDermatologist,
    urgency: risk.urgency,
    tips,
    products,
    thoughtProcess,
  };
}

function mapMedicalToSkincare(condition: string): string {
  const mapping: Record<string, string> = {
    'acne': 'acne',
    'rosacea': 'rosacea',
    'eczema': 'eczema',
    'atopic_dermatitis': 'eczema',
    'tinea': 'fungal_infection',
    'ringworm': 'fungal_infection',
    'candidiasis': 'fungal_infection',
    'fungal_infection': 'fungal_infection',
    'warts': 'warts',
    'seborrheic_keratosis': 'hyperpigmentation',
    'infestations': 'sensitive_skin',
    'bites': 'sensitive_skin',
    'hives': 'sensitive_skin',
    'normal': 'maintenance',
  };
  return mapping[condition] || 'maintenance';
}
