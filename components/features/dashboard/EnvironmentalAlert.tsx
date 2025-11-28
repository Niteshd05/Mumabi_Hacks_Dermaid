'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Droplets, Wind, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EnvironmentalAlert as AlertType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EnvironmentalAlertProps {
  alerts: AlertType[];
}

const alertIcons = {
  uv: Sun,
  humidity: Droplets,
  temperature: Wind,
};

const severityStyles = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    text: 'text-blue-800 dark:text-blue-200',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400',
    text: 'text-amber-800 dark:text-amber-200',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
    text: 'text-red-800 dark:text-red-200',
  },
};

export function EnvironmentalAlertCard({ alerts }: EnvironmentalAlertProps) {
  if (alerts.length === 0) return null;

  return (
    <AnimatePresence mode="popLayout">
      {alerts.map((alert, index) => {
        const Icon = alertIcons[alert.type];
        const styles = severityStyles[alert.severity];

        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn('border-2 overflow-hidden', styles.bg, styles.border)}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', styles.icon)}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn('font-semibold text-sm', styles.text)}>
                        {alert.title}
                      </h3>
                      {alert.severity === 'danger' && (
                        <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {alert.message}
                    </p>
                    <div className={cn('text-xs font-medium p-2 rounded-lg', styles.icon)}>
                      {alert.actionRequired}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

