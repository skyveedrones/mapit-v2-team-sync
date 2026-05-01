import { useState, useEffect } from 'react';

export default function LandscapeNudge() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide the component after 8 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="hidden max-md:portrait:flex fixed bottom-6 left-4 right-4 z-[9999] bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-4 items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="text-[#00e676] animate-pulse">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16" />
          </svg>
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-white">Pro Tip</p>
          <p className="text-xs text-slate-400">Turn your phone sideways for the best map experience.</p>
        </div>
      </div>
      <button 
        onClick={() => setIsVisible(false)} 
        className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
