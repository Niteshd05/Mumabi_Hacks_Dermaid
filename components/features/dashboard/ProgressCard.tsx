'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSimulation } from '@/lib/contexts';
import { cn } from '@/lib/utils';

export function ProgressCard() {
  const { simulation, getCurrentProgress } = useSimulation();
  const progress = getCurrentProgress();

  if (!progress) return null;

  const scoreColor = progress.skinScore >= 70 
    ? 'text-emerald-500' 
    : progress.skinScore >= 50 
      ? 'text-amber-500' 
      : 'text-red-500';

  const scoreBg = progress.skinScore >= 70 
    ? 'from-emerald-500 to-teal-500' 
    : progress.skinScore >= 50 
      ? 'from-amber-500 to-orange-500' 
      : 'from-red-500 to-rose-500';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-500" />
            Week {simulation.currentWeek} Progress
          </span>
          {simulation.isSimulating && (
            <Badge variant="secondary" className="animate-pulse">
              Simulating...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Skin Score */}
        <div className="flex items-center gap-4">
          <motion.div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center',
              'bg-gradient-to-br text-white font-bold text-xl',
              scoreBg
            )}
            key={progress.skinScore}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {progress.skinScore}
          </motion.div>
          <div>
            <p className="text-sm font-medium">Skin Health Score</p>
            <p className="text-xs text-muted-foreground">
              {progress.skinScore >= 70 
                ? 'Great progress!' 
                : progress.skinScore >= 50 
                  ? 'Improving steadily' 
                  : 'Building foundation'}
            </p>
          </div>
        </div>

        {/* Improvements */}
        {progress.improvements.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Improvements
            </h4>
            <div className="space-y-1">
              {progress.improvements.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  {item}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Concerns */}
        {progress.concerns.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Current Concerns
            </h4>
            <div className="space-y-1">
              {progress.concerns.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  {item}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Triggers Identified */}
        {progress.triggersIdentified.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-2">
              Triggers Identified
            </h4>
            <div className="flex flex-wrap gap-1">
              {progress.triggersIdentified.map((trigger, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {trigger}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

