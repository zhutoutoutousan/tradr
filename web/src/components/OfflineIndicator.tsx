"use client";

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-2 right-2 z-50 flex items-center gap-2 bg-slate-900/95 backdrop-blur-sm border border-slate-700 px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 shadow-lg">
      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      <span>Offline</span>
    </div>
  );
}
