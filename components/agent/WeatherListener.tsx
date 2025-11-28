'use client';

import { useEffect } from 'react';
import { useWeather, useAgent, useUser, useAgentUI } from '@/lib/contexts';
import { AgentAdapter } from '@/lib/logic/agentAdapter';
import { WeatherState } from '@/lib/types';

/**
 * Invisible component that listens to weather changes and triggers agent messages
 */
export function WeatherListener() {
  const { weather, onWeatherChange } = useWeather();
  const { activeAgent } = useAgent();
  const { user } = useUser();
  const { pushMessage, setTyping, openDrawer } = useAgentUI();

  useEffect(() => {
    if (!onWeatherChange) return;

    // Register the callback with onWeatherChange (it's a setter function)
    onWeatherChange((newWeather: WeatherState, previous: WeatherState) => {
      if (!user) return;

      // Only trigger if there's a significant change
      const hasSignificantChange = 
        previous.isHighUV !== newWeather.isHighUV ||
        previous.isHighHumidity !== newWeather.isHighHumidity ||
        previous.isDryWeather !== newWeather.isDryWeather;

      if (!hasSignificantChange) return;

      // Show typing indicator
      setTyping(true);

      setTimeout(() => {
        setTyping(false);
        
        // Generate agent response
        const response = AgentAdapter.fromEnvironmentalChange(
          newWeather,
          user,
          activeAgent
        );
        
        pushMessage(response);
        openDrawer();
      }, 1200);
    });
  }, [onWeatherChange, user, activeAgent, pushMessage, setTyping, openDrawer]);

  return null;
}

