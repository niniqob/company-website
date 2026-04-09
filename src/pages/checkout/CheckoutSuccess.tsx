import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CheckoutSuccess() {
  const { t } = useLanguage();
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <div className="bg-card rounded-lg border border-border p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          
          <h1 className="font-display text-3xl font-bold mb-4">{t("success.title")}</h1>
          
          <p className="text-muted-foreground mb-6">
            {t("success.thank_you")}
          </p>

          {/* COD Payment Notice */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-foreground">
              {t("success.cod_notice")}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
            <Package className="w-4 h-4" />
            <span>{t("success.phone_notice")}</span>
          </div>

          <Link to="/shop">
            <Button className="btn-hero w-full">
              <ShoppingBag className="w-4 h-4 mr-2" />
              {t("success.continue_shopping")}
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
