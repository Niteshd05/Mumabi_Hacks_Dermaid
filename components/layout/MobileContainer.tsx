'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileContainerProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function MobileContainer({ children, className, noPadding }: MobileContainerProps) {
  return (
    <div 
      className={cn(
        'min-h-screen w-full max-w-md mx-auto bg-background relative',
        !noPadding && 'px-4',
        className
      )}
    >
      {children}
    </div>
  );
}

