import { Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { XCircle, RefreshCw, ShoppingCart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CheckoutCancel() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <div className="bg-card rounded-lg border border-border p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-destructive" />
          </div>
          
          <h1 className="font-display text-3xl font-bold mb-4">{t("cancel.title")}</h1>
          
          <p className="text-muted-foreground mb-6">
            {t("cancel.message")}
          </p>
          
          {orderId && (
            <p className="text-sm text-muted-foreground mb-6">
              {t("success.order_id")}: <span className="font-mono">{orderId.slice(0, 8).toUpperCase()}</span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/checkout">
              <Button className="btn-hero w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("cancel.retry")}
              </Button>
            </Link>
            <Link to="/cart">
              <Button variant="outline" className="w-full sm:w-auto">
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t("cancel.return_to_cart")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
