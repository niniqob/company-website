import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

// TODO: Replace with final hero background image
import heroBackground from "@/assets/hero-bg.jpg";
import logoIcon from "@/assets/logo-icon.png";

export function HeroSection() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleBrowseParts = () => {
    navigate("/shop");
  };

  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] overflow-hidden bg-background">
      {/* Background Image with Overlay - uses background color for seamless blend */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-background/60" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: "40px 40px"
        }} />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 py-1.5 lg:py-2 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo badge replacing text */}
          <div className="mb-0.5 animate-fade-in">
            <img 
              src={logoIcon} 
              alt="AutoParts Logo" 
              className="h-32 sm:h-40 lg:h-48 mx-auto object-contain"
            />
          </div>

          <h1 className="font-georgian text-4xl sm:text-5xl lg:text-6xl font-semibold mb-6 leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {t("hero.title_1")}
          </h1>

          <div className="mt-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Button onClick={handleBrowseParts} className="btn-hero text-lg px-8 py-6">
              <Search className="w-5 h-5 mr-2" />{t("hero.browse_parts")}
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 mt-12 text-foreground/80 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">✓</span><span className="text-sm">{t("hero.quality_guaranteed")}</span></div>
            <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">🚚</span><span className="text-sm">{t("hero.fast_delivery")}</span></div>
          </div>

          {/* Free shipping text moved lower */}
          <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <span className="inline-block text-base font-medium text-foreground/90 bg-primary/15 px-4 py-2 rounded-full border border-primary/30">
              {t("hero.badge")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
