/**
 * Act 1: /name — The Project Naming screen
 * Jobsian aesthetic: pure black, massive metallic hook, underline input, Enter to proceed
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

        {/* Underline input */}
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main St Utility Survey"
            maxLength={255}
            className="w-full bg-transparent border-0 border-b border-white/30 focus:border-white/80 outline-none text-white text-xl text-center pb-3 placeholder:text-white/20 transition-colors duration-200"
            style={{ caretColor: "#10b981" }}
          />
          {/* Hidden submit — Enter key triggers it */}
          <button type="submit" className="hidden" />
        </form>

        {/* Enter hint */}
        {name.trim().length > 0 && (
          <p className="mt-6 text-white/30 text-sm animate-pulse">
            Press Enter to continue →
          </p>
        )}
      </div>
    </div>
  );
}
