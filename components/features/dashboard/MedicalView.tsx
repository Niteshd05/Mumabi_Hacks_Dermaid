'use client';

import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  Activity,
  Calendar,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAgent, useWeather } from '@/lib/contexts';
import { RecommendationEngine } from '@/lib/logic/RecommendationEngine';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const riskStyles = {
  low: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: ShieldCheck,
    label: 'Low Risk',
  },
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    icon: AlertTriangle,
    label: 'Medium Risk',
  },
  high: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    icon: ShieldAlert,
    label: 'High Risk',
  },
};

export function MedicalView() {
  const router = useRouter();
  const { lastMedicalScan, activeAgent, setActiveAgent } = useAgent();
  const { weather } = useWeather();

  // Generate recommendations based on last scan
  const recommendations = RecommendationEngine.generateMedicalRecommendations(
    lastMedicalScan,
    weather
  );

  // If no scan yet, show placeholder
  if (!lastMedicalScan) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/30 mx-auto mb-4 flex items-center justify-center">
              <Activity className="w-8 h-8 text-teal-400" />
            </div>
            <h3 className="font-semibold mb-2">No Recent Scan</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Scan a skin concern to get personalized health insights
            </p>
            <Button className="bg-gradient-to-r from-teal-400 to-cyan-400 text-white" onClick={() => { if (activeAgent !== 'medical') setActiveAgent('medical'); router.push('/scan'); }}>
              Start Body Check
            </Button>
          </CardContent>
        </Card>

        {/* Health Tips Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              Health Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <HealthTip 
              title="Monitor Changes"
              description="Take photos of concerning areas to track changes over time."
            />
            <HealthTip 
              title="ABCDE Rule for Moles"
              description="Check for Asymmetry, Border irregularity, Color variation, Diameter > 6mm, Evolution."
            />
            <HealthTip 
              title="When to Seek Help"
              description="Consult a dermatologist for any rapidly changing or concerning skin conditions."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const risk = riskStyles[lastMedicalScan.risk_flag];
  const RiskIcon = risk.icon;

  return (
    <div className="space-y-4">
      {/* Risk Assessment Card */}
      <Card className={cn('border-2', risk.bg, risk.border)}>
        <CardContent className="py-6">
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center',
                lastMedicalScan.risk_flag === 'high' 
                  ? 'bg-red-500 animate-pulse' 
                  : lastMedicalScan.risk_flag === 'medium'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <RiskIcon className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <Badge className={cn('mb-1', risk.text, risk.bg)}>
                {risk.label}
              </Badge>
              <h3 className="font-semibold capitalize">
                {lastMedicalScan.condition_match.replace(/_/g, ' ')}
              </h3>
            </div>
          </div>

          {/* Visual Markers */}
          {lastMedicalScan.visual_markers.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Visual Markers Detected
              </p>
              <div className="flex flex-wrap gap-1">
                {lastMedicalScan.visual_markers.map((marker) => (
                  <Badge key={marker} variant="outline" className="capitalize text-xs">
                    {marker}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* High Risk Warning */}
          {lastMedicalScan.risk_flag === 'high' && (
            <div className="bg-red-100 dark:bg-red-900/50 rounded-xl p-4 mt-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
                ⚠️ Immediate Attention Required
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                This scan shows indicators that require professional evaluation. 
                Please consult a dermatologist as soon as possible.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && lastMedicalScan.risk_flag !== 'high' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, index) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-3 p-3 rounded-xl bg-muted/50"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  rec.priority === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-teal-100 text-teal-500'
                )}>
                  {index + 1}
                </div>
                <div>
                  <h4 className="text-sm font-medium">{rec.title}</h4>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Follow-up Reminder */}
      <Card className="bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Set a Reminder</p>
              <p className="text-xs text-muted-foreground">Check again in 3 days</p>
            </div>
            <Button size="sm" variant="outline">
              Remind Me
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HealthTip({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 shrink-0" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

