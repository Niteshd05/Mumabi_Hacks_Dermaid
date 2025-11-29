'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, ScanFace, User, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgent } from '@/lib/contexts';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/scan', label: 'Scan', icon: ScanFace },
  { href: '/find-dermatologist', label: 'Find Derm', icon: MapPin },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { activeAgent } = useAgent();

  const accentColor = activeAgent === 'cosmetic' 
    ? 'rgb(251, 146, 60)' 
    : 'rgb(94, 234, 212)';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t">
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-1 py-2 px-4"
            >
              <motion.div
                className={cn(
                  'relative p-2 rounded-xl transition-colors',
                  isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                )}
                whileTap={{ scale: 0.95 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-xl"
                    style={{ backgroundColor: accentColor }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="w-5 h-5 relative z-10" />
              </motion.div>
              <span 
                className={cn(
                  'text-xs font-medium transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}

