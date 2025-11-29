/**
 * Agent Persona Types
 * Defines the interactive agent messaging system
 */

import { EnvironmentalAlert, Recommendation } from './index';

export type AgentPersona = 'cosmetic' | 'medical' | 'neutral';
export type AgentTone = 'friendly' | 'clinical' | 'neutral';
export type MessageSeverity = 'info' | 'warning' | 'danger';

export type ActionIntent = 
  | 'apply_routine'
  | 'start_scan'
  | 'set_reminder'
  | 'open_profile'
  | 'view_education'
  | 'dismiss'
  | 'answer_question'; // New intent for answering agent questions

export interface AgentAction {
  id: string;
  label: string;
  intent: ActionIntent;
  payload?: unknown;
  icon?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
}

export interface RoutineDiff {
  added: Recommendation[];
  removed: Recommendation[];
  blocked: Recommendation[];
  modified: Recommendation[];
}

export interface AgentResponseMeta {
  severity?: MessageSeverity;
  confidence?: number;
  timestamp?: Date;
  triggeredBy?: 'scan' | 'environment' | 'onboarding' | 'manual' | 'time_travel';
  
  // Medical Agent Extras
  riskLevel?: 'high' | 'medium' | 'low';
  requiresDermatologist?: boolean;
  urgency?: 'critical' | 'high' | 'medium' | 'low';
  tips?: string[];
  products?: Array<{ product_id: string; product_name: string }>;
}

export interface AgentResponse {
  id: string;
  agentType: AgentPersona;
  tone: AgentTone;
  message: string;
  highlights?: string[];
  alerts?: EnvironmentalAlert[];
  actions?: AgentAction[];
  routineDiff?: RoutineDiff;
  meta?: AgentResponseMeta;

  // Agentic Interactivity
  type?: 'text' | 'question' | 'thought'; // Default is text
  options?: string[]; // For question type
  thoughtProcess?: string[]; // Thinking steps to visualize
  questionId?: string; // ID to link answer back to context
}

export interface AgentMessage extends AgentResponse {
  timestamp: Date;
  read: boolean;
  pinned?: boolean;
}

export const AGENT_CHARACTERS = {
  cosmetic: {
    name: 'Glow',
    role: 'Cosmetic Specialist',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    avatar: '✨',
  },
  medical: {
    name: 'Medi',
    role: 'Medical Assistant',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    avatar: '🩺',
  },
  neutral: {
    name: 'DermAid',
    role: 'Assistant',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    avatar: '🤖',
  },
};
