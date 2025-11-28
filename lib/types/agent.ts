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
  | 'dismiss';

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
}

export interface AgentMessage extends AgentResponse {
  timestamp: Date;
  read: boolean;
  pinned?: boolean;
}

// Preset agent personas for character/avatar
export interface AgentCharacter {
  name: string;
  role: string;
  avatar: string; // emoji or path
  color: string;
  accentColor: string;
  greeting: string;
}

export const AGENT_CHARACTERS: Record<AgentPersona, AgentCharacter> = {
  cosmetic: {
    name: 'Glow',
    role: 'Your Cosmetic Care Companion',
    avatar: '✨',
    color: '#FB923C',
    accentColor: '#F97316',
    greeting: "Hey there! Let's make your skin glow ✨",
  },
  medical: {
    name: 'Doc',
    role: 'Your Health Monitoring Assistant',
    avatar: '🩺',
    color: '#5EEAD4',
    accentColor: '#2DD4BF',
    greeting: "Hello! I'm here to help monitor your skin health.",
  },
  neutral: {
    name: 'DermAid',
    role: 'Your Skin Health Guide',
    avatar: '🌟',
    color: '#94A3B8',
    accentColor: '#64748B',
    greeting: "Welcome! Let's take care of your skin together.",
  },
};

