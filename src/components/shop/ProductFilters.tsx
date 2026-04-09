import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCatalogData } from "@/hooks/useCatalogData";

interface ProductFiltersProps {
  filters: {
    category: string;
    brand: string;
    make: string;
    model: string;
    year: string;
    minPrice: string;
    maxPrice: string;
    search: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
}

export function ProductFilters({ filters, onFilterChange, onClearFilters }: ProductFiltersProps) {
  const { t } = useLanguage();
  const { categories, brands, loading } = useCatalogData();
  
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    brand: true,
    price: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // TODO: Re-enable vehicle make/model filtering in future version
  const hasActiveFilters = filters.category || filters.brand || filters.minPrice || filters.maxPrice;

  return (
    <div className="filter-section space-y-6">
      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="w-full"
        >
          <X className="w-4 h-4 mr-2" />
          {t("shop.clear_all_filters")}
        </Button>
      )}

      {/* Categories */}
      <div>
        <button
          onClick={() => toggleSection("category")}
          className="flex items-center justify-between w-full text-left font-semibold mb-3"
        >
          <span>{t("filter.category")}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.category ? "rotate-180" : ""}`} />
        </button>
        {expandedSections.category && (
          <div className="space-y-1">
            <button
              onClick={() => onFilterChange("category", "")}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                filters.category === "" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {t("filter.all_categories")}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onFilterChange("category", cat.name)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  filters.category === cat.name ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Brands */}
      <div>
        <button
          onClick={() => toggleSection("brand")}
          className="flex items-center justify-between w-full text-left font-semibold mb-3"
        >
          <span>{t("filter.brand")}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.brand ? "rotate-180" : ""}`} />
        </button>
        {expandedSections.brand && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <button
              onClick={() => onFilterChange("brand", "")}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                filters.brand === "" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {t("filter.all_brands")}
            </button>
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => onFilterChange("brand", brand.name)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  filters.brand === brand.name ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {brand.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div>
        <button
          onClick={() => toggleSection("price")}
          className="flex items-center justify-between w-full text-left font-semibold mb-3"
        >
          <span>{t("filter.price_range")}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.price ? "rotate-180" : ""}`} />
        </button>
        {expandedSections.price && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t("filter.min")}
              value={filters.minPrice}
              onChange={(e) => onFilterChange("minPrice", e.target.value)}
              className="input-dark"
            />
            <Input
              type="number"
              placeholder={t("filter.max")}
              value={filters.maxPrice}
              onChange={(e) => onFilterChange("maxPrice", e.target.value)}
              className="input-dark"
            />
          </div>
        )}
      </div>
    </div>
  );
}
