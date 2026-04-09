import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchQuery } from "@/lib/sanitizeSearch";
import { Product } from "@/types";
import { Layout } from "@/components/layout/Layout";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductFilters } from "@/components/shop/ProductFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Shop() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    brand: searchParams.get("brand") || "",
    make: searchParams.get("make") || "",
    model: searchParams.get("model") || "",
    year: searchParams.get("year") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    search: searchParams.get("search") || "",
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setFilters({
      category: "",
      brand: "",
      make: "",
      model: "",
      year: "",
      minPrice: "",
      maxPrice: "",
      search: "",
    });
    setSearchParams(new URLSearchParams());
  };

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      let query = supabase.from("products").select("*");

      // Apply filters
      if (filters.category) {
        query = query.eq("category", filters.category);
      }
      if (filters.brand) {
        query = query.eq("brand", filters.brand);
      }
      if (filters.make) {
        query = query.eq("car_make", filters.make);
      }
      if (filters.model) {
        query = query.eq("car_model", filters.model);
      }
      if (filters.year) {
        const yearNum = parseInt(filters.year);
        // car_year_from <= selectedYear AND (car_year_to >= selectedYear OR car_year_to IS NULL)
        query = query.lte("car_year_from", yearNum).or(`car_year_to.gte.${yearNum},car_year_to.is.null`);
      }
      if (filters.minPrice) {
        query = query.gte("price", parseFloat(filters.minPrice));
      }
      if (filters.maxPrice) {
        query = query.lte("price", parseFloat(filters.maxPrice));
      }
      if (filters.search) {
        // Search across name, sku (oem code), brand, and search_keywords
        const sanitized = sanitizeSearchQuery(filters.search);
        query = query.or(`name.ilike.%${sanitized}%,sku.ilike.%${sanitized}%,brand.ilike.%${sanitized}%,search_keywords.ilike.%${sanitized}%`);
      }

      const { data } = await query.order("created_at", { ascending: false });

      if (data) {
        setProducts(data as Product[]);
      }
      setLoading(false);
    }

    fetchProducts();
  }, [filters]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold">{t("shop.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {products.length} {t("shop.products_found")}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 lg:w-64">
              <Input
                type="text"
                placeholder={t("shop.search_products")}
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="input-dark"
              />
            </div>

            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden"
            >
              <Filter className="w-4 h-4 mr-2" />
              {t("shop.filters")}
            </Button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className={`${showFilters ? "block" : "hidden"} lg:block w-full lg:w-64 flex-shrink-0`}>
            <ProductFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 lg:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="product-card animate-pulse">
                    <div className="aspect-square bg-muted" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-6 bg-muted rounded w-1/4 mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl text-muted-foreground mb-4">{t("shop.no_products")}</p>
                <Button onClick={handleClearFilters}>{t("shop.clear_filters")}</Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 lg:gap-6">
                {products.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
