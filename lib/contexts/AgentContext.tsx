'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
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
  // Initialize from localStorage if available
  const [activeAgent, setActiveAgentState] = useState<AgentType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeAgent');
      return (saved === 'cosmetic' || saved === 'medical') ? saved : 'cosmetic';
    }
    return 'cosmetic';
  });
  const [lastCosmeticScan, setLastCosmeticScanState] = useState<CosmeticScanResult | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('lastCosmeticScan');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [lastMedicalScan, setLastMedicalScanState] = useState<MedicalScanResult | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('lastMedicalScan');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const setLastCosmeticScan = useCallback((result: CosmeticScanResult | null) => {
    setLastCosmeticScanState(result);
    if (typeof window !== 'undefined') {
      if (result) {
        sessionStorage.setItem('lastCosmeticScan', JSON.stringify(result));
      } else {
        sessionStorage.removeItem('lastCosmeticScan');
      }
    }
  }, []);

  const setLastMedicalScan = useCallback((result: MedicalScanResult | null) => {
    setLastMedicalScanState(result);
    if (typeof window !== 'undefined') {
      if (result) {
        sessionStorage.setItem('lastMedicalScan', JSON.stringify(result));
      } else {
        sessionStorage.removeItem('lastMedicalScan');
      }
    }
  }, []);

  // Persist active agent to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeAgent', activeAgent);
    }
  }, [activeAgent]);

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

