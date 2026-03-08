import { useState } from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactModal = ({ isOpen, onClose }: ContactModalProps) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      projectType: formData.get('project'),
      message: formData.get('message'),
    };

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        throw new Error('Send failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again or email us directly.');
      console.error('Form submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-lg bg-[#09323B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Mapit Neon Accent Line */}
        <div className="h-1.5 w-full bg-primary" />
        
        <div className="p-8">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h3 className="text-2xl font-bold text-white mb-2">GET STARTED</h3>
                <p className="text-gray-300 text-sm mb-8">
                  Launch your next mapping project in Dallas. Our team will contact you within 24 hours.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      required 
                      name="name" 
                      className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary/50 outline-none" 
                      placeholder="Name" 
                    />
                    <input 
                      required 
                      name="email" 
                      type="email" 
                      className="bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary/50 outline-none" 
                      placeholder="Email" 
                    />
                  </div>
                  
                  <select 
                    name="project" 
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary/50 outline-none appearance-none"
                  >
                    <option className="bg-[#09323B]">Construction Monitoring</option>
                    <option className="bg-[#09323B]">Real Estate Mapping</option>
                    <option className="bg-[#09323B]">Infrastructure Inspection</option>
                    <option className="bg-[#09323B]">Other</option>
                  </select>

                  <textarea 
                    name="message" 
                    rows={3} 
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary/50 outline-none resize-none" 
                    placeholder="How can we help?" 
                  />

                  <button 
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/80 text-black font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all group disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Submit Request"}
                    {!loading && <Send size={18} className="group-hover:translate-x-1 transition-transform" />}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/30 shadow-[0_0_30px_rgba(0,255,136,0.2)]">
                  <CheckCircle2 size={40} className="text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">REQUEST SENT</h3>
                <p className="text-gray-300 mb-8 max-w-[280px] mx-auto">
                  Your flight plan is in motion. We'll be in touch shortly!
                </p>
                <button 
                  onClick={onClose}
                  className="text-primary font-bold hover:underline tracking-widest text-sm"
                >
                  CLOSE
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ContactModal;
