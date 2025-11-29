import type { CosmeticScanResult, DailyRoutine, UserProfile, WeatherState, Recommendation } from '@/lib/types';
import { generateCosmeticRoutine } from '@/lib/logic/RecommendationEngine';
import { getWeatherByCoords } from '@/lib/agents/tools/weather';
import { findProductsByActives, type CatalogProduct } from '@/lib/agents/tools/productCatalog';
import { computeActivesForCondition, filterSuitableProducts, type ActivesDecision } from '@/lib/agents/tools/suitability';
import { planCosmeticNextStep, generateCosmeticFinalMessage, CosmeticNextStep } from '@/lib/agents/llm/gemini';

export interface CosmeticAgentInput {
  userId: string;
  scan: CosmeticScanResult;
  location?: { lat: number; lon: number };
  userProfile?: UserProfile | null;
  predictedAge?: number; // from face-api.js (optional)
  history?: Array<{ role: 'agent' | 'user'; content: string }>; // Chat history for context
  weather?: WeatherState; // Pre-fetched weather (optional)
}

export interface CosmeticAgentOutput {
  // Interaction
  type: 'text' | 'question' | 'final';
  message: string;
  options?: string[];
  
  // State updates (to be sent back by client next time)
  thoughtProcess?: string[];

  // Final Result (only if type === 'final')
  routine?: DailyRoutine;
  alerts?: Recommendation[];
  topProducts?: Array<{ product_id: string; product_name: string }>;
  notes?: string[];
  trace?: Array<{ step: string; detail?: any }>;
  skinScore?: number;
}

function summarizeObservation(scan: CosmeticScanResult) {
  const total = scan.totalDetections ?? 0;
  let severityTier: 'spot' | 'serum' | 'protocol' = 'spot';
  if (total >= 10) severityTier = 'protocol';
  else if (total >= 4) severityTier = 'serum';
  // Placeholder zone mapping based on normalized centers if available
  const rawAcne = scan.rawDetections?.acne ?? [];
  const centers = rawAcne.map((d: any) => {
    const xRange = (d?.box?.x2 ?? 0) - (d?.box?.x1 ?? 0);
    const yRange = (d?.box?.y2 ?? 0) - (d?.box?.y1 ?? 0);
    const cx = (d?.box?.x1 ?? 0) + xRange / 2;
    const cy = (d?.box?.y1 ?? 0) + yRange / 2;
    return { cx, cy };
  });
  // Assume normalized coords if <= 1, otherwise cannot confidently zone
  const looksNormalized = centers.every(c => c.cx <= 1 && c.cy <= 1);
  let tZoneCount = 0;
  let uZoneCount = 0;
  if (looksNormalized) {
    for (const c of centers) {
      const inCenterColumn = c.cx >= 0.33 && c.cx <= 0.66;
      const inTopThird = c.cy <= 0.33;
      const inMid = c.cy > 0.33 && c.cy <= 0.66;
      if (inCenterColumn && (inTopThird || inMid)) {
        tZoneCount++;
      } else {
        uZoneCount++;
      }
    }
  }
  return { total, severityTier, tZoneCount, uZoneCount, looksNormalized };
}

function pickPrimaryCondition(scan: CosmeticScanResult): string {
  if (scan.detected_conditions.includes('inflammatory_acne')) return 'inflammatory_acne';
  if (scan.detected_conditions.includes('acne_vulgaris')) return 'acne';
  if (scan.detected_conditions.includes('pih') || scan.detected_conditions.includes('hyperpigmentation')) return 'hyperpigmentation';
  if (scan.detected_conditions.includes('dark_circles')) return 'dark_circles';
  return 'normal';
}

export async function runCosmeticAgent(input: CosmeticAgentInput): Promise<CosmeticAgentOutput> {
  const { userId, scan, history = [] } = input;
  const observation = summarizeObservation(scan);
  const thoughtProcess: string[] = [];
  const trace: Array<{ step: string; detail?: any }> = [];

  // 1. Analyze history to understand conversation state
  const lastItem = history[history.length - 1];
  const secondLastItem = history[history.length - 2];
  const justReceivedAnswer = lastItem?.role === 'user';
  const questionsAsked = history.filter(h => h.role === 'agent').length;
  const answersGiven = history.filter(h => h.role === 'user').length;

  thoughtProcess.push('Analyzing scan results and your preferences...');

  // Check health factors
  const userProfile = input.userProfile ?? ({} as UserProfile);
  const healthFactors: string[] = [];
  
  if (userProfile.allergies && userProfile.allergies.length > 0) {
    healthFactors.push(`Allergies: ${userProfile.allergies.join(', ')} - will avoid these ingredients`);
    thoughtProcess.push(`Noting allergies: ${userProfile.allergies.join(', ')} - avoiding these in recommendations`);
  }
  
  if (userProfile.diseases && userProfile.diseases.length > 0) {
    healthFactors.push(`Medical conditions: ${userProfile.diseases.join(', ')}`);
    thoughtProcess.push(`Considering medical conditions: ${userProfile.diseases.join(', ')} - adjusting recommendations accordingly`);
    
    // Thyroid-specific considerations
    if (userProfile.diseases.includes('thyroid')) {
      thoughtProcess.push('Thyroid condition detected - considering potential skin sensitivity and dryness');
    }
  }
  
  if (userProfile.hormonalFactors) {
    const hormonalNotes: string[] = [];
    if (userProfile.hormonalFactors.isPregnant) hormonalNotes.push('pregnancy');
    if (userProfile.hormonalFactors.isMenopausal) hormonalNotes.push('menopause');
    if (userProfile.hormonalFactors.hasHormonalImbalance) hormonalNotes.push('hormonal imbalance');
    if (userProfile.hormonalFactors.takingHormonalMedication) hormonalNotes.push('hormonal medication');
    if (userProfile.hormonalFactors.menstrualCycleAffects) hormonalNotes.push('menstrual cycle effects');
    
    if (hormonalNotes.length > 0) {
      healthFactors.push(`Hormonal factors: ${hormonalNotes.join(', ')}`);
      thoughtProcess.push(`Considering hormonal factors: ${hormonalNotes.join(', ')} - may affect skin sensitivity and product recommendations`);
    }
  }

  // 2. Get environment (use provided or fetch)
  let weather: WeatherState = input.weather || {
    uvIndex: 3,
    humidity: 50,
    temperature: 22,
    isHighUV: false,
    isHighHumidity: false,
    isDryWeather: false,
  };

  if (!input.weather && input.location) {
    try {
      weather = await getWeatherByCoords(input.location.lat, input.location.lon);
      thoughtProcess.push('Checked environmental factors (UV, humidity).');
    } catch (e) {
      console.warn('[Cosmetic Agent] Weather fetch failed:', e);
    }
  }

  // 3. Pre-compute actives decision to inform planner
  const primaryCondition = pickPrimaryCondition(scan);
  
  // Compute what actives are recommended/blocked based on user profile
  let activesDecision = computeActivesForCondition(primaryCondition, {
    skinType: userProfile.skinType ?? 'combination',
    fitzpatrickScale: userProfile.fitzpatrickScale ?? 3,
  }, weather);
  
  // Block allergens
  if (userProfile.allergies && userProfile.allergies.length > 0) {
    const allergenLower = userProfile.allergies.map(a => a.toLowerCase());
    activesDecision.blocked = [
      ...activesDecision.blocked,
      ...allergenLower.filter(a => 
        ['retinoids', 'retinol', 'salicylic acid', 'benzoyl peroxide'].includes(a)
      )
    ];
    activesDecision.notes.push(`Blocked allergens: ${userProfile.allergies.join(', ')}`);
  }
  
  // Adjust for thyroid (often causes dry, sensitive skin)
  if (userProfile.diseases?.includes('thyroid')) {
    activesDecision.notes.push('Thyroid condition: preferring gentle, hydrating products');
    if (!activesDecision.recommended.includes('hyaluronic acid')) {
      activesDecision.recommended.push('hyaluronic acid');
    }
    if (!activesDecision.recommended.includes('ceramides')) {
      activesDecision.recommended.push('ceramides');
    }
  }
  
  // Adjust for hormonal factors (may increase sensitivity)
  if (userProfile.hormonalFactors?.isPregnant || userProfile.hormonalFactors?.takingHormonalMedication) {
    activesDecision.notes.push('Hormonal factors: using gentler formulations');
    if (activesDecision.recommended.includes('retinol')) {
      activesDecision.recommended = activesDecision.recommended.filter(a => !a.includes('retinol'));
      activesDecision.blocked.push('retinol', 'retinoid');
    }
  }
  
  const scanContext = {
    detectedConditions: scan.detected_conditions,
    totalDetections: scan.totalDetections ?? 0,
    severity: scan.severity_score ?? 0,
  };

  const knownInfo = {
    skinType: userProfile.skinType ?? 'combination',
    fitzpatrick: userProfile.fitzpatrickScale ?? 3,
    weather: weather.isHighUV ? 'high UV' : weather.isDryWeather ? 'dry' : weather.isHighHumidity ? 'humid' : 'normal',
    uvIndex: weather.uvIndex,
    isHighUV: weather.isHighUV,
    isDryWeather: weather.isDryWeather,
    isHighHumidity: weather.isHighHumidity,
    recommendedActives: activesDecision.recommended,
    blockedActives: activesDecision.blocked,
    hasRetinol: activesDecision.recommended.some(a => a.toLowerCase().includes('retinol')),
    hasSalicylicAcid: activesDecision.recommended.some(a => a.toLowerCase().includes('salicylic')),
    hasBenzoylPeroxide: activesDecision.recommended.some(a => a.toLowerCase().includes('benzoyl')),
    isDarkSkin: (userProfile.fitzpatrickScale ?? 3) >= 4,
    isSensitive: userProfile.skinType === 'sensitive',
  };

  // If user just answered, reason about it and finalize (don't ask again)
  let plan: CosmeticNextStep;
  try {
    if (justReceivedAnswer && answersGiven > 0) {
      console.log('[Cosmetic Agent] User answered, reasoning about response...');
      thoughtProcess.push('Received your answer. Reasoning about your preferences...');
      // Still call planner to reason, but it should finalize
      plan = await planCosmeticNextStep({
        scanResult: scanContext,
        history,
        knownInfo,
      });
      thoughtProcess.push(`Reasoning: ${plan.reason}`);
    } else if (history.length === 0) {
      // First turn - decide if we should ask a question
      plan = await planCosmeticNextStep({
        scanResult: scanContext,
        history,
        knownInfo,
      });
      thoughtProcess.push(`Decision: ${plan.reason}`);
    } else {
      // History exists but no answer yet (shouldn't happen, but safety)
      plan = await planCosmeticNextStep({
        scanResult: scanContext,
        history,
        knownInfo,
      });
      thoughtProcess.push(`Reasoning: ${plan.reason}`);
    }
  } catch (err) {
    console.error('[Cosmetic Agent] Error in planner:', err);
    // Fallback: just finalize with user-friendly message
    plan = { 
      action: 'finalize', 
      reason: 'Analyzing your scan results and preferences to create the best routine for you.' 
    };
    thoughtProcess.push('Analyzing your preferences and scan results...');
  }

  // 4. Execute planned action
  if (plan.action === 'ask_user') {
    const proposedQuestion = plan.question || 'Could you tell me more about your skincare preferences?';
    
    // Prevent asking the SAME question that was just answered
    if (justReceivedAnswer && secondLastItem && proposedQuestion.toLowerCase().includes(secondLastItem.content.toLowerCase().split(' ')[0])) {
      console.log('[Cosmetic Agent] Planner wants to ask same question again, forcing finalize instead');
      thoughtProcess.push('Already asked this question. Finalizing based on your previous answer...');
      // Fall through to finalize
    } else if (questionsAsked >= 2) {
      // Limit to 2 questions max
      console.log('[Cosmetic Agent] Already asked 2 questions, forcing finalize');
      thoughtProcess.push('Gathered enough information. Finalizing routine...');
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
    // Re-fetch weather if location is available (even if weather was already provided, re-check for latest)
    if (input.location) {
      try {
        console.log('[Cosmetic Agent] Checking weather via Open-Meteo API...');
        weather = await getWeatherByCoords(input.location.lat, input.location.lon);
        console.log('[Cosmetic Agent] Weather fetched:', { uvIndex: weather.uvIndex, humidity: weather.humidity, isHighUV: weather.isHighUV, isDryWeather: weather.isDryWeather });
        
        const weatherNotes: string[] = [];
        if (weather.isHighUV) weatherNotes.push(`High UV (${weather.uvIndex}) - avoiding retinol, emphasizing sunscreen`);
        if (weather.isDryWeather) weatherNotes.push(`Dry weather (${weather.humidity}% humidity) - emphasizing hydration`);
        if (weather.isHighHumidity) weatherNotes.push(`High humidity (${weather.humidity}%) - using lighter products`);
        if (weatherNotes.length === 0) {
          weatherNotes.push(`Normal conditions (UV: ${weather.uvIndex}, Humidity: ${weather.humidity}%)`);
        }
        
        thoughtProcess.push(`Checked environmental factors: ${weatherNotes.join(', ')}`);
        
        // Re-compute actives with updated weather
        const updatedActivesDecision = computeActivesForCondition(primaryCondition, {
          skinType: userProfile.skinType ?? 'combination',
          fitzpatrickScale: userProfile.fitzpatrickScale ?? 3,
        }, weather);
        
        // Update knownInfo with new weather-based recommendations
        knownInfo.weather = weather.isHighUV ? 'high UV' : weather.isDryWeather ? 'dry' : weather.isHighHumidity ? 'humid' : 'normal';
        knownInfo.recommendedActives = updatedActivesDecision.recommended;
        knownInfo.blockedActives = updatedActivesDecision.blocked;
        knownInfo.uvIndex = weather.uvIndex;
        knownInfo.isHighUV = weather.isHighUV;
        knownInfo.isDryWeather = weather.isDryWeather;
        knownInfo.isHighHumidity = weather.isHighHumidity;
        
        if (updatedActivesDecision.notes.length > 0) {
          thoughtProcess.push(`Adjusted recommendations based on weather: ${updatedActivesDecision.notes.join(', ')}`);
        }
      } catch (e) {
        console.warn('[Cosmetic Agent] Weather re-fetch failed:', e);
        thoughtProcess.push('Checked environmental factors (using default values).');
      }
    } else {
      // Weather already available, show the conditions
      const weatherNotes: string[] = [];
      if (weather.isHighUV) weatherNotes.push(`High UV (${weather.uvIndex}) - avoiding retinol, emphasizing sunscreen`);
      if (weather.isDryWeather) weatherNotes.push('Dry weather - emphasizing hydration');
      if (weather.isHighHumidity) weatherNotes.push('High humidity - using lighter products');
      if (weatherNotes.length === 0) {
        weatherNotes.push(`Normal conditions (UV: ${weather.uvIndex}, Humidity: ${weather.humidity}%)`);
      }
      thoughtProcess.push(`Environmental factors: ${weatherNotes.join(', ')}`);
    }
    // Fall through to finalize
  }

  // 5. Finalize: Generate routine and products
  // Use user's answers to determine primary concern and routine preferences
  let userPrimaryConcern = primaryCondition;
  let routineComplexity: 'simple' | 'comprehensive' | 'moderate' = 'moderate';
  let timeAvailable: 'short' | 'medium' | 'long' = 'medium';
  
  // Parse answers from history
  if (history.length > 0) {
    for (const item of history) {
      if (item.role === 'user') {
        const answer = item.content.toLowerCase();
        // Check for primary concern
        if (answer.includes('acne') && !answer.includes('dark')) userPrimaryConcern = 'acne';
        else if (answer.includes('dark circle')) userPrimaryConcern = 'dark_circles';
        else if (answer.includes('both')) userPrimaryConcern = 'both';
        
        // Check for routine complexity/time
        if (answer.includes('simple') || answer.includes('5-10 minutes') || answer.includes('quick')) {
          routineComplexity = 'simple';
          timeAvailable = 'short';
        } else if (answer.includes('comprehensive') || answer.includes('30+ minutes') || answer.includes('extensive')) {
          routineComplexity = 'comprehensive';
          timeAvailable = 'long';
        } else if (answer.includes('15-20 minutes') || answer.includes('moderate')) {
          routineComplexity = 'moderate';
          timeAvailable = 'medium';
        }
      }
    }
  }

  // Recompute actives if user's answer changed the primary concern OR if weather was just checked
  // If weather action was taken, use the updated actives from knownInfo, otherwise use pre-computed
  let decision: ActivesDecision;
  if (plan.action === 'check_weather' && knownInfo.recommendedActives && knownInfo.recommendedActives.length > 0) {
    // Use the weather-updated actives (recompute to get notes)
    decision = computeActivesForCondition(userPrimaryConcern === 'both' ? primaryCondition : userPrimaryConcern, {
      skinType: userProfile.skinType ?? 'combination',
      fitzpatrickScale: userProfile.fitzpatrickScale ?? 3,
    }, weather);
    // Override with weather-updated recommendations
    decision.recommended = knownInfo.recommendedActives;
    decision.blocked = knownInfo.blockedActives || [];
    console.log('[Cosmetic Agent] Using weather-adjusted actives:', { recommended: decision.recommended, blocked: decision.blocked });
  } else if (userPrimaryConcern === primaryCondition && activesDecision.recommended.length > 0) {
    // Reuse pre-computed decision
    decision = activesDecision;
  } else {
    // Recompute for different primary concern
    decision = computeActivesForCondition(userPrimaryConcern === 'both' ? primaryCondition : userPrimaryConcern, {
      skinType: userProfile.skinType ?? 'combination',
      fitzpatrickScale: userProfile.fitzpatrickScale ?? 3,
    }, weather);
  }

  // Zone-aware tweak
  if (observation.tZoneCount > observation.uZoneCount && (userProfile.skinType === 'dry' || userProfile.skinType === 'sensitive')) {
    decision.notes.push('T‑zone congestion detected: recommend localized salicylic acid application only on T‑zone.');
  }
  trace.push({ step: 'propose_actives', detail: decision });

  // Find products
  const candidateProducts: CatalogProduct[] = await findProductsByActives(decision.recommended, { limit: 20, mustIncludeAll: false });
  trace.push({ step: 'find_products', detail: { count: candidateProducts.length } });
  
  // Filter out products with allergens
  let filteredProducts = candidateProducts;
  if (userProfile.allergies && userProfile.allergies.length > 0) {
    const allergenLower = userProfile.allergies.map(a => a.toLowerCase());
    filteredProducts = candidateProducts.filter(product => {
      const ingredients = product.ingredients.map(i => i.toLowerCase());
      return !allergenLower.some(allergen => 
        ingredients.some(ing => ing.includes(allergen))
      );
    });
    thoughtProcess.push(`Filtered out products containing allergens: ${userProfile.allergies.join(', ')}`);
  }
  
  const suitable = filterSuitableProducts(filteredProducts, decision, 5);
  trace.push({ step: 'evaluate_suitability', detail: { chosen: suitable.slice(0, 3).map(s => s.product.product_name) } });

  // Adjust product count based on routine complexity preference
  let productLimit = 5;
  if (routineComplexity === 'simple') {
    productLimit = 3; // Fewer products for simple routine
    decision.notes.push('Simple routine: focusing on essential products only.');
  } else if (routineComplexity === 'comprehensive') {
    productLimit = 7; // More products for comprehensive routine
    decision.notes.push('Comprehensive routine: including multiple targeted treatments.');
  }

  let topProducts = suitable.slice(0, productLimit).map(s => ({
    product_id: s.product.product_id,
    product_name: s.product.product_name,
  }));
  
  console.log('[Cosmetic Agent] Product selection:', {
    routineComplexity,
    timeAvailable,
    productCount: topProducts.length,
    weatherAdjusted: plan.action === 'check_weather',
    actives: decision.recommended
  });

  // Aging detection
  if (typeof input.predictedAge === 'number' && typeof userProfile.age === 'number' && userProfile.age > 0) {
    const delta = Math.round(input.predictedAge - userProfile.age);
    const isAging = delta >= 3;
    trace.push({ step: 'aging_check', detail: { predictedAge: input.predictedAge, userAge: userProfile.age, delta, isAging } });
    if (isAging) {
      const antiAgingQueries = [
        'Retinol Night Serum',
        'Peptide Moisturizer',
        'Vitamin C Brightening Serum',
        'SPF 50 Sunscreen'
      ];
      const existing = new Set(topProducts.map(p => p.product_name.toLowerCase()));
      const injected = antiAgingQueries
        .filter(q => !existing.has(q.toLowerCase()))
        .map((q, idx) => ({ product_id: `anti-aging-${idx}`, product_name: q }));
      if (injected.length > 0) {
        topProducts = [...topProducts, ...injected].slice(0, 5);
      }
      decision.notes.push('Signs of aging detected: prioritizing retinol/peptides and daily sunscreen.');
    }
  }

  // Build routine
  let routine: DailyRoutine;
  try {
    routine = generateCosmeticRoutine(scan, weather, {
      id: userProfile.id || userId,
      name: userProfile.name || '',
      age: userProfile.age || 0,
      gender: userProfile.gender || 'other',
      skinType: userProfile.skinType || 'combination',
      fitzpatrickScale: userProfile.fitzpatrickScale || 3,
      concerns: userProfile.concerns || [],
      onboardingComplete: true,
      createdAt: userProfile.createdAt || new Date(),
    });
  } catch (err) {
    console.error('[Cosmetic Agent] Error generating routine:', err);
    // Fallback routine
    routine = {
      morning: [],
      evening: [],
      alerts: [],
    };
  }

  // Compute Skin Health Score
  const base = 85;
  const severity = Math.max(0, Math.min(1, scan.severity_score ?? 0));
  const hasAcneOrPIH = scan.detected_conditions.some(c =>
    ['acne_vulgaris', 'inflammatory_acne', 'hyperpigmentation', 'pih', 'whiteheads', 'blackheads'].includes(c)
  );
  const hasDarkCirclesOnly =
    scan.detected_conditions.length > 0 &&
    scan.detected_conditions.every(c => c === 'dark_circles');
  let score = base;
  score -= Math.round(40 * severity);
  if (hasAcneOrPIH) score -= 10;
  else if (hasDarkCirclesOnly) score -= 5;
  if (weather.isHighUV) score -= 8;
  if (weather.isHighHumidity) score -= 5;
  if (weather.isDryWeather) score -= 4;
  score = Math.max(0, Math.min(100, score));

  // Generate final message using LLM
  const userAnswer = lastItem?.role === 'user' ? lastItem.content : undefined;
  const lastQuestion = secondLastItem?.role === 'agent' ? secondLastItem.content : undefined;

  console.log('[Cosmetic Agent] Generating final message with LLM:', {
    conditions: scan.detected_conditions,
    hasAnswer: !!userAnswer,
    thoughtProcessSteps: thoughtProcess.length,
    topProductsCount: topProducts.length
  });

  let finalMessage: string;
  try {
    finalMessage = await generateCosmeticFinalMessage({
      detectedConditions: scan.detected_conditions,
      history,
      thoughtProcess,
      primaryConcern: userPrimaryConcern,
      userAnswer,
      lastQuestion,
      topProducts: topProducts.length > 0 ? topProducts : undefined,
      skinScore: score,
      routineComplexity,
      timeAvailable,
    });
  } catch (err) {
    console.error('[Cosmetic Agent] Error generating final message:', err);
    // Fallback message
    const detectedStr = scan.detected_conditions.map(c => c.replace(/_/g, ' ')).join(', ');
    finalMessage = detectedStr 
      ? `Based on your scan showing ${detectedStr}, I've created a personalized routine for you.`
      : `I've created a personalized routine for you based on your scan results.`;
  }

  return {
    type: 'final',
    message: finalMessage,
    routine,
    alerts: routine.alerts,
    topProducts,
    notes: decision.notes,
    trace,
    skinScore: score,
    thoughtProcess,
  };
}


