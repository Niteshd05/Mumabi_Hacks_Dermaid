PROJECT CONTEXT: DermAid (Dual-Agent Skin Health Platform)
1. High-Level Concept
DermAid is a "Dual-Agent" skin health platform. Instead of being just a passive scanner (input image → output result), it uses Agentic AI. This means the system acts like a smart consultant that learns, predicts, and autonomously adapts recommendations based on three factors:

Visual Data: What the skin looks like right now.

Environmental Data: What the weather/climate is doing to the skin.

Historical Data: How the skin reacted to past treatments.

The "Why": Most apps fail because they are either "Beauty only" (ignoring health) or "Medical only" (scary symptom checkers). DermAid bridges this gap while solving the racial bias in dermatology (it is built to work on all skin tones, specifically Fitzpatrick IV-VI).

2. The Core Architecture: The Dual-Agent System
The system is split into two distinct "personalities" or Agents. They share the same user history but have different goals and rules.

🧖‍♀️ Agent 1: The Cosmetic Care Agent
Domain: Face only.

Focus: Aesthetics, Daily Routine, Long-term improvement.

Key Capabilities:

Acne Analysis: Distinguishes between inflammatory acne, whiteheads, and blackheads.

Skin Tone Intelligence: Specifically looks for PIH (Post-Inflammatory Hyperpigmentation)—dark spots left behind after acne heals, which is a major concern for darker skin tones.

Aging & Fatigue: Detects fine lines and dark circles.

Goal: Optimize the user's daily skincare routine to clear skin without damaging the moisture barrier.

🩺 Agent 2: The Medical Pre-Diagnosis Agent
Domain: Any body part (Arm, Leg, Torso, etc.).

Focus: Pathology, Risk Assessment, Triage.

Key Capabilities:

Lesion Classification: Detects patterns consistent with Eczema (Atopic Dermatitis), Psoriasis, Fungal Infections, or Hives.

Risk Triage: It does NOT diagnose. It calculates "Risk."

Low Risk: "Monitor at home."

Medium Risk: "Schedule non-urgent appointment."

High Risk: "Immediate attention required (e.g., Melanoma signs)."

Goal: Safety. Preventing minor issues from becoming major, and catching serious issues early.

3. The "Agentic" Intelligence Layers (The Brain)
This is what makes the project special. The system is not just looking at a photo; it is processing context.

A. The Environmental Context Layer
The Agents check external data before making a decision.

High UV Index: The Agent autonomously stops recommending Retinol/Exfoliants (which cause sun sensitivity) and forces a Sunscreen recommendation.

High Humidity: The Agent switches recommendations from heavy creams to lightweight gels to prevent clogged pores.

Low Humidity/Winter: The Agent emphasizes heavy moisturizers to prevent Eczema flares.

B. The "Time Travel" Learning Layer
The Agents track the user over time (Weeks 1-12).

The Feedback Loop: If the user used "Product X" for 2 weeks and the redness increased, the Agent marks that ingredient as a "Trigger" and autonomously swaps it out of the routine.

The Adaptation: The routine is not static. It changes weekly based on the previous week's results.

C. The Equity/Inclusivity Layer
Problem: Standard AI fails on dark skin (can't see redness on brown skin).

DermAid Solution:

Onboarding requires a Fitzpatrick Scale selection (Type I-VI).

The logic engine adjusts recommendations based on this.

Example: If User is Type V (Dark Skin) and has acne, the Agent avoids "Benzoyl Peroxide" (can cause bleaching/dark spots) and recommends "Azelaic Acid" (treats acne + dark spots safely).

4. Detailed User Flow & Logic Scenarios
Phase 1: Onboarding (The Digital Twin)
The user creates a profile that serves as the baseline for the Agents.

Inputs: Name, Age, Gender.

Skin Profile:

Type: Oily, Dry, Combination, Sensitive.

Tone: Visual selector for Fitzpatrick Scale (Critical for the ML team to know—they might need this input to calibrate their model).

Goals: "Clear Acne", "Anti-Aging", or "Health Monitoring".

Phase 2: The Main Fork (Home Screen)
The user decides their intent.

Button A: "My Routine / Face Check" -> Activates Cosmetic Agent.

Button B: "Scan Concern / Body Check" -> Activates Medical Agent.

Phase 3: The Scan & Analysis
Scenario A: Cosmetic Scan (The "Sarah" Logic)
User Action: Uploads selfie.

ML Layer: Detects "Inflammatory Acne" + "High PIH (Dark Spots)".

Env Layer: Detects "High UV Index".

Agent Decision:

Observation: "Acne is active, but sun is dangerous today."

Action: "Skip the morning acne treatment. Use SPF 50. Apply acne treatment tonight only."

Output: A modified Daily Routine list.

Scenario B: Medical Scan (The "James" Logic)
User Action: Uploads photo of an itchy patch on the arm.

ML Layer: Detects pattern consistent with "Eczema".

Risk Engine: Analyzes severity (Redness intensity, Surface area).

Result: Severity is Mild.

Agent Decision:

Risk Level: Low/Medium.

Action: "This looks like common Eczema. Apply moisturizer. Avoid hot showers."

Output: Education card + "Remind me to check again in 3 days" button.

Scenario C: High Risk Safety Net
User Action: Uploads photo of a mole.

ML Layer: Detects "Asymmetry" and "Irregular Border".

Agent Decision:

Risk Level: HIGH.

Action: LOCKDOWN.

Output: The UI turns red. No product recommendations. Standard disclaimer: "This indicates high risk. Please see a dermatologist immediately."

5. Key Features for the Frontend/UI Team
To support this logic, the UI needs specific elements:

The "Environment" Toggles (For Demo):

Since you can't rely on real weather during a demo, the UI needs a hidden "Dev Mode" to toggle "Simulate High UV" or "Simulate Dry Weather" to show the Agent reacting.

The "Time Travel" Button (For Demo):

A button called "Simulate Week 4" that instantly updates the graphs and routine to prove the AI "learned" from the past.

Dual Dashboards:

Cosmetic View: Looks like a beauty app (Routine checklists, progress photos).

Medical View: Looks like a health app (Symptom log, severity graph, doctor export).

6. What the ML Team Needs to Provide (The Contract)
Regardless of the tech stack (PyTorch/TF), the ML backend needs to provide this data structure to the frontend:

1. Cosmetic Response:

JSON

{
  "detected_conditions": ["acne_vulgaris", "hyperpigmentation"],
  "severity_score": 0.75,
  "confidence": 0.92
}
2. Medical Response:

JSON

{
  "condition_match": "atopic_dermatitis",
  "risk_flag": "medium", // low, medium, high
  "visual_markers": ["redness", "scaling"]
}
This ensures the Frontend team can build the "Agentic Logic" independently of how the ML team builds the models.


7. Tech Stack
Framework: Next.js, TypeScript.

Styling: Tailwind CSS, Shadcn/UI (for rapid components), Lucide React (Icons).

AI/ML: TensorFlow.js (Client-side inference), MobileNetV2 (Quantized), PyTorch ???? not sure

Backend/DB: Firebase (Firestore for user profiles, Storage for optional backup).

