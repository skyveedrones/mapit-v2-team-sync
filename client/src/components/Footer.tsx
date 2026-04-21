import { Mail, MapPin } from 'lucide-react';

interface FooterProps {
  onContactClick?: () => void;
}

const Footer = ({ onContactClick }: FooterProps) => {
  return (
    <footer className="bg-[#050505] border-t border-white/10 pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <img
              src="/images/mapit-logo-branded.png"
              alt="MAPIT"
              className="h-16 w-auto object-contain select-none"
              draggable={false}
            />
            <p className="text-gray-400 text-sm leading-relaxed">
              The ground truth. Delivered. High-precision site intelligence for the modern builder.
            </p>
          </div>

          {/* Product Map */}
          <div>
            <h4 className="text-white font-bold mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="/providers" className="hover:text-[#00ff88] transition-colors">For Pilots</a></li>
              <li><a href="/municipal" className="hover:text-[#00ff88] transition-colors">Municipal</a></li>
              <li><a href="/pricing" className="hover:text-[#00ff88] transition-colors">Pricing Plans</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="https://www.skyveedrones.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#00ff88] transition-colors">About SkyVee</a></li>
              <li><a href="/privacy" className="hover:text-[#00ff88] transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-[#00ff88] transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-white font-bold mb-6">Contact</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-[#00ff88]" />
                <a href="mailto:support@skyveedrones.com" className="hover:text-[#00ff88] transition-colors">support@skyveedrones.com</a>
              </li>
              <li className="flex items-center gap-3">
                <MapPin size={16} className="text-[#00ff88]" />
                <span>Based in Dallas, TX</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs">
            © 2026 MAPIT by SkyVee Drones. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
