import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCatalystsData, useCatalystsByCategory, useAllCatalysts, CatalystItemWithCategory } from "@/hooks/useCatalystsData";
import { CatalystCategory } from "@/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Catalysts() {
  const { t } = useLanguage();
  const { categories, loading: categoriesLoading } = useCatalystsData();
  const [selectedCategory, setSelectedCategory] = useState<CatalystCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch all catalysts for global search
  const { items: allItems, loading: allItemsLoading } = useAllCatalysts();
  
  // Fetch items by category (for browsing without search)
  const { items: categoryItems, loading: categoryItemsLoading } = useCatalystsByCategory(selectedCategory?.id || null);
  
  // Auto-select first category when categories load (only if not searching)
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory && !searchQuery.trim()) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory, searchQuery]);

  // Determine which items to display and filter
  const isSearching = searchQuery.trim().length > 0;
  
  const displayItems = useMemo((): CatalystItemWithCategory[] => {
    const query = searchQuery.toLowerCase().trim();
    
    if (isSearching) {
      // Search across ALL catalysts regardless of category
      return allItems.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
      );
    }
    
    // Not searching - show category items
    return categoryItems.map(item => ({ ...item, category_name: selectedCategory?.name }));
  }, [searchQuery, isSearching, allItems, categoryItems, selectedCategory]);
  
  const itemsLoading = isSearching ? allItemsLoading : categoryItemsLoading;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl font-bold">{t("catalysts.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("catalysts.subtitle")}</p>
        </div>

        {categoriesLoading ? (
          <div className="flex gap-8">
            {/* Loading state */}
            <aside className="w-64 flex-shrink-0">
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            </aside>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">{t("catalysts.empty_categories")}</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Category Selector - Sidebar */}
            <aside className="w-full lg:w-64 flex-shrink-0">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                {t("catalysts.categories")}
              </h3>
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left whitespace-nowrap lg:whitespace-normal w-auto lg:w-full",
                      selectedCategory?.id === category.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border hover:bg-muted"
                    )}
                  >
                    {category.image_url && (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <span className="font-medium">{category.name}</span>
                  </button>
                ))}
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1">
              {/* Search Input */}
              <div className="mb-6">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={t("catalysts.search_placeholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {selectedCategory && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">{selectedCategory.name}</h2>
                  {selectedCategory.description && (
                    <p className="text-muted-foreground mt-1">{selectedCategory.description}</p>
                  )}
                </div>
              )}

              {itemsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-card rounded-lg border border-border animate-pulse">
                      <div className="aspect-square bg-muted" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayItems.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-lg border border-border">
                  <p className="text-muted-foreground">
                    {isSearching ? t("catalysts.no_results") : t("catalysts.empty_products")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                  {displayItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-card rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <div className="aspect-square w-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">{t("admin.product_form.no_image")}</span>
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground line-clamp-2">{item.name}</h3>
                        <p className="text-sm text-primary font-mono mt-1">{item.code}</p>
                        {isSearching && item.category_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.category_name}
                          </p>
                        )}
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
