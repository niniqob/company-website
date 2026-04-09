import { Link } from "react-router-dom";
import { ShoppingCart, Package } from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { t } = useLanguage();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    toast.success(t("toast.added_to_cart"), {
      description: product.name,
    });
  };

  return (
    <Link to={`/product/${product.id}`} className="product-card block group h-full flex flex-col">
      {/* Image */}
      <div className="aspect-square bg-muted/50 relative overflow-hidden flex-shrink-0">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="text-destructive font-semibold">{t("product.out_of_stock")}</span>
          </div>
        )}
      </div>

      {/* Content - Fixed height container */}
      <div className="p-4 flex flex-col flex-1">
        {/* Brand/Category - single line with truncation */}
        <div className="flex items-center gap-2 mb-2 h-5">
          <span className="text-xs text-muted-foreground uppercase tracking-wide truncate">
            {product.brand}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">•</span>
          <span className="text-xs text-muted-foreground truncate">
            {product.category}
          </span>
        </div>

        {/* Product name - 2 lines max with fixed height */}
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2 h-12">
          {product.name}
        </h3>

        {/* Description - 2 lines max with fixed height and ellipsis */}
        <div className="h-10 mb-2 overflow-hidden">
          {product.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          ) : null}
        </div>

        {/* Fits line - 1 line max with fixed height */}
        <div className="h-5 mb-3">
          {product.car_make && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {t("product.fits")}: {product.car_make} {product.car_model}
              {product.car_year_from && ` (${product.car_year_from}-${product.car_year_to || t("product.present")})`}
            </p>
          )}
        </div>

        {/* Price + Cart - always pinned to bottom */}
        <div className="flex items-center justify-between mt-auto">
          <span className="font-display text-xl font-bold text-foreground">
            ₾{product.price.toFixed(2)}
          </span>
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="bg-primary hover:bg-primary/90"
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Link>
  );
}
