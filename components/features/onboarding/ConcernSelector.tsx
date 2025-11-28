'use client';

import { motion } from 'framer-motion';
import { Target, Sparkles, Clock, Heart, Droplets } from 'lucide-react';
import { SkinConcern } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ConcernSelectorProps {
  selected: SkinConcern[];
  onToggle: (concern: SkinConcern) => void;
}

const concerns: Array<{
  concern: SkinConcern;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    concern: 'acne',
    label: 'Clear Acne',
    description: 'Reduce breakouts and inflammation',
    icon: Target,
  },
  {
    concern: 'dark-spots',
    label: 'Fade Dark Spots',
    description: 'Even out skin tone and PIH',
    icon: Sparkles,
  },
  {
    concern: 'anti-aging',
    label: 'Anti-Aging',
    description: 'Reduce fine lines and wrinkles',
    icon: Clock,
  },
  {
    concern: 'hydration',
    label: 'Hydration',
    description: 'Improve moisture barrier',
    icon: Droplets,
  },
  {
    concern: 'health-monitoring',
    label: 'Health Monitoring',
    description: 'Track skin conditions',
    icon: Heart,
  },
];

export function ConcernSelector({ selected, onToggle }: ConcernSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">What Are Your Goals?</h3>
        <p className="text-sm text-muted-foreground">
          Select all that apply. You can change this later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {concerns.map((item) => {
          const Icon = item.icon;
          const isSelected = selected.includes(item.concern);

          return (
            <motion.button
              key={item.concern}
              onClick={() => onToggle(item.concern)}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all text-left',
                'hover:scale-105 active:scale-95',
                isSelected
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 shadow-md'
                  : 'border-border hover:border-orange-300'
              )}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg mb-2 flex items-center justify-center',
                isSelected
                  ? 'bg-orange-500'
                  : 'bg-muted'
              )}>
                <Icon className={cn(
                  'w-5 h-5',
                  isSelected ? 'text-white' : 'text-muted-foreground'
                )} />
              </div>
              <p className="font-semibold text-sm mb-1">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center"
                >
                  <span className="text-white text-[10px]">✓</span>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

