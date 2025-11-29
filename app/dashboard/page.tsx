'use client';

import { useMemo, useEffect, useState } from 'react';
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
  ProductRecommendations,
} from '@/components/features/dashboard';
import { useAgent, useWeather, useUser, useSimulation } from '@/lib/contexts';
import { RecommendationEngine } from '@/lib/logic/RecommendationEngine';
import { Recommendation } from '@/lib/types';
import Link from 'next/link';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { DermatologistReferralDialog } from '@/components/medical/DermatologistReferralDialog';

export default function DashboardPage() {
  const { activeAgent, lastCosmeticScan } = useAgent();
  const { weather } = useWeather();
  const { user } = useUser();
  const { simulation } = useSimulation();
  const [cloudRec, setCloudRec] = useState<any | null>(null);
  const [showDermatologistDialog, setShowDermatologistDialog] = useState(false);
  const [dermatologistDialogData, setDermatologistDialogData] = useState<{
    urgency: 'critical' | 'high' | 'medium' | 'low';
    condition: string;
    message: string;
    tips: string[];
  } | null>(null);

  // Generate environmental alerts
  const environmentalAlerts = useMemo(() => {
    return RecommendationEngine.generateEnvironmentalAlerts(weather);
  }, [weather]);

  // Listen for dermatologist referral event (triggered 8s after scan)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleReferralEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      console.log('[Dashboard] Received dermatologist referral event:', data);
      setDermatologistDialogData(data);
      setShowDermatologistDialog(true);
    };

    window.addEventListener('showDermatologistReferral', handleReferralEvent);
    
    return () => {
      window.removeEventListener('showDermatologistReferral', handleReferralEvent);
    };
  }, []);

  // Subscribe to latest server-side recommendation document
  useEffect(() => {
    if (!user?.id) return;
    const col = collection(db, 'users', user.id, 'recommendations');
    const q = query(col, orderBy('timestamp', 'desc'), limit(1));
    const unsub = onSnapshot(q, snap => {
      setCloudRec(snap.docs[0]?.data() ?? null);
    });
    return () => unsub();
  }, [user?.id]);

  // Compute local routine as fallback when cloudRec missing
  const localRoutine = useMemo(() => {
    if (!user) return null;
    return RecommendationEngine.generateCosmeticRoutine(lastCosmeticScan, weather, user);
  }, [lastCosmeticScan, weather, user]);

  const activeRoutine = cloudRec?.recommendations?.routine || localRoutine;
  const recommendedProducts = cloudRec?.recommendations?.products || [];
  const recommendationNotes: string[] = Array.isArray(cloudRec?.notes) ? cloudRec.notes : [];

  return (
    <>
      {/* Dermatologist Referral Dialog */}
      {dermatologistDialogData && (
        <DermatologistReferralDialog
          open={showDermatologistDialog}
          onClose={() => setShowDermatologistDialog(false)}
          urgency={dermatologistDialogData.urgency}
          condition={dermatologistDialogData.condition}
          message={dermatologistDialogData.message}
          tips={dermatologistDialogData.tips}
        />
      )}

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
              {/* Progress Card (server-driven skinScore when available) */}
              <ProgressCard skinScore={cloudRec?.skinScore} />

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

              {/* Daily Routine (server-driven if available, else fallback) */}
              {activeRoutine && (
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
                      recommendations={activeRoutine.morning}
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
                      recommendations={activeRoutine.evening}
                    />
                  </motion.div>

                  {/* Alerts from routine */}
                  {activeRoutine.alerts.length > 0 && (
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
                      {activeRoutine.alerts.map((alert: Recommendation) => (
                        <p key={alert.id} className="text-xs text-muted-foreground">
                          {alert.description}
                        </p>
                      ))}
                    </motion.div>
                  )}
                </>
              )}

              {/* Environment/Equity notes from agent (server) */}
              {recommendationNotes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-200 dark:border-amber-800"
                >
                  <h3 className="font-semibold text-sm text-amber-700 dark:text-amber-300 mb-2">
                    Notes for Today
                  </h3>
                  <ul className="list-disc pl-4 space-y-1">
                    {recommendationNotes.map((n, i) => (
                      <li key={i} className="text-xs text-muted-foreground">{n}</li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Recommended Products (server) */}
              {recommendedProducts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <ProductRecommendations products={recommendedProducts} />
                </motion.div>
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

