import { useState } from "react";
import { Share2, Copy, CheckCircle, Users } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { motion } from "framer-motion";

const TOPO_SVG = `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-40-39c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm20-27c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zM0 80c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10zm80 0c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10zm0-80c0 5.523 4.477 10 10 10s10-4.477 10-10-4.477-10-10-10-10 4.477-10 10z' fill='%2310b981' fill-opacity='0.08' fill-rule='evenodd'/%3E%3C%2Fsvg%3E")`;

/**
 * Generates a short referral slug from the user's name and id.
 * e.g. "clay88" from name="Clay Bechtol" id=1
 */
function buildReferralSlug(name: string, id: number): string {
  const first = name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
  return `${first}${id}`;
}

export const ReferralWidget = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const slug = user ? buildReferralSlug(user.name ?? "pilot", user.id) : "pilot";
  const referralLink = `https://mapit.skyveedrones.com/signup?ref=${slug}`;

  const userInitials = user
    ? (user.name ?? "")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "CB"
    : "CB";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-slate-900 border border-white/10 rounded-3xl p-8 overflow-hidden relative"
    >
      {/* Topo Background Overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl"
        style={{ backgroundImage: TOPO_SVG }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center text-slate-950 font-bold text-sm flex-shrink-0">
            {userInitials}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#10b981]" />
              Refer a Pilot
            </h3>
            <p className="text-slate-400 text-sm">
              Grow the MAPIT network and earn rewards.
            </p>
          </div>
        </div>

        {/* Reward Box */}
        <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-6 mb-6">
          <h4 className="text-[#10b981] font-semibold mb-2">The Reward</h4>
          <p className="text-slate-300 text-sm leading-relaxed">
            Invite a colleague. When they upgrade to a Pro plan,{" "}
            <strong className="text-white">both of you get 1 month free.</strong>
          </p>
        </div>

        {/* Referral Link Copy */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-400 text-sm font-mono truncate">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="px-5 py-3 bg-[#10b981] hover:bg-[#0da673] text-slate-950 font-bold rounded-xl transition-all flex items-center gap-2 text-sm whitespace-nowrap"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>

        {/* Stats */}
        <div className="mt-8 flex gap-8 border-t border-white/5 pt-6">
          <div>
            <div className="text-2xl font-bold text-white">—</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">
              Invites Sent
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#10b981]">—</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">
              Months Earned
            </div>
          </div>
          <div className="ml-auto flex items-end">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ReferralWidget;
