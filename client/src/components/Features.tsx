import { Link } from 'wouter';
import { 
  Upload, 
  Map as MapIcon, 
  Navigation, 
  Download, 
  Layers, 
  Layout,
  ChevronRight
} from 'lucide-react';

const Features = () => {
  // The verified base URL from your file storage
  const baseUrl = "https://vida-prod-gitrepo.s3.us-east-1.amazonaws.com/webdev-storage/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/";

  const featureList = [
    { 
      title: "Easy Upload", 
      desc: "Upload drone photos and videos with automatic GPS metadata extraction.", 
      icon: Upload, 
      image: `${baseUrl}feature-easy-upload-efVpQXaN5Mmq982xJSV7KE.webp`, 
      link: "/features/easy-upload" 
    },
    { 
      title: "Interactive Maps", 
      desc: "Visualize your flights on Google Maps with markers, popups, and key data.", 
      icon: MapIcon, 
      image: `${baseUrl}feature-interactive-maps-UuiFZZApp49SBLYqnunszM.webp`, 
      link: "/features/interactive-maps" 
    },
    { 
      title: "Flight Path Tracking", 
      desc: "Automatic flight path visualization connecting sequential GPS points.", 
      icon: Navigation, 
      image: `${baseUrl}feature-flight-path-AfdMbjvVTNxTSKyUYDhpHo.webp`, 
      link: "/features/flight-path-tracking" 
    },
    { 
      title: "GPS Data Export", 
      desc: "Export in KML, CSV, GeoJSON, and GPX formats for any mapping software.", 
      icon: Download, 
      image: `${baseUrl}gps-data-export-3nXFptzNDFVoNB8V4s253R.webp`, 
      link: "/features/gps-data-export" 
    },
    { 
      title: "PDF Map Overlay", 
      desc: "Overlay construction plans and blueprints on your maps with precise corner positioning.", 
      icon: Layers, 
      image: `${baseUrl}feature-pdf-overlay-dsC9P8JfjwrJGcb8zt4UXm.webp`, 
      link: "/features/pdf-map-overlay" 
    },
    { 
      title: "Project Templates", 
      desc: "Save project configurations as templates and create new projects in seconds.", 
      icon: Layout, 
      image: `${baseUrl}feature-project-templates-DYfRa8TwAxvYPCdxorBVDg.webp`, 
      link: "/features/project-templates" 
    }
  ];

  return (
    <section id="features" className="relative bg-slate-50 dark:bg-[#050505] pt-32 pb-24 px-6 z-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 font-orbitron">
            Powerful Drone <span className="text-[#14E114]">Mapping</span> Features
          </h2>
          <p className="text-slate-600 dark:text-gray-400 text-lg max-w-3xl mx-auto">
            Everything you need to manage, visualize, and share your aerial mapping projects in one professional interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureList.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Link key={index} href={feature.link}>
                <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden group cursor-pointer hover:border-[#14E114]/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                  
                  {/* Image Preview Area */}
                  <div className="h-48 overflow-hidden bg-slate-200 dark:bg-gray-900 relative">
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-full h-full object-cover opacity-100 md:opacity-50 md:group-hover:opacity-100 transition-all duration-700"
                    />
                    <div className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-lg text-[#14E114] opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                  
                  {/* Content Area */}
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[#14E114]/10 flex items-center justify-center border border-[#14E114]/20 group-hover:bg-[#14E114]/20 transition-colors">
                        <IconComponent className="text-[#14E114]" size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white font-orbitron tracking-tight">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>

                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
