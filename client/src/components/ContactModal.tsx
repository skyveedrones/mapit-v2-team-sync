/**
 * ContactModal — Jobsian premium contact form
 * Minimalist, plenty of whitespace, clean typography.
 * Sends via tRPC contact.send → Resend → clay@skyveedrones.com
 */

import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional dark-theme mode for use on dark pages (Pricing, Municipal) */
  dark?: boolean;
}

export function ContactModal({ open, onClose, dark = false }: ContactModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState((user as any)?.name ?? "");
  const [email, setEmail] = useState((user as any)?.email ?? "");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const sendMutation = trpc.contact.send.useMutation({
    onSuccess: () => {
      setSent(true);
      setMessage("");
    },
  });

  const validate = () => {
    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "Name is required.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "A valid email is required.";
    if (!message.trim()) errors.message = "Message cannot be empty.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    sendMutation.mutate({ name: name.trim(), email: email.trim(), message: message.trim() });
  };

  const handleClose = () => {
    setSent(false);
    setFieldErrors({});
    onClose();
  };

  if (!open) return null;

  const bg = dark ? "#111111" : "#ffffff";
  const fg = dark ? "#f9fafb" : "#0A0A0A";
  const subFg = dark ? "rgba(255,255,255,0.45)" : "#6b7280";
  const inputBg = dark ? "rgba(255,255,255,0.06)" : "#f9fafb";
  const inputBorder = dark ? "rgba(255,255,255,0.12)" : "#e5e7eb";
  const inputFg = dark ? "#f9fafb" : "#0A0A0A";
  const overlayBg = dark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.45)";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ background: overlayBg, backdropFilter: "blur(4px)" }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl"
        style={{
          background: bg,
          padding: "2.5rem 2rem",
          border: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
          style={{ color: subFg }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {sent ? (
          /* ── Success State ── */
          <div className="flex flex-col items-center text-center py-8">
            <CheckCircle2 className="w-12 h-12 mb-5" style={{ color: "#10b981" }} />
            <p className="font-semibold text-lg mb-2" style={{ color: fg, letterSpacing: "-0.02em" }}>
              Message Sent.
            </p>
            <p className="text-sm" style={{ color: subFg }}>
              We'll get back to you shortly, {name.split(" ")[0] || "Clay"}.
            </p>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <h2
              className="font-bold mb-1"
              style={{ fontSize: "1.35rem", letterSpacing: "-0.03em", color: fg }}
            >
              Get in touch
            </h2>
            <p className="text-sm mb-7" style={{ color: subFg }}>
              We'll respond within one business day.
            </p>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: subFg }}>
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: undefined })); }}
                  placeholder="Your full name"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: inputBg,
                    border: `1px solid ${fieldErrors.name ? "#ef4444" : inputBorder}`,
                    color: inputFg,
                  }}
                />
                {fieldErrors.name && <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: subFg }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: inputBg,
                    border: `1px solid ${fieldErrors.email ? "#ef4444" : inputBorder}`,
                    color: inputFg,
                  }}
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>}
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: subFg }}>
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setFieldErrors((p) => ({ ...p, message: undefined })); }}
                  placeholder="How can we help?"
                  rows={5}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
                  style={{
                    background: inputBg,
                    border: `1px solid ${fieldErrors.message ? "#ef4444" : inputBorder}`,
                    color: inputFg,
                  }}
                />
                {fieldErrors.message && <p className="mt-1 text-xs text-red-400">{fieldErrors.message}</p>}
              </div>

              {/* Server error */}
              {sendMutation.isError && (
                <p className="text-xs text-red-400">{sendMutation.error?.message ?? "Failed to send. Please try again."}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={sendMutation.isPending}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                style={{ background: dark ? "#ffffff" : "#0A0A0A", color: dark ? "#0A0A0A" : "#ffffff" }}
              >
                {sendMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Message"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ContactModal;
