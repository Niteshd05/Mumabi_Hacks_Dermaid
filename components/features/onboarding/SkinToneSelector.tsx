'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { FitzpatrickScale, FITZPATRICK_INFO } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SkinToneSelectorProps {
  selected: FitzpatrickScale | null;
  onSelect: (scale: FitzpatrickScale) => void;
}

export function SkinToneSelector({ selected, onSelect }: SkinToneSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Your Skin Tone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This helps us provide melanin-safe recommendations tailored to your skin.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {FITZPATRICK_INFO.map((info) => (
          <motion.button
            key={info.scale}
            onClick={() => onSelect(info.scale)}
            className={cn(
              'relative p-4 rounded-xl border-2 transition-all',
              'hover:scale-105 active:scale-95',
              selected === info.scale
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 shadow-md'
                : 'border-border hover:border-orange-300'
            )}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Color Swatch */}
            <div
              className="w-full h-16 rounded-lg mb-2 border-2 border-border shadow-sm"
              style={{ backgroundColor: info.color }}
            />

            {/* Scale Label */}
            <div className="text-center">
              <p className="text-xs font-semibold">{info.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                {info.description}
              </p>
            </div>

            {/* Check Icon */}
            {selected === info.scale && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center"
              >
                <Check className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Selected Info */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-muted"
        >
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">{FITZPATRICK_INFO.find(f => f.scale === selected)?.name}</span>
            {' - '}
            {FITZPATRICK_INFO.find(f => f.scale === selected)?.sunReaction}
          </p>
        </motion.div>
      )}
    </div>
  );
}

