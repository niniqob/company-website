import { useRef } from "react";
import { Link } from "react-router-dom";
import { Disc, Settings, Lightbulb, Gauge, Cog, Zap, Car, Sofa, CircleDot, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage, translateIfExists } from "@/contexts/LanguageContext";
import { useCatalogData } from "@/hooks/useCatalogData";
import { Button } from "@/components/ui/button";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Brakes: Disc, Suspension: Settings, Engine: Gauge, Lighting: Lightbulb,
  Exhaust: Cog, Transmission: Cog, Electrical: Zap, "Body Parts": Car, Interior: Sofa, "Wheels & Tires": CircleDot,
};

export function CategorySection() {
  const { t } = useLanguage();
  const { categories } = useCatalogData();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getDescription = (categoryName: string, dbDescription?: string | null) => {
    return translateIfExists(t, `category.desc.${categoryName}`, dbDescription || "");
  };

  const getCategoryName = (categoryName: string) => {
    return translateIfExists(t, `category.${categoryName}`, categoryName);
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">{t("categories.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("categories.subtitle")}</p>
        </div>

        <div className="relative">
          {/* Left scroll button */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex bg-background/90 backdrop-blur-sm shadow-lg"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* Scrollable container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 lg:gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 md:px-10 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((category, index) => {
              const Icon = CATEGORY_ICONS[category.name] || Cog;
              const description = getDescription(category.name, category.description);
              const hasImage = !!category.image_url;
              
              return (
                <Link
                  key={category.id}
                  to={`/shop?category=${encodeURIComponent(category.name)}`}
                  className="group product-card p-4 text-center animate-fade-in flex-shrink-0 w-[180px] lg:w-[220px] snap-start flex flex-col"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Image or Icon container */}
                  <div className="w-full h-28 lg:h-32 mb-4 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    {hasImage ? (
                      <img 
                        src={category.image_url!} 
                        alt={getCategoryName(category.name)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Icon className="w-12 h-12 lg:w-14 lg:h-14 text-primary" />
                    )}
                  </div>
                  
                  {/* Category name - full visibility with wrapping */}
                  <h3 className="font-display font-semibold mb-2 text-sm lg:text-base leading-tight whitespace-normal break-words min-h-[2.5rem] lg:min-h-[3rem] flex items-center justify-center">
                    {getCategoryName(category.name)}
                  </h3>
                  
                  {/* Description - optional, clamped to 2 lines */}
                  {description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right scroll button */}
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex bg-background/90 backdrop-blur-sm shadow-lg"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
