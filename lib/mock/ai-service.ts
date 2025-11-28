/**
 * Mock AI Service
 * Simulates the ML backend responses as defined in CONTEXT.md Section 6
 */

import {
  CosmeticScanResult,
  MedicalScanResult,
  CosmeticCondition,
  MedicalCondition,
  RiskFlag,
  VisualMarker,
  FitzpatrickScale,
} from '@/lib/types';

// Simulated delay to mimic real API call
const MOCK_DELAY = 1500;

type MockPreset = 'acne-pih' | 'acne-mild' | 'dark-circles' | 'eczema' | 'psoriasis' | 'high-risk-mole' | 'clear';

interface AnalyzeSkinOptions {
  preset?: MockPreset;
  fitzpatrickScale?: FitzpatrickScale;
}

/**
 * Mock cosmetic scan analysis
 * Returns detected conditions based on preset or random selection
 */
export async function analyzeCosmeticSkin(
  _imageData: string | null,
  options: AnalyzeSkinOptions = {}
): Promise<CosmeticScanResult> {
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

  const { preset = 'acne-pih', fitzpatrickScale = 4 } = options;

  // Preset responses for demo scenarios
  const presets: Record<MockPreset, CosmeticScanResult> = {
    'acne-pih': {
      detected_conditions: ['inflammatory_acne', 'pih', 'hyperpigmentation'] as CosmeticCondition[],
      severity_score: 0.75,
      confidence: 0.92,
    },
    'acne-mild': {
      detected_conditions: ['acne_vulgaris', 'whiteheads'] as CosmeticCondition[],
      severity_score: 0.35,
      confidence: 0.88,
    },
    'dark-circles': {
      detected_conditions: ['dark_circles', 'fine_lines'] as CosmeticCondition[],
      severity_score: 0.45,
      confidence: 0.85,
    },
    'clear': {
      detected_conditions: [],
      severity_score: 0.1,
      confidence: 0.95,
    },
    // Medical presets return empty for cosmetic
    'eczema': {
      detected_conditions: [],
      severity_score: 0.1,
      confidence: 0.7,
    },
    'psoriasis': {
      detected_conditions: [],
      severity_score: 0.1,
      confidence: 0.7,
    },
    'high-risk-mole': {
      detected_conditions: [],
      severity_score: 0.1,
      confidence: 0.6,
    },
  };

  let result = presets[preset] || presets['acne-pih'];

  // Adjust for darker skin tones - PIH is more prominent
  if (fitzpatrickScale >= 4 && result.detected_conditions.includes('inflammatory_acne')) {
    if (!result.detected_conditions.includes('pih')) {
      result = {
        ...result,
        detected_conditions: [...result.detected_conditions, 'pih'] as CosmeticCondition[],
      };
    }
  }

  return result;
}

/**
 * Mock medical scan analysis
 * Returns condition matches and risk assessment
 */
export async function analyzeMedicalSkin(
  _imageData: string | null,
  options: AnalyzeSkinOptions = {}
): Promise<MedicalScanResult> {
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

  const { preset = 'eczema' } = options;

  // Preset responses for demo scenarios
  const presets: Record<MockPreset, MedicalScanResult> = {
    'eczema': {
      condition_match: 'atopic_dermatitis' as MedicalCondition,
      risk_flag: 'low' as RiskFlag,
      visual_markers: ['redness', 'scaling'] as VisualMarker[],
    },
    'psoriasis': {
      condition_match: 'psoriasis' as MedicalCondition,
      risk_flag: 'medium' as RiskFlag,
      visual_markers: ['scaling', 'redness', 'lesions'] as VisualMarker[],
    },
    'high-risk-mole': {
      condition_match: 'potential_melanoma' as MedicalCondition,
      risk_flag: 'high' as RiskFlag,
      visual_markers: ['asymmetry', 'irregular_border'] as VisualMarker[],
    },
    // Cosmetic presets return low-risk for medical
    'acne-pih': {
      condition_match: 'eczema' as MedicalCondition,
      risk_flag: 'low' as RiskFlag,
      visual_markers: [] as VisualMarker[],
    },
    'acne-mild': {
      condition_match: 'eczema' as MedicalCondition,
      risk_flag: 'low' as RiskFlag,
      visual_markers: [] as VisualMarker[],
    },
    'dark-circles': {
      condition_match: 'eczema' as MedicalCondition,
      risk_flag: 'low' as RiskFlag,
      visual_markers: [] as VisualMarker[],
    },
    'clear': {
      condition_match: 'eczema' as MedicalCondition,
      risk_flag: 'low' as RiskFlag,
      visual_markers: [] as VisualMarker[],
    },
  };

  return presets[preset] || presets['eczema'];
}

/**
 * Combined analysis function that routes to appropriate analyzer
 */
export async function analyzeSkin(
  imageData: string | null,
  agentType: 'cosmetic' | 'medical',
  options: AnalyzeSkinOptions = {}
): Promise<CosmeticScanResult | MedicalScanResult> {
  if (agentType === 'cosmetic') {
    return analyzeCosmeticSkin(imageData, options);
  }
  return analyzeMedicalSkin(imageData, options);
}

// Export preset type for use in DevTools
export type { MockPreset };

