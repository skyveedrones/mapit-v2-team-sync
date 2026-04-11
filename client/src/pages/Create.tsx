/**
 * MAPIT — /create Drop Zone
 * Minimal full-screen drop zone. No nav, no footer. Back arrow only.
 */

import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function Create() {
  const [, setLocation] = useLocation();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        // Route to dashboard/new-project with files — placeholder until upload flow is wired
        setLocation("/dashboard");
      }
    },
    [setLocation]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        setLocation("/dashboard");
      }
    },
    [setLocation]
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Back arrow — only navigation */}
      <div className="absolute top-8 left-8 z-20">
        <button
          onClick={() => setLocation("/welcome")}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors duration-200 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Full-screen drop zone */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.label
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          htmlFor="file-input"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative w-full max-w-3xl aspect-video flex flex-col items-center justify-center
            border-2 border-dashed rounded-3xl cursor-pointer select-none
            transition-all duration-300
            ${isDragging
              ? "border-white/60 bg-white/5 scale-[1.01]"
              : "border-white/20 bg-transparent hover:border-white/35 hover:bg-white/[0.02]"
            }
          `}
        >
          {/* Metallic hook */}
          <p
            className="text-[clamp(5rem,14vw,9rem)] font-bold tracking-tighter leading-none mb-6 bg-clip-text text-transparent pointer-events-none"
            style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #4b5563)" }}
          >
            Drop.
          </p>

          {/* Instruction */}
          <p className="text-white/50 text-base text-center leading-relaxed pointer-events-none">
            Drag your drone imagery or .mp4 files here to begin.
          </p>

          {/* Subtle 'or click' hint */}
          <p className="mt-4 text-white/20 text-xs tracking-widest uppercase pointer-events-none">
            or click to browse
          </p>

          {/* Invisible file input */}
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*,video/mp4,.mp4,.mov,.avi,.jpg,.jpeg,.png,.tiff,.tif"
            className="sr-only"
            onChange={handleFileInput}
          />
        </motion.label>
      </div>
    </div>
  );
}
