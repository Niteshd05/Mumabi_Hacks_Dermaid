'use client';

import { motion } from 'framer-motion';
import { Sparkles, Stethoscope } from 'lucide-react';
import { useAgent } from '@/lib/contexts';
import { cn } from '@/lib/utils';

export function AgentToggle() {
  const { activeAgent, setActiveAgent } = useAgent();

  return (
    <div className="relative bg-muted/50 rounded-2xl p-1 flex">
      {/* Sliding Background */}
      <motion.div
        className={cn(
          'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl',
          activeAgent === 'cosmetic'
            ? 'bg-gradient-to-r from-orange-400 to-amber-500'
            : 'bg-gradient-to-r from-teal-300 to-cyan-400'
        )}
        animate={{
          x: activeAgent === 'cosmetic' ? 0 : '100%',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />

      {/* Cosmetic Button */}
      <button
        onClick={() => setActiveAgent('cosmetic')}
        className={cn(
          'relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl',
          'transition-colors z-10',
          activeAgent === 'cosmetic' ? 'text-white' : 'text-muted-foreground'
        )}
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">Face Care</span>
      </button>

      {/* Medical Button */}
      <button
        onClick={() => setActiveAgent('medical')}
        className={cn(
          'relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl',
          'transition-colors z-10',
          activeAgent === 'medical' ? 'text-white' : 'text-muted-foreground'
        )}
      >
        <Stethoscope className="w-4 h-4" />
        <span className="text-sm font-medium">Body Check</span>
      </button>
    </div>
  );
}

