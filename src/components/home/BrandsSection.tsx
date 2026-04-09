import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCatalogData } from "@/hooks/useCatalogData";

export function BrandsSection() {
  const { t } = useLanguage();
  const { brands } = useCatalogData();

  // Only show brands marked as top brands, limit to 8
  const topBrands = brands.filter(b => b.is_top_brand).slice(0, 8);

  if (topBrands.length === 0) {
    return null;
  }

  return (
    <section className="py-16 lg:py-24 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">{t("brands.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("brands.subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {topBrands.map((brand, index) => (
            <Link key={brand.id} to={`/shop?brand=${brand.name}`} className="group p-6 bg-card rounded-lg border border-border hover:border-primary/50 transition-all text-center animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
              <span className="font-display font-semibold text-lg group-hover:text-primary transition-colors">{brand.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
