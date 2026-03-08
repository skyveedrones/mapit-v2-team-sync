import { Upload, Map as MapIcon, Navigation, Download, Layers, Layout } from 'lucide-react';

const Features = () => {
  const featureList = [
    {
      title: "Easy Upload",
      desc: "Upload drone photos and videos with automatic GPS metadata extraction.",
      icon: Upload,
      image: "/images/feature-upload.jpg"
    },
    {
      title: "Interactive Maps",
      desc: "Visualize your flights on Google Maps with markers, popups, and key data.",
      icon: MapIcon,
      image: "/images/feature-maps.jpg"
    },
    {
      title: "Flight Path Tracking",
      desc: "Automatic flight path visualization connecting sequential GPS points.",
      icon: Navigation,
      image: "/images/feature-path.jpg"
    },
    {
      title: "GPS Data Export",
      desc: "Export in KML, CSV, GeoJSON, and GPX formats for any mapping software.",
      icon: Download,
      image: "/images/feature-export.jpg"
    },
    {
      title: "PDF Map Overlay",
      desc: "Overlay construction plans and blueprints on your maps with precise positioning.",
      icon: Layers,
      image: "/images/feature-overlay.jpg"
    },
    {
      title: "Project Templates",
      desc: "Save configurations as templates and create new projects in seconds.",
      icon: Layout,
      image: "/images/feature-templates.jpg"
    }
  ];

  return (
    <section className="bg-black py-24 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Powerful Drone <span className="text-primary">Mapping</span> Features
          </h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Everything you need to manage, visualize, and share your aerial mapping projects in one professional interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureList.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={index} 
                className="group relative bg-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden hover:border-primary/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(20,225,20,0.05)]"
              >
                {/* Image Preview Area */}
                <div className="h-48 overflow-hidden">
                  <img 
                    src={feature.image} 
                    alt={feature.title} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" 
                  />
                </div>

                {/* Content Area */}
                <div className="p-8">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 mb-6 group-hover:bg-primary/20 transition-colors">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
