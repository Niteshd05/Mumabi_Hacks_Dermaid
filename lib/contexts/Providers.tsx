'use client';

import { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { UserProvider } from './UserContext';
import { WeatherProvider } from './WeatherContext';
import { SimulationProvider } from './SimulationContext';
import { AgentProvider } from './AgentContext';
import { AgentUIProvider } from './AgentUIContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <UserProvider>
        <WeatherProvider>
          <SimulationProvider>
            <AgentProvider>
              <AgentUIProvider>
                {children}
              </AgentUIProvider>
            </AgentProvider>
          </SimulationProvider>
        </WeatherProvider>
      </UserProvider>
    </AuthProvider>
  );
}

