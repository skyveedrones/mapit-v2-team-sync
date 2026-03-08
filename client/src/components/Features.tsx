import { Upload, Map as MapIcon, Navigation, Download, Layers, Layout } from 'lucide-react';

const Features = () => {
  const featureList = [
    {
      title: "Easy Upload",
      desc: "Upload drone photos and videos with automatic GPS metadata extraction.",
      icon: <Upload className="w-6 h-6 text-primary" />,
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/feature-easy-upload-efVpQXaN5Mmq982xJSV7KE.webp"
    },
    {
      title: "Interactive Maps",
      desc: "Visualize your flights on Google Maps with markers, popups, and key data.",
      icon: <MapIcon className="w-6 h-6 text-primary" />,
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/feature-interactive-maps-UuiFZZApp49SBLYqnunszM.webp"
    },
    {
      title: "Flight Path Tracking",
      desc: "Automatic flight path visualization connecting sequential GPS points.",
      icon: <Navigation className="w-6 h-6 text-primary" />,
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/feature-flight-path-AfdMbjvVTNxTSKyUYDhpHo.webp"
    },
    {
      title: "GPS Data Export",
      desc: "Export in KML, CSV, GeoJSON, and GPX formats for any mapping software.",
      icon: <Download className="w-6 h-6 text-primary" />,
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/gps-data-export-3nXFptzNDFVoNB8V4s253R.webp"
    },
    {
      title: "PDF Map Overlay",
      desc: "Overlay construction plans and blueprints on your maps with precise positioning.",
      icon: <Layers className="w-6 h-6 text-primary" />,
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/feature-pdf-overlay-dsC9P8JfjwrJGcb8zt4UXm.webp"
    },
    {
      title: "Project Templates",
      desc: "Save configurations as templates and create new projects in seconds.",
      icon: <Layout className="w-6 h-6 text-primary" />,
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/feature-project-templates-DYfRa8TwAxvYPCdxorBVDg.webp"
    }
  ];

  return (
    <section className="bg-black pt-32 pb-24 px-6 relative z-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Powerful Drone <span className="text-[#00ff88]">Mapping</span> Features
          </h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Everything you need to manage, visualize, and share your aerial mapping projects in one professional interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureList.map((feature, index) => (
            <div 
              key={index} 
              className="group relative bg-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden hover:border-[#00ff88]/30 transition-all duration-500"
            >
              {/* Image Preview Area with Fallback */}
              <div className="h-48 overflow-hidden bg-gradient-to-br from-gray-900 to-black relative">
                <img 
                  src={feature.image} 
                  alt={feature.title} 
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all duration-700"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80";
                  }}
                />
                {/* Visual texture for cards with missing images */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
              </div>

              {/* Content Area */}
              <div className="p-8 relative">
                <div className="w-12 h-12 rounded-lg bg-[#00ff88]/10 flex items-center justify-center border border-[#00ff88]/20 mb-6 group-hover:bg-[#00ff88]/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
