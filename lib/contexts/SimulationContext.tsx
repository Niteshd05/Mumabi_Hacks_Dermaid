'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SimulationState, WeeklyProgress } from '@/lib/types';

interface SimulationContextType {
  simulation: SimulationState;
  weeklyProgress: WeeklyProgress[];
  setWeek: (week: number) => void;
  simulateWeek: (week: 1 | 4 | 8 | 12) => void;
  resetSimulation: () => void;
  getCurrentProgress: () => WeeklyProgress | null;
}

// Mock progress data for demonstration
const mockWeeklyProgress: WeeklyProgress[] = [
  {
    week: 1,
    skinScore: 45,
    improvements: [],
    concerns: ['Active inflammatory acne', 'Visible dark spots (PIH)'],
    triggersIdentified: [],
  },
  {
    week: 4,
    skinScore: 62,
    improvements: ['Reduced inflammation by 30%', 'New acne breakouts decreased'],
    concerns: ['PIH still visible', 'Some dryness from treatment'],
    triggersIdentified: ['Dairy products', 'High-stress periods'],
  },
  {
    week: 8,
    skinScore: 75,
    improvements: ['Acne mostly cleared', 'Dark spots fading', 'Skin barrier strengthened'],
    concerns: ['Minor occasional breakouts'],
    triggersIdentified: ['Dairy products', 'High-stress periods', 'Skipping evening routine'],
  },
  {
    week: 12,
    skinScore: 88,
    improvements: ['Clear skin achieved', 'Even skin tone', 'Healthy moisture barrier'],
    concerns: [],
    triggersIdentified: ['Dairy products', 'High-stress periods', 'Skipping evening routine', 'Benzoyl Peroxide (caused bleaching)'],
  },
];

const defaultSimulation: SimulationState = {
  currentWeek: 1,
  isSimulating: false,
};

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [simulation, setSimulation] = useState<SimulationState>(defaultSimulation);
  const [weeklyProgress] = useState<WeeklyProgress[]>(mockWeeklyProgress);

  const setWeek = useCallback((week: number) => {
    setSimulation(prev => ({
      ...prev,
      currentWeek: Math.max(1, Math.min(12, week)),
    }));
  }, []);

  const simulateWeek = useCallback((week: 1 | 4 | 8 | 12) => {
    setSimulation({
      currentWeek: week,
      isSimulating: true,
    });
    
    // Reset simulating flag after animation
    setTimeout(() => {
      setSimulation(prev => ({ ...prev, isSimulating: false }));
    }, 500);
  }, []);

  const resetSimulation = useCallback(() => {
    setSimulation(defaultSimulation);
  }, []);

  const getCurrentProgress = useCallback((): WeeklyProgress | null => {
    // Find the closest week that doesn't exceed current week
    const validWeeks = weeklyProgress.filter(p => p.week <= simulation.currentWeek);
    return validWeeks.length > 0 ? validWeeks[validWeeks.length - 1] : null;
  }, [simulation.currentWeek, weeklyProgress]);

  return (
    <SimulationContext.Provider
      value={{
        simulation,
        weeklyProgress,
        setWeek,
        simulateWeek,
        resetSimulation,
        getCurrentProgress,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}

