import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export interface PlannerInput {
  observation: {
    detectedConditions: string[];
    totalDetections: number;
    hasBoxes: boolean;
    tZoneCount: number;
    uZoneCount: number;
  };
  user: {
    skinType: string;
    fitzpatrick: number;
  };
  environmentKnown: boolean;
}

export interface PlannedStep {
  tool: 'fetch_environment' | 'propose_actives' | 'find_products' | 'evaluate_suitability' | 'finalize' | 'log';
  reason: string;
}

export async function planCosmeticSteps(input: PlannerInput): Promise<PlannedStep[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    // No LLM configured; fall back to a deterministic plan
    const steps: PlannedStep[] = [
      { tool: 'fetch_environment', reason: 'Fallback: need environment.' },
      { tool: 'propose_actives', reason: 'Fallback: pick actives.' },
      { tool: 'find_products', reason: 'Fallback: map actives to catalog.' },
      { tool: 'evaluate_suitability', reason: 'Fallback: filter products.' },
      { tool: 'finalize', reason: 'Fallback: finalize routine.' },
      { tool: 'log', reason: 'Fallback: persist.' },
    ];
    return steps;
  }
  
  console.log('[Gemini Planner] Calling Gemini with input:', JSON.stringify(input, null, 2));

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });

  const sys = `You are a dermatology agent planner. Decide an ordered list of tool steps to personalize skincare.
Available tools:
- fetch_environment
- propose_actives
- find_products
- evaluate_suitability
- finalize
- log
Return STRICT JSON array of steps: [{ "tool": string, "reason": string }, ...]. No extra text.`;

  const user = `Context:
observation: ${JSON.stringify(input.observation)}
user: ${JSON.stringify(input.user)}
environmentKnown: ${input.environmentKnown}
Goal: generate a minimal, correct sequence. Always include 'log' as the final step.`;

  try {
    const res = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: sys }] },
        { role: 'user', parts: [{ text: user }] },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    });

    let text = res.response.text().trim();
    
    // Strip markdown code fences if present
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      // sanitize
      const sanitized = parsed
        .map((s) => ({
          tool: s.tool,
          reason: typeof s.reason === 'string' ? s.reason : '',
        }))
        .filter((s) =>
          ['fetch_environment', 'propose_actives', 'find_products', 'evaluate_suitability', 'finalize', 'log'].includes(s.tool)
        );
      return sanitized;
    }
  } catch (err) {
    console.error('[Gemini Planner] Error:', err instanceof Error ? err.message : err);
  }
  return [
    { tool: 'fetch_environment', reason: 'Fallback: need environment.' },
    { tool: 'propose_actives', reason: 'Fallback: pick actives.' },
    { tool: 'find_products', reason: 'Fallback: map actives to catalog.' },
    { tool: 'evaluate_suitability', reason: 'Fallback: filter products.' },
    { tool: 'finalize', reason: 'Fallback: finalize routine.' },
    { tool: 'log', reason: 'Fallback: persist.' },
  ];
}

// --- Medical Agent Planning ---

export interface MedicalPlannerInput {
  scanResult: string; 
  history: Array<{ role: 'agent' | 'user'; content: string }>;
  knownInfo: {
    weather?: string;
    userProfile?: string;
  };
}

export interface MedicalNextStep {
  action: 'search_knowledge' | 'check_weather' | 'ask_user' | 'finalize';
  reason: string;
  query?: string;
  question?: string;
  options?: string[];
}

export async function planMedicalNextStep(input: MedicalPlannerInput): Promise<MedicalNextStep> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { action: 'finalize', reason: 'No API key, skipping reasoning.' };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });

  const sys = `You are a dermatology AI agent. Your goal is to identify the user's condition and provide a recommendation.
  
  You have these tools:
  1. 'check_weather': If the condition might be affected by humidity/UV (e.g. fungal acne vs bacterial acne).
  2. 'ask_user': If you need to verify symptoms (e.g. "Is it itchy?", "Does it bleed?", "How long has this been there?"). Use this to distinguish between similar conditions or gauge severity.
  3. 'search_knowledge': If you need to look up specific treatments or differential diagnoses.
  4. 'finalize': ONLY when you are VERY confident and have enough information to provide a safe recommendation.

  Input Context:
  - Scan: What the vision model saw.
  - History: Previous questions/answers.
  - Known Info: What we already know.

  Instructions:
  - BE CURIOUS AND THOROUGH. Don't just trust the scan blindly.
  - **CRITICAL: Check the History FIRST. If you already asked a question and got an answer, REASON ABOUT THAT ANSWER.**
  - **REASONING EXAMPLES:**
    * If you asked "Are there changes in the mole?" and user said "No" → This is GOOD news (stable mole, likely benign). Finalize with monitoring advice.
    * If user said "Yes" → This is CONCERNING (changing mole, possible melanoma). Finalize with urgent dermatologist referral.
    * If you asked "Is it silvery/scaly?" and user said "Yes" → Confirms Psoriasis. Finalize with treatment recommendations.
    * If user said "No" → May be different condition. Consider asking ONE different question OR finalize with general advice.
  - If history is empty, ask ONE clarifying question (unless condition is trivial).
  - If history contains a question and answer, REASON about what the answer means for diagnosis, then:
    a) Ask a DIFFERENT follow-up question (only if truly needed), OR
    b) Finalize your diagnosis with reasoning based on the answer.
  - Don't ask more than 2 questions total.
  - After getting an answer, REASON about it and finalize (don't ask the same question again).

  Return JSON: { "action": "...", "reason": "...", "question": "..." (if asking), "options": ["Yes", "No"] (if asking), "query": "..." (if searching) }
  `;

  const userMsg = `Context:
  Scan: ${input.scanResult}
  History: ${JSON.stringify(input.history)}
  Known Info: ${JSON.stringify(input.knownInfo)}
  
  What is the next step?`;

  try {
    const res = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: sys }] },
        { role: 'user', parts: [{ text: userMsg }] },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
    });

    let text = res.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    else if (text.startsWith('```')) text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');

    const parsed = JSON.parse(text);
    return {
      action: parsed.action || 'finalize',
      reason: parsed.reason || '',
      query: parsed.query,
      question: parsed.question,
      options: parsed.options,
    };
  } catch (err) {
    console.error('[Medical Planner] Error:', err);
    return { action: 'finalize', reason: 'Error in planning.' };
  }
}

// --- Cosmetic Agent Planning ---

export interface CosmeticPlannerInput {
  scanResult: {
    detectedConditions: string[];
    totalDetections: number;
    severity?: number;
  };
  history: Array<{ role: 'agent' | 'user'; content: string }>;
  knownInfo: {
    skinType?: string;
    fitzpatrick?: number;
    weather?: string;
    currentProducts?: string[];
  };
}

export interface CosmeticNextStep {
  action: 'check_weather' | 'ask_user' | 'search_products' | 'finalize';
  reason: string;
  question?: string;
  options?: string[];
}

export async function planCosmeticNextStep(input: CosmeticPlannerInput): Promise<CosmeticNextStep> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { action: 'finalize', reason: 'No API key, skipping reasoning.' };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });

  const sys = `You are a cosmetic skincare AI agent. Your goal is to create a personalized skincare routine based on the user's scan results and preferences.

  You have these tools:
  1. 'check_weather': ALWAYS check weather BEFORE finalizing if weather info is incomplete or if conditions might affect recommendations (e.g. high UV → block retinol, emphasize sunscreen; dry weather → prefer hydrating actives; high humidity → lighter products). This is a critical step for personalization.
  2. 'ask_user': If you need to understand preferences or clarify concerns (e.g. "What's your primary concern?", "Do you prefer simple or multi-step routines?").
  3. 'search_products': When you're ready to find specific products based on ingredients.
  4. 'finalize': When you have enough information AND have checked weather to create the final routine and product recommendations.

  Input Context:
  - Scan: What the vision model detected (conditions, severity, count).
  - History: Previous questions/answers.
  - Known Info: User profile (skin type, Fitzpatrick scale), weather, recommended/blocked actives based on their profile.

  Instructions:
  - BE CURIOUS AND PERSONALIZED. Don't just recommend generic products.
  - **CRITICAL: Check the Known Info FIRST. The system has already determined which actives are safe/recommended based on:**
    * User's skin type (sensitive, dry, oily, etc.)
    * User's Fitzpatrick scale (dark skin = avoid BP, prefer azelaic/mandelic)
    * Weather conditions (high UV = avoid retinol, dry = prefer hydrating actives)
  - **DO NOT ask about actives if Known Info already tells you:**
    * If recommendedActives includes retinol/salicylic acid → They're safe for this user, proceed with them
    * If blockedActives includes benzoyl peroxide → User has dark skin, automatically use azelaic/mandelic instead
    * If isSensitive is true → Automatically use gentler alternatives, don't ask
  - **ONLY ask about actives if:**
    * The user profile is incomplete (missing skin type/Fitzpatrick)
    * There's genuine uncertainty that can't be resolved from the profile
  - **CRITICAL: Check the History FIRST. If you already asked a question and got an answer, USE that answer to personalize recommendations.**
  - **REASONING EXAMPLES:**
    * Scan shows "acne + dark circles" → Ask: "What's your primary concern right now?" Options: ["Acne", "Dark Circles", "Both"]
    * User says "Acne" → Check Known Info: if retinol/salicylic are recommended → Use them automatically, don't ask. If blocked → Use azelaic/mandelic automatically.
    * User says "Both" → Create comprehensive routine addressing both.
    * After priority question → Ask about routine/time: "How much time can you dedicate to your skincare routine daily?" Options: ["5-10 minutes", "15-20 minutes", "30+ minutes"] OR "Do you prefer a simple 2-step routine or a more comprehensive routine?" Options: ["Simple", "Comprehensive"]
  - **QUESTION FLOW:**
    * First question: If multiple concerns → Ask about priority
    * Second question: Ask about routine complexity/time OR current products being used
    * Then: Check weather → Finalize
  - **WEATHER CHECK PRIORITY**: Before finalizing, ALWAYS check weather if:
    * Weather info shows "normal" or is missing → Use 'check_weather' action
    * High UV detected → Block retinol, emphasize sunscreen
    * Dry weather → Prefer hydrating actives, richer moisturizers
    * High humidity → Lighter products, avoid heavy creams
  - If history is empty and multiple concerns detected, ask ONE clarifying question about priority (NOT about actives if Known Info already has them).
  - If history contains ONE question and answer, consider asking a SECOND question about:
    * Routine complexity/time: "How much time can you dedicate daily?" or "Do you prefer simple or comprehensive?"
    * Current routine: "Are you currently using any skincare products?"
    * Then check weather and finalize
  - If history contains a question and answer, REASON about what it means for product selection, then:
    a) If only 1 question asked so far → Ask a SECOND question about routine/time/current products, OR
    b) Check weather if not already checked, OR
    c) Finalize the routine with personalized products.
  - Don't ask more than 2 questions total.
  - After getting answers, check weather if needed, then REASON and finalize.

  Return JSON: { "action": "...", "reason": "..." (keep under 100 chars), "question": "..." (if asking), "options": [...] (if asking) }
  
  IMPORTANT: Keep the "reason" field concise (under 100 characters) to avoid truncation.
  `;

  const userMsg = `Context:
  Scan: ${JSON.stringify(input.scanResult)}
  History: ${JSON.stringify(input.history)}
  Known Info: ${JSON.stringify(input.knownInfo)}
  
  What is the next step?`;

  try {
    const res = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: sys }] },
        { role: 'user', parts: [{ text: userMsg }] },
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
    });

    let text = res.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    else if (text.startsWith('```')) text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Cosmetic Planner] Raw response:', text.substring(0, 500));
    }

    // Try to parse JSON, with fallback for truncated responses
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      // If JSON is truncated, try to extract what we can
      console.warn('[Cosmetic Planner] JSON parse failed, attempting recovery...');
      
      // Try to extract action from partial JSON
      const actionMatch = text.match(/"action"\s*:\s*"([^"]+)"/);
      
      if (actionMatch && ['check_weather', 'ask_user', 'search_products', 'finalize'].includes(actionMatch[1])) {
        // Extract reason if available (even if truncated)
        let reason = 'Analyzing your scan results and preferences to create the best routine for you.';
        const reasonMatch = text.match(/"reason"\s*:\s*"([^"]*)/);
        if (reasonMatch && reasonMatch[1]) {
          // Use the reason (even if truncated) but limit length
          reason = reasonMatch[1].substring(0, 150);
          if (reasonMatch[1].length > 150) reason += '...';
        }
        
        parsed = {
          action: actionMatch[1],
          reason: reason,
        };
        console.log('[Cosmetic Planner] Recovered from truncated JSON:', parsed);
      } else {
        // If we can't recover, rethrow the original error
        throw parseErr;
      }
    }
    
    // Validate the response
    if (!parsed.action || !['check_weather', 'ask_user', 'search_products', 'finalize'].includes(parsed.action)) {
      console.warn('[Cosmetic Planner] Invalid action, defaulting to finalize:', parsed.action);
      return {
        action: 'finalize',
        reason: parsed.reason || 'Analyzing your scan results and preferences to create the best routine for you.',
      };
    }
    
    return {
      action: parsed.action,
      reason: parsed.reason || '',
      question: parsed.question,
      options: parsed.options,
    };
  } catch (err) {
    console.error('[Cosmetic Planner] Error:', err);
    if (err instanceof SyntaxError) {
      console.error('[Cosmetic Planner] JSON parse error - raw response might be logged above');
    }
    // Return a user-friendly fallback that doesn't mention errors
    return { 
      action: 'finalize', 
      reason: 'Analyzing your scan results and preferences to create the best routine for you.' 
    };
  }
}

// --- Medical Agent Final Message Generation ---

export interface FinalMessageInput {
  scanCondition: string;
  history: Array<{ role: 'agent' | 'user'; content: string }>;
  thoughtProcess: string[];
  riskLevel: 'high' | 'medium' | 'low';
  requiresDermatologist: boolean;
  urgency: 'immediate' | 'soon' | 'routine';
  userAnswer?: string;
  lastQuestion?: string;
}

export async function generateFinalMessage(input: FinalMessageInput): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    // Fallback to template
    return `Based on your scan showing ${input.scanCondition}, ${input.requiresDermatologist ? 'I recommend consulting a dermatologist.' : 'here are some recommendations.'}`;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });

  const sys = `You are a dermatology AI assistant. Generate a personalized, empathetic message for the user based on their scan results and conversation.

Guidelines:
- Be clear, empathetic, and professional
- Reference the user's answers if they provided any
- Explain your reasoning briefly
- If risk is high/medium, emphasize the importance of professional evaluation
- If risk is low, provide helpful recommendations
- Keep it concise (2-3 sentences max)
- Use natural, conversational language

Return ONLY the message text, no JSON, no markdown, just the plain message.`;

  const conversationSummary = input.history.length > 0
    ? `Conversation:\n${input.history.map(h => `${h.role}: ${h.content}`).join('\n')}`
    : 'No conversation history.';

  const reasoningSummary = input.thoughtProcess.length > 0
    ? `My reasoning steps:\n${input.thoughtProcess.join('\n')}`
    : '';

  const userMsg = `Context:
Condition detected: ${input.scanCondition}
Risk level: ${input.riskLevel}
Requires dermatologist: ${input.requiresDermatologist}
Urgency: ${input.urgency}

${conversationSummary}

${reasoningSummary}

${input.userAnswer ? `User's answer to "${input.lastQuestion}": ${input.userAnswer}` : ''}

Generate a personalized message for the user:`;

  try {
    const res = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: sys }] },
        { role: 'user', parts: [{ text: userMsg }] },
      ],
      generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
    });

    let message = res.response.text().trim();
    
    // Clean up any markdown or formatting
    message = message.replace(/^```[\w]*\n?/i, '').replace(/\n?```$/i, '');
    message = message.replace(/^\*\*|\*\*$/g, ''); // Remove bold markers
    
    return message || `Based on your scan showing ${input.scanCondition}, ${input.requiresDermatologist ? 'I recommend consulting a dermatologist.' : 'here are some recommendations.'}`;
  } catch (err) {
    console.error('[Final Message Generator] Error:', err);
    // Fallback
    return `Based on your scan showing ${input.scanCondition}, ${input.requiresDermatologist ? 'I recommend consulting a dermatologist.' : 'here are some recommendations.'}`;
  }
}

// --- Cosmetic Agent Final Message Generation ---

export interface CosmeticFinalMessageInput {
  detectedConditions: string[];
  history: Array<{ role: 'agent' | 'user'; content: string }>;
  thoughtProcess: string[];
  primaryConcern?: string;
  userAnswer?: string;
  lastQuestion?: string;
  topProducts?: Array<{ product_name: string }>;
  skinScore?: number;
  routineComplexity?: 'simple' | 'comprehensive' | 'moderate';
  timeAvailable?: 'short' | 'medium' | 'long';
}

export async function generateCosmeticFinalMessage(input: CosmeticFinalMessageInput): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    // Fallback to template
    return `Based on your scan showing ${input.detectedConditions.join(', ')}, I've created a personalized routine for you.`;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });

  const sys = `You are a friendly cosmetic skincare AI assistant. Generate a personalized, encouraging message for the user based on their scan results and conversation.

Guidelines:
- Be warm, friendly, and encouraging
- Reference the user's answers if they provided any
- Explain your reasoning briefly
- Mention the key products you're recommending
- Keep it concise (2-3 sentences max)
- Use natural, conversational language
- Don't be overly technical

Return ONLY the message text, no JSON, no markdown, just the plain message.`;

  const conversationSummary = input.history.length > 0
    ? `Conversation:\n${input.history.map(h => `${h.role}: ${h.content}`).join('\n')}`
    : 'No conversation history.';

  const reasoningSummary = input.thoughtProcess.length > 0
    ? `My reasoning steps:\n${input.thoughtProcess.join('\n')}`
    : '';

  const productsSummary = input.topProducts && input.topProducts.length > 0
    ? `Recommended products: ${input.topProducts.map(p => p.product_name).join(', ')}`
    : '';

  const routineInfo = input.routineComplexity 
    ? `Routine preference: ${input.routineComplexity} routine (${input.timeAvailable || 'medium'} time available)`
    : '';

  const userMsg = `Context:
Detected conditions: ${input.detectedConditions.join(', ')}
${input.primaryConcern ? `Primary concern: ${input.primaryConcern}` : ''}
${input.skinScore ? `Skin health score: ${input.skinScore}/100` : ''}
${routineInfo}

${conversationSummary}

${reasoningSummary}

${productsSummary}

${input.userAnswer ? `User's answer to "${input.lastQuestion}": ${input.userAnswer}` : ''}

Generate a personalized, friendly message for the user:`;

  try {
    const res = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: sys }] },
        { role: 'user', parts: [{ text: userMsg }] },
      ],
      generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
    });

    let message = res.response.text().trim();
    
    // Clean up any markdown or formatting
    message = message.replace(/^```[\w]*\n?/i, '').replace(/\n?```$/i, '');
    message = message.replace(/^\*\*|\*\*$/g, ''); // Remove bold markers
    
    return message || `Based on your scan showing ${input.detectedConditions.join(', ')}, I've created a personalized routine for you.`;
  } catch (err) {
    console.error('[Cosmetic Final Message Generator] Error:', err);
    // Fallback
    return `Based on your scan showing ${input.detectedConditions.join(', ')}, I've created a personalized routine for you.`;
  }
}
