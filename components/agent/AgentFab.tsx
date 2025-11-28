'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useAgentUI } from '@/lib/contexts';
import { useAgent } from '@/lib/contexts';
import { AGENT_CHARACTERS } from '@/lib/types/agent';
import { cn } from '@/lib/utils';

export function AgentFab() {
  const { toggleDrawer, unreadCount } = useAgentUI();
  const { activeAgent } = useAgent();
  
  const character = AGENT_CHARACTERS[activeAgent];

  return (
    <motion.button
      onClick={toggleDrawer}
      className={cn(
        'fixed bottom-18 z-40',
        'w-22 h-22 rounded-full',
        'flex items-center justify-center',
        'shadow-lg hover:shadow-xl',
        'transition-shadow'
      )}
      style={{
        background: `linear-gradient(135deg, ${character.color} 0%, ${character.accentColor} 100%)`,
        boxShadow: `0 10px 25px -5px ${character.color}40, 0 8px 10px -6px ${character.color}40`,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
    >
      {/* Avatar Image */}
      <img src="/avatar.png" alt="Agent" className="relative z-10 w-10 h-10 object-contain" />

      {/* Unread Badge */}
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse Animation */}
      {unreadCount > 0 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: character.color }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
      )}
    </motion.button>
  );
}

