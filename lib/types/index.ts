// ============================================
// DermAid Type Definitions
// ============================================

// User Profile Types
export type SkinType = 'oily' | 'dry' | 'combination' | 'sensitive';
export type FitzpatrickScale = 1 | 2 | 3 | 4 | 5 | 6;
export type SkinConcern = 'acne' | 'anti-aging' | 'dark-spots' | 'health-monitoring' | 'hydration';
export type AgentType = 'cosmetic' | 'medical';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  skinType: SkinType;
  fitzpatrickScale: FitzpatrickScale;
  concerns: SkinConcern[];
  onboardingComplete: boolean;
  createdAt: Date;
}

// Weather/Environment Types
export interface WeatherState {
  uvIndex: number;
  humidity: number;
  temperature: number;
  isHighUV: boolean;
  isHighHumidity: boolean;
  isDryWeather: boolean;
}

// Simulation State
export interface SimulationState {
  currentWeek: number;
  isSimulating: boolean;
}

// ML Response Types (from CONTEXT.md Section 6)
export type CosmeticCondition = 
  | 'acne_vulgaris' 
  | 'hyperpigmentation' 
  | 'dark_circles' 
  | 'fine_lines' 
  | 'whiteheads' 
  | 'blackheads'
  | 'inflammatory_acne'
  | 'pih'; // Post-Inflammatory Hyperpigmentation

export interface CosmeticScanResult {
  detected_conditions: CosmeticCondition[];
  severity_score: number; // 0-1
  confidence: number; // 0-1
}

export type MedicalCondition = 
  | 'atopic_dermatitis' 
  | 'psoriasis' 
  | 'fungal_infection' 
  | 'hives'
  | 'potential_melanoma'
  | 'eczema';

export type RiskFlag = 'low' | 'medium' | 'high';

export type VisualMarker = 
  | 'redness' 
  | 'scaling' 
  | 'asymmetry' 
  | 'irregular_border'
  | 'swelling'
  | 'lesions';

export interface MedicalScanResult {
  condition_match: MedicalCondition;
  risk_flag: RiskFlag;
  visual_markers: VisualMarker[];
}

// Recommendation Types
export interface Recommendation {
  id: string;
  type: 'product' | 'action' | 'warning' | 'alert';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeOfDay?: 'morning' | 'evening' | 'both';
  isBlocked?: boolean; // For environmental blocks (e.g., no retinol on high UV days)
  blockedReason?: string;
}

export interface DailyRoutine {
  morning: Recommendation[];
  evening: Recommendation[];
  alerts: Recommendation[];
}

// Scan History
export interface ScanRecord {
  id: string;
  timestamp: Date;
  agentType: AgentType;
  result: CosmeticScanResult | MedicalScanResult;
  recommendations: Recommendation[];
  imageUrl?: string;
}

// Progress Tracking (for "Time Travel" feature)
export interface WeeklyProgress {
  week: number;
  skinScore: number;
  improvements: string[];
  concerns: string[];
  triggersIdentified: string[];
}

// Environmental Alert
export interface EnvironmentalAlert {
  id: string;
  type: 'uv' | 'humidity' | 'temperature';
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  actionRequired: string;
}

// Fitzpatrick Scale Display Info
export interface FitzpatrickInfo {
  scale: FitzpatrickScale;
  name: string;
  description: string;
  color: string;
  sunReaction: string;
}

export const FITZPATRICK_INFO: FitzpatrickInfo[] = [
  {
    scale: 1,
    name: 'Type I',
    description: 'Very fair skin',
    color: '#FDEEE3',
    sunReaction: 'Always burns, never tans'
  },
  {
    scale: 2,
    name: 'Type II',
    description: 'Fair skin',
    color: '#F5D6C6',
    sunReaction: 'Burns easily, tans minimally'
  },
  {
    scale: 3,
    name: 'Type III',
    description: 'Medium skin',
    color: '#E5B99A',
    sunReaction: 'Burns moderately, tans gradually'
  },
  {
    scale: 4,
    name: 'Type IV',
    description: 'Olive skin',
    color: '#C99E7C',
    sunReaction: 'Burns minimally, tans well'
  },
  {
    scale: 5,
    name: 'Type V',
    description: 'Brown skin',
    color: '#A67C52',
    sunReaction: 'Rarely burns, tans darkly'
  },
  {
    scale: 6,
    name: 'Type VI',
    description: 'Dark brown/black skin',
    color: '#6B4423',
    sunReaction: 'Never burns, deeply pigmented'
  }
];

// Re-export agent types
export * from './agent';
