import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart, Package, ChevronLeft, Minus, Plus, Check, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface VehicleCompatibility {
  makeName: string;
  modelName: string | null;
}

export default function ProductDetail() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [compatibility, setCompatibility] = useState<VehicleCompatibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      
      const [productResult, compatResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("product_vehicle_compatibility")
          .select(`
            id,
            make_id,
            model_id,
            vehicle_makes!inner(name),
            vehicle_models(name)
          `)
          .eq("product_id", id)
      ]);

      if (productResult.data) {
        setProduct(productResult.data as Product);
      }

      if (compatResult.data) {
        const compatList: VehicleCompatibility[] = compatResult.data.map((row: any) => ({
          makeName: row.vehicle_makes?.name || "",
          modelName: row.vehicle_models?.name || null
        }));
        setCompatibility(compatList);
      }
      
      setLoading(false);
    }

    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    toast.success(t("toast.added_to_cart"), {
      description: `${quantity}x ${product.name}`,
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-32 mb-8" />
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-muted rounded-lg" />
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-12 bg-muted rounded w-1/4 mt-8" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{t("shop.no_products")}</h1>
          <Link to="/shop">
            <Button>{t("nav.shop")}</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Link to="/shop" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t("nav.shop")}
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <div className="aspect-square bg-card rounded-lg overflow-hidden border border-border">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-24 h-24 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="uppercase tracking-wide">{product.brand}</span>
              <span>•</span>
              <span>{product.category}</span>
            </div>

            <h1 className="font-display text-3xl lg:text-4xl font-bold mb-4">
              {product.name}
            </h1>

            <p className="text-sm text-muted-foreground mb-6">
              {t("product.oem_code")}: {product.sku}
            </p>

            {/* Price */}
            <div className="mb-6">
              <span className="font-display text-4xl font-bold text-foreground">
                ₾{product.price.toFixed(2)}
              </span>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2 mb-6">
              {product.stock > 0 ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-green-500 font-medium">
                    {t("product.in_stock")} ({product.stock})
                  </span>
                </>
              ) : (
                <span className="text-destructive font-medium">{t("product.out_of_stock")}</span>
              )}
            </div>

            {/* Car Compatibility */}
            {product.car_make && (
              <div className="bg-card border border-border rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">{t("product.compatibility")}</h3>
                <p className="text-muted-foreground">
                  {product.car_make} {product.car_model}
                  {product.car_year_from && (
                    <span className="ml-1">
                      ({product.car_year_from} - {product.car_year_to || "Present"})
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-muted transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-6 font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="p-3 hover:bg-muted transition-colors"
                  disabled={quantity >= product.stock}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
                className="flex-1 btn-hero"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {t("product.add_to_cart")}
              </Button>
            </div>

            {/* Description */}
            {product.description && (
              <div className="border-t border-border pt-6">
                <h3 className="font-semibold mb-3">{t("product.description")}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Vehicle Compatibility */}
            {compatibility.length > 0 && (
              <div className="border-t border-border pt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  {t("product.compatibility")}
                </h3>
                <div className="space-y-2">
                  {Object.entries(
                    compatibility.reduce((acc, item) => {
                      if (!acc[item.makeName]) {
                        acc[item.makeName] = [];
                      }
                      if (item.modelName) {
                        acc[item.makeName].push(item.modelName);
                      }
                      return acc;
                    }, {} as Record<string, string[]>)
                  ).map(([make, models]) => (
                    <div key={make} className="text-muted-foreground">
                      <span className="font-medium text-foreground">{make}</span>
                      {models.length > 0 && (
                        <span>: {models.join(", ")}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
