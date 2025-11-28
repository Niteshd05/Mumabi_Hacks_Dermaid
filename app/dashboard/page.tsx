'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileContainer, TopBar, BottomNav } from '@/components/layout';
import { DevTools } from '@/components/dev';
import {
  AgentToggle,
  EnvironmentalAlertCard,
  RoutineCard,
  ProgressCard,
  MedicalView,
} from '@/components/features/dashboard';
import { useAgent, useWeather, useUser, useSimulation } from '@/lib/contexts';
import { RecommendationEngine } from '@/lib/logic/RecommendationEngine';
import Link from 'next/link';

export default function DashboardPage() {
  const { activeAgent, lastCosmeticScan } = useAgent();
  const { weather } = useWeather();
  const { user } = useUser();
  const { simulation } = useSimulation();

  // Generate environmental alerts
  const environmentalAlerts = useMemo(() => {
    return RecommendationEngine.generateEnvironmentalAlerts(weather);
  }, [weather]);

  // Generate cosmetic routine based on context
  const dailyRoutine = useMemo(() => {
    if (!user) return null;
    return RecommendationEngine.generateCosmeticRoutine(
      lastCosmeticScan,
      weather,
      user
    );
  }, [lastCosmeticScan, weather, user]);

  return (
    <>
      <TopBar />
      <MobileContainer className="pb-24 pt-4">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-2xl font-bold">
            Hello, {user?.name?.split(' ')[0] || 'there'} 👋
          </h2>
          <p className="text-muted-foreground text-sm">
            {activeAgent === 'cosmetic' 
              ? "Let's take care of your skin today"
              : "Monitor your skin health"}
          </p>
        </motion.div>

        {/* Agent Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <AgentToggle />
        </motion.div>

        {/* Environmental Alerts */}
        <AnimatePresence mode="popLayout">
          {environmentalAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 space-y-3"
            >
              <EnvironmentalAlertCard alerts={environmentalAlerts} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content based on active agent */}
        <AnimatePresence mode="wait">
          {activeAgent === 'cosmetic' ? (
            <motion.div
              key="cosmetic"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Progress Card */}
              <ProgressCard />

              {/* Quick Scan CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Link href="/scan">
                  <div className="bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">Face Scan</h3>
                        <p className="text-sm text-white/80">
                          Analyze your skin condition
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <ScanFace className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Daily Routine */}
              {dailyRoutine && (
                <>
                  {/* Morning Routine */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <RoutineCard
                      title="Morning Routine"
                      timeOfDay="morning"
                      recommendations={dailyRoutine.morning}
                    />
                  </motion.div>

                  {/* Evening Routine */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <RoutineCard
                      title="Evening Routine"
                      timeOfDay="evening"
                      recommendations={dailyRoutine.evening}
                    />
                  </motion.div>

                  {/* Alerts from routine */}
                  {dailyRoutine.alerts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-violet-50 dark:bg-violet-950/30 rounded-2xl p-4 border border-violet-200 dark:border-violet-800"
                    >
                      <h3 className="font-semibold text-sm text-violet-700 dark:text-violet-300 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Personalized for You
                      </h3>
                      {dailyRoutine.alerts.map((alert) => (
                        <p key={alert.id} className="text-xs text-muted-foreground">
                          {alert.description}
                        </p>
                      ))}
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="medical"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <MedicalView />
            </motion.div>
          )}
        </AnimatePresence>
      </MobileContainer>
      <BottomNav />
      <DevTools />
    </>
  );
}

