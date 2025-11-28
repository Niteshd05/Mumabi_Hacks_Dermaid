'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { WeatherState } from '@/lib/types';

interface WeatherContextType {
  weather: WeatherState;
  // Hackathon toggles - for demo purposes
  toggleHighUV: () => void;
  toggleHighHumidity: () => void;
  toggleDryWeather: () => void;
  setUVIndex: (uv: number) => void;
  setHumidity: (humidity: number) => void;
  resetWeather: () => void;
  // For agent triggers - setter function that takes a callback
  onWeatherChange?: (callback: (weather: WeatherState, previous: WeatherState) => void) => void;
}

const defaultWeather: WeatherState = {
  uvIndex: 3,
  humidity: 50,
  temperature: 22,
  isHighUV: false,
  isHighHumidity: false,
  isDryWeather: false,
};

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

// Thresholds for environmental conditions
const UV_HIGH_THRESHOLD = 8;
const HUMIDITY_HIGH_THRESHOLD = 70;
const HUMIDITY_LOW_THRESHOLD = 30;

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<WeatherState>(defaultWeather);
  const previousWeatherRef = useRef<WeatherState>(defaultWeather);
  const onChangeCallbackRef = useRef<((weather: WeatherState, previous: WeatherState) => void) | undefined>(undefined);

  const calculateFlags = useCallback((uvIndex: number, humidity: number): Partial<WeatherState> => {
    return {
      isHighUV: uvIndex >= UV_HIGH_THRESHOLD,
      isHighHumidity: humidity >= HUMIDITY_HIGH_THRESHOLD,
      isDryWeather: humidity <= HUMIDITY_LOW_THRESHOLD,
    };
  }, []);

  const updateWeather = useCallback((newWeather: WeatherState) => {
    const previous = previousWeatherRef.current;
    setWeather(newWeather);
    previousWeatherRef.current = newWeather;
    
    // Trigger callback if weather flags changed
    const hasSignificantChange = 
      previous.isHighUV !== newWeather.isHighUV ||
      previous.isHighHumidity !== newWeather.isHighHumidity ||
      previous.isDryWeather !== newWeather.isDryWeather;
    
    if (hasSignificantChange && onChangeCallbackRef.current) {
      onChangeCallbackRef.current(newWeather, previous);
    }
  }, []);

  const toggleHighUV = useCallback(() => {
    setWeather(prev => {
      const newUV = prev.isHighUV ? 3 : 10; // Toggle between safe (3) and high (10)
      const newWeather = {
        ...prev,
        uvIndex: newUV,
        ...calculateFlags(newUV, prev.humidity),
      };
      
      // Manually trigger change callback
      const hasChange = prev.isHighUV !== newWeather.isHighUV;
      if (hasChange && onChangeCallbackRef.current) {
        setTimeout(() => {
          onChangeCallbackRef.current?.(newWeather, prev);
        }, 100);
      }
      
      previousWeatherRef.current = newWeather;
      return newWeather;
    });
  }, [calculateFlags]);

  const toggleHighHumidity = useCallback(() => {
    setWeather(prev => {
      const newHumidity = prev.isHighHumidity ? 50 : 85; // Toggle between normal (50) and high (85)
      const newWeather = {
        ...prev,
        humidity: newHumidity,
        ...calculateFlags(prev.uvIndex, newHumidity),
      };
      
      const hasChange = prev.isHighHumidity !== newWeather.isHighHumidity;
      if (hasChange && onChangeCallbackRef.current) {
        setTimeout(() => {
          onChangeCallbackRef.current?.(newWeather, prev);
        }, 100);
      }
      
      previousWeatherRef.current = newWeather;
      return newWeather;
    });
  }, [calculateFlags]);

  const toggleDryWeather = useCallback(() => {
    setWeather(prev => {
      const newHumidity = prev.isDryWeather ? 50 : 20; // Toggle between normal (50) and dry (20)
      const newWeather = {
        ...prev,
        humidity: newHumidity,
        ...calculateFlags(prev.uvIndex, newHumidity),
      };
      
      const hasChange = prev.isDryWeather !== newWeather.isDryWeather;
      if (hasChange && onChangeCallbackRef.current) {
        setTimeout(() => {
          onChangeCallbackRef.current?.(newWeather, prev);
        }, 100);
      }
      
      previousWeatherRef.current = newWeather;
      return newWeather;
    });
  }, [calculateFlags]);

  const setUVIndex = useCallback((uvIndex: number) => {
    updateWeather({
      ...weather,
      uvIndex,
      ...calculateFlags(uvIndex, weather.humidity),
    });
  }, [weather, calculateFlags, updateWeather]);

  const setHumidity = useCallback((humidity: number) => {
    updateWeather({
      ...weather,
      humidity,
      ...calculateFlags(weather.uvIndex, humidity),
    });
  }, [weather, calculateFlags, updateWeather]);

  const resetWeather = useCallback(() => {
    setWeather(defaultWeather);
    previousWeatherRef.current = defaultWeather;
  }, []);

  return (
    <WeatherContext.Provider
      value={{
        weather,
        toggleHighUV,
        toggleHighHumidity,
        toggleDryWeather,
        setUVIndex,
        setHumidity,
        resetWeather,
        onWeatherChange: (cb) => {
          onChangeCallbackRef.current = cb;
        },
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const context = useContext(WeatherContext);
  if (context === undefined) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
}
