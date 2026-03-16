import React, { useState, useEffect } from 'react';
import { VERSION } from '@shared/version';
import { X } from 'lucide-react';

/**
 * WhatsNewBanner Component
 * 
 * Displays a dismissible notification when the app version has been updated.
 * Uses localStorage to track the last seen version and only shows the banner
 * when the version changes.
 * 
 * Integration: Add to the main layout (e.g., App.tsx or main.tsx) so it appears
 * on every page after a version update.
 */
export const WhatsNewBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('mapit_last_version');

    // Show banner only if version has changed
    if (lastSeenVersion !== VERSION) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('mapit_last_version', VERSION);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 flex-1">
        <div className="text-2xl">🚀</div>
        <div className="flex flex-col">
          <span className="font-semibold">New Update Installed</span>
          <span className="text-sm text-emerald-100">Version {VERSION}</span>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="ml-4 p-1 hover:bg-white/20 rounded-md transition-colors flex-shrink-0"
        aria-label="Dismiss update notification"
      >
        <X size={20} />
      </button>
    </div>
  );
};
