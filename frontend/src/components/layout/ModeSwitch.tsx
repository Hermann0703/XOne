'use client';

import { useEffect } from 'react';
import { Briefcase, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/lib/store/sidebar-store';
import { useModeStore } from '@/stores/mode-store';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ModeSwitch() {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const mode = useModeStore((s) => s.mode);
  const toggleMode = useModeStore((s) => s.toggleMode);

  // Synchronize mode to documentElement for CSS data-mode selectors
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  const isWork = mode === 'work';
  const Icon = isWork ? User : Briefcase;
  const label = isWork ? '个人模式' : '工作模式';

  const buttonContent = (
    <button
      type="button"
      onClick={toggleMode}
      className={cn(
        'group relative flex items-center w-full gap-3 rounded-md transition-all duration-150',
        'text-muted-foreground hover:text-foreground hover:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-start px-3 py-2'
      )}
    >
      <motion.div
        animate={{ rotate: isWork ? 180 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="shrink-0"
      >
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </motion.div>

      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{label}</span>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}
