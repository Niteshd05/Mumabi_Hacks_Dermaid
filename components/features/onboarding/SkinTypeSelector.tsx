'use client';

import { motion } from 'framer-motion';
import { Droplets, Wind, Sparkles, AlertCircle } from 'lucide-react';
import { SkinType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SkinTypeSelectorProps {
  selected: SkinType | null;
  onSelect: (type: SkinType) => void;
}

const skinTypes: Array<{
  type: SkinType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}> = [
  {
    type: 'oily',
    label: 'Oily',
    description: 'Shiny, enlarged pores',
    icon: Droplets,
    color: 'from-blue-400 to-cyan-500',
  },
  {
    type: 'dry',
    label: 'Dry',
    description: 'Tight, flaky, rough',
    icon: Wind,
    color: 'from-amber-400 to-orange-500',
  },
  {
    type: 'combination',
    label: 'Combination',
    description: 'Oily T-zone, dry cheeks',
    icon: Sparkles,
    color: 'from-purple-400 to-pink-500',
  },
  {
    type: 'sensitive',
    label: 'Sensitive',
    description: 'Easily irritated, reactive',
    icon: AlertCircle,
    color: 'from-red-400 to-rose-500',
  },
];

export function SkinTypeSelector({ selected, onSelect }: SkinTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">What's Your Skin Type?</h3>
        <p className="text-sm text-muted-foreground">
          This helps us recommend the right products for your skin.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {skinTypes.map((item) => {
          const Icon = item.icon;
          const isSelected = selected === item.type;

          return (
            <motion.button
              key={item.type}
              onClick={() => onSelect(item.type)}
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
                'w-12 h-12 rounded-xl bg-gradient-to-br mb-3 flex items-center justify-center',
                item.color
              )}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="font-semibold text-sm mb-1">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center"
                >
                  <span className="text-white text-xs">✓</span>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

