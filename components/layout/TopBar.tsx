'use client';

import { useAgent, useUser, useAgentUI } from '@/lib/contexts';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { activeAgent, agentTheme } = useAgent();
  const { isOnboarded } = useUser();
  const { toggleDrawer } = useAgentUI();
  const pathname = usePathname();

  const isNeutral = pathname?.startsWith('/onboarding') || !isOnboarded;

  const bgColor = isNeutral
    ? 'rgba(148, 163, 184, 0.08)'
    : activeAgent === 'cosmetic'
      ? 'rgba(251, 146, 60, 0.08)'
      : 'rgba(94, 234, 212, 0.08)';

  const borderColor = isNeutral
    ? 'rgba(148, 163, 184, 0.2)'
    : activeAgent === 'cosmetic'
      ? 'rgba(251, 146, 60, 0.2)'
      : 'rgba(94, 234, 212, 0.2)';

  return (
    <motion.header
      className={cn(
        'sticky top-0 z-40 w-full backdrop-blur-xl border-b',
        'transition-colors duration-300'
      )}
      style={{
        backgroundColor: bgColor,
        borderColor,
      }}
    >
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="DermAid Logo" 
            className="w-8 h-8 object-contain dark:invert"
          />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">DermAid</h1>
            <motion.p
              key={isNeutral ? 'Onboarding' : agentTheme.name}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-muted-foreground"
            >
              {isNeutral ? 'Onboarding' : agentTheme.name}
            </motion.p>
          </div>
        </div>

        {/* Agent Avatar (opens drawer) */}
        {!isNeutral && (
          <button
            onClick={toggleDrawer}
            aria-label="Open Agent"
            className="relative w-22 h-22 rounded-full overflow-hidden"
          >
            <img src="/avatar.png" alt="Agent" className="w-full h-full object-contain" />
          </button>
        )}
      </div>
    </motion.header>
  );
}

