'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AgentType, CosmeticScanResult, MedicalScanResult } from '@/lib/types';

interface AgentContextType {
  activeAgent: AgentType;
  setActiveAgent: (agent: AgentType) => void;
  toggleAgent: () => void;
  // Last scan results
  lastCosmeticScan: CosmeticScanResult | null;
  lastMedicalScan: MedicalScanResult | null;
  setLastCosmeticScan: (result: CosmeticScanResult | null) => void;
  setLastMedicalScan: (result: MedicalScanResult | null) => void;
  // Theme colors based on agent
  agentTheme: {
    primary: string;
    secondary: string;
    accent: string;
    gradient: string;
    name: string;
    icon: string;
  };
}

// Theme configurations for each agent
const COSMETIC_THEME = {
  primary: '#FB923C', // Orange
  secondary: '#FED7AA',
  accent: '#F97316',
  gradient: 'from-orange-400 to-amber-500',
  name: 'Cosmetic Care',
  icon: 'sparkles',
};

const MEDICAL_THEME = {
  primary: '#5EEAD4', // Light Turquoise
  secondary: '#99F6E4',
  accent: '#2DD4BF',
  gradient: 'from-teal-300 to-cyan-400',
  name: 'Medical Analysis',
  icon: 'stethoscope',
};

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [activeAgent, setActiveAgentState] = useState<AgentType>('cosmetic');
  const [lastCosmeticScan, setLastCosmeticScan] = useState<CosmeticScanResult | null>(null);
  const [lastMedicalScan, setLastMedicalScan] = useState<MedicalScanResult | null>(null);

  const setActiveAgent = useCallback((agent: AgentType) => {
    setActiveAgentState(agent);
  }, []);

  const toggleAgent = useCallback(() => {
    setActiveAgentState(prev => prev === 'cosmetic' ? 'medical' : 'cosmetic');
  }, []);

  const agentTheme = activeAgent === 'cosmetic' ? COSMETIC_THEME : MEDICAL_THEME;

  return (
    <AgentContext.Provider
      value={{
        activeAgent,
        setActiveAgent,
        toggleAgent,
        lastCosmeticScan,
        lastMedicalScan,
        setLastCosmeticScan,
        setLastMedicalScan,
        agentTheme,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}

