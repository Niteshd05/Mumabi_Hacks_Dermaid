'use client';

import { AlertTriangle, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface DermatologistReferralDialogProps {
  open: boolean;
  onClose: () => void;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  condition: string;
  message: string;
  tips: string[];
}

export function DermatologistReferralDialog({
  open,
  onClose,
  urgency,
  condition,
  message,
  tips,
}: DermatologistReferralDialogProps) {
  const router = useRouter();

  const urgencyStyles = {
    critical: {
      bg: 'from-red-500 to-rose-600',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    },
    high: {
      bg: 'from-orange-500 to-amber-600',
      icon: 'text-orange-600',
      badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    },
    medium: {
      bg: 'from-amber-500 to-yellow-600',
      icon: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    },
    low: {
      bg: 'from-blue-500 to-cyan-600',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    },
  };

  const styles = urgencyStyles[urgency];

  const handleFindDermatologist = () => {
    onClose();
    router.push('/find-dermatologist');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto overflow-hidden"
            >
              {/* Header with gradient */}
              <div className={cn('bg-gradient-to-r p-6 text-white', styles.bg)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Medical Evaluation Needed</h2>
                      <p className="text-white/80 text-sm">
                        {urgency === 'critical' ? 'Urgent' : urgency === 'high' ? 'High Priority' : 'Recommended'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <div className={cn('inline-block px-3 py-1 rounded-full text-xs font-medium mb-3', styles.badge)}>
                    {condition.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {message}
                  </p>
                </div>

                {tips.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">What to do now:</h3>
                    <ul className="space-y-2">
                      {tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-4">
                  <Button
                    onClick={handleFindDermatologist}
                    className="w-full"
                    size="lg"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Find Dermatologist Near You
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    I'll Schedule Later
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

