'use client';

import { motion } from 'framer-motion';
import { AgentPersona, AGENT_CHARACTERS } from '@/lib/types/agent';
import { cn } from '@/lib/utils';

interface AgentAvatarProps {
  agentType: AgentPersona;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  variant?: 'gradient' | 'plain';
}

const sizeClasses = {
  sm: 'w-12 h-12 text-2xl', // Increased from w-10 h-10
  md: 'w-16 h-16 text-4xl',
  lg: 'w-24 h-24 text-6xl', // Increased from w-24 h-24
  xl: 'w-32 h-32 text-8xl',
};

export function AgentAvatar({ agentType, size = 'md', animate = true, variant = 'gradient' }: AgentAvatarProps) {
  const character = AGENT_CHARACTERS[agentType];

  return (
    <motion.div
      className={cn(
        'rounded-full flex items-center justify-center relative overflow-hidden',
        sizeClasses[size]
      )}
      style={variant === 'gradient' ? {
        background: `linear-gradient(135deg, ${character.color} 0%, ${character.accentColor} 100%)`,
      } : undefined}
      animate={animate ? {
        scale: [1, 1.05, 1],
        rotate: [0, 2, -2, 0],
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatDelay: 3,
      }}
    >
      {/* Avatar image */}
      <img src="/avatar.png" alt="Agent Avatar" className="relative z-10 w-full h-full object-contain" />
      
      {/* Subtle glow effect (only for gradient variant) */}
      {variant === 'gradient' && (
        <motion.div
          className="absolute inset-0 bg-white/10"
          animate={{
            opacity: [0.05, 0.2, 0.05],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
      )}
    </motion.div>
  );
}

