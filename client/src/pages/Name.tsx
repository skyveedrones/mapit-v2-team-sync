/**
 * Act 1: /name — The Project Naming screen
 * Jobsian aesthetic: pure black, massive metallic hook, underline input, Enter to proceed
 * Mobile: inline touch button with arrow icon
 */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Name() {
  const [name, setName] = useState("");
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    // Store project name for Act 2
    sessionStorage.setItem("mapit_project_name", trimmed);
    navigate("/create");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      {/* Back arrow — only escape route */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/welcome">
          <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors duration-200 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </Link>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Massive metallic hook */}
        <h1
          className="font-bold tracking-tighter text-transparent bg-clip-text select-none mb-6"
          style={{
            fontSize: "clamp(4rem, 15vw, 10rem)",
            backgroundImage: "linear-gradient(to bottom, #ffffff 0%, #6b7280 100%)",
            lineHeight: 1,
          }}
        >
          Name
        </h1>

        {/* Instruction */}
        <p className="text-white/60 text-lg mb-12 text-center">
          Name your project to get started.
        </p>

        {/* Underline input with inline touch button */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
          <div className="relative w-full group">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main St Utility Survey"
              maxLength={255}
              className="w-full bg-transparent border-0 border-b-2 border-white/30 focus:border-[#00e676] outline-none text-white text-3xl md:text-5xl text-center pb-4 pr-16 placeholder:text-white/20 transition-colors duration-200"
              style={{ caretColor: "#10b981" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  handleSubmit();
                }
              }}
            />
            {/* Jobsian touch button */}
            {name.trim().length > 0 && (
              <button
                type="button"
                onClick={handleSubmit}
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#00e676] text-black w-12 h-12 flex items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(0,230,118,0.3)]"
                aria-label="Continue"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            )}
          </div>
          {/* Hidden submit — Enter key triggers it */}
          <button type="submit" className="hidden" />
        </form>

        {/* Responsive helper text */}
        {name.trim().length > 0 && (
          <div className="mt-6 text-slate-500 text-sm font-light tracking-wide animate-pulse">
            <span className="hidden md:inline">Press Return to continue</span>
            <span className="md:hidden">Tap arrow to continue</span>
          </div>
        )}
      </div>
    </div>
  );
}
