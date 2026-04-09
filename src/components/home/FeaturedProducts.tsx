import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function FeaturedProducts() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase.from("products").select("*").eq("is_featured", true).order("created_at", { ascending: false }).limit(8);
      if (data) setProducts(data as Product[]);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  if (loading) return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12"><h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">{t("featured.title")}</h2></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="product-card animate-pulse"><div className="aspect-square bg-muted" /><div className="p-4 space-y-2"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div></div>)}
        </div>
      </div>
    </section>
  );

  if (products.length === 0) return null;

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div><h2 className="font-display text-3xl lg:text-4xl font-bold mb-2">{t("featured.title")}</h2><p className="text-muted-foreground">{t("featured.subtitle")}</p></div>
          <Link to="/shop"><Button variant="outline" className="hidden sm:flex">{t("featured.view_all")}<ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map((product, index) => <div key={product.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}><ProductCard product={product} /></div>)}
        </div>
      </div>
    </section>
  );
}
