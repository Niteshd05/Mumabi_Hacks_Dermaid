'use client';

import { motion } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  CheckCircle2, 
  AlertCircle, 
  Ban,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
// Using custom div instead of Card to avoid default padding/gap
import { Badge } from '@/components/ui/badge';
import { Recommendation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RoutineCardProps {
  title: string;
  timeOfDay: 'morning' | 'evening';
  recommendations: Recommendation[];
}

const priorityStyles = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const typeIcons = {
  product: Sparkles,
  action: CheckCircle2,
  warning: AlertCircle,
  alert: ShieldCheck,
};

export function RoutineCard({ title, timeOfDay, recommendations }: RoutineCardProps) {
  const TimeIcon = timeOfDay === 'morning' ? Sun : Moon;

  return (
    <div className="bg-card text-card-foreground rounded-xl border shadow-sm overflow-hidden">
      <div className={cn(
        'py-3 px-4',
        timeOfDay === 'morning' 
          ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30'
          : 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30'
      )}>
        <div className="flex items-center gap-2 text-base font-semibold">
          <TimeIcon className={cn(
            'w-5 h-5',
            timeOfDay === 'morning' ? 'text-amber-500' : 'text-indigo-500'
          )} />
          {title}
        </div>
      </div>
      <div className="p-0">
        <div className="divide-y">
          {recommendations.map((rec, index) => {
            const Icon = typeIcons[rec.type];
            const isBlocked = rec.isBlocked;

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-start gap-3 p-4',
                  isBlocked && 'bg-red-50/50 dark:bg-red-950/20'
                )}
              >
                {/* Step Number / Icon */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium',
                  isBlocked 
                    ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                    : rec.type === 'alert' || rec.type === 'warning'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400'
                      : 'bg-primary/10 text-primary'
                )}>
                  {isBlocked ? (
                    <Ban className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn(
                      'font-medium text-sm',
                      isBlocked && 'line-through text-muted-foreground'
                    )}>
                      {rec.title}
                    </h4>
                    {rec.priority === 'critical' && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {rec.description}
                  </p>
                  {isBlocked && rec.blockedReason && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {rec.blockedReason}
                    </p>
                  )}
                </div>

                {/* Priority Badge */}
                <Badge 
                  variant="secondary" 
                  className={cn('text-[10px] shrink-0', priorityStyles[rec.priority])}
                >
                  {rec.priority}
                </Badge>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

