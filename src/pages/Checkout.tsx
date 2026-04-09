import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Banknote } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Checkout() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { items, totalAmount, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shippingCost = totalAmount >= 99 ? 0 : 9.99;
  const orderTotal = totalAmount + shippingCost;

  const checkoutSchema = z.object({
    customerName: z.string().min(2, t("checkout.name_required")).max(100),
    customerPhone: z.string().min(1, t("checkout.phone_required")),
    shippingCountry: z.string().min(2, t("checkout.country_required")),
    shippingCity: z.string().min(2, t("checkout.city_required")),
    shippingStreet: z.string().min(5, t("checkout.street_required")),
    shippingPostalCode: z.string().min(3, t("checkout.postal_required")),
    notes: z.string().max(1000).optional(),
  });

  type CheckoutForm = z.infer<typeof checkoutSchema>;

  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
  });

  const onSubmit = async (data: CheckoutForm) => {
    if (items.length === 0) {
      toast.error(t("cart.empty"));
      return;
    }

    setIsSubmitting(true);

    try {
      const cartItems = items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-cod-order", {
        body: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          shippingCountry: data.shippingCountry,
          shippingCity: data.shippingCity,
          shippingStreet: data.shippingStreet,
          shippingPostalCode: data.shippingPostalCode,
          notes: data.notes || undefined,
          cartItems,
        },
      });

      if (orderError) {
        throw new Error(orderError.message || "Failed to create order");
      }

      if (orderData?.error) {
        if (orderData.code === "COOLDOWN") {
          toast.error(orderData.error);
          setIsSubmitting(false);
          return;
        }
        throw new Error(orderData.error);
      }

      // Clear cart and redirect to success page
      clearCart();
      navigate(`/checkout/success?order_id=${orderData.orderId}`);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(t("toast.checkout_error"));
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/cart" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("checkout.back_to_cart")}
        </Link>

        <h1 className="font-display text-3xl lg:text-4xl font-bold mb-8">{t("checkout.title")}</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="font-display text-xl font-semibold mb-4">{t("checkout.contact_info")}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t("checkout.full_name")} *</label>
                  <Input {...register("customerName")} className="input-dark" />
                  {errors.customerName && (
                    <p className="text-sm text-destructive mt-1">{errors.customerName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("checkout.phone")} *</label>
                  <Input {...register("customerPhone")} type="tel" className="input-dark" />
                  {errors.customerPhone && (
                    <p className="text-sm text-destructive mt-1">{errors.customerPhone.message}</p>
                  )}
                </div>

                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground">{t("checkout.phone_notice")}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="font-display text-xl font-semibold mb-4">{t("checkout.shipping_address")}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t("checkout.street_address")} *</label>
                  <Input {...register("shippingStreet")} className="input-dark" />
                  {errors.shippingStreet && (
                    <p className="text-sm text-destructive mt-1">{errors.shippingStreet.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("checkout.city")} *</label>
                    <Input {...register("shippingCity")} className="input-dark" />
                    {errors.shippingCity && (
                      <p className="text-sm text-destructive mt-1">{errors.shippingCity.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("checkout.postal_code")} *</label>
                    <Input {...register("shippingPostalCode")} className="input-dark" />
                    {errors.shippingPostalCode && (
                      <p className="text-sm text-destructive mt-1">{errors.shippingPostalCode.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t("checkout.country")} *</label>
                  <Input {...register("shippingCountry")} className="input-dark" />
                  {errors.shippingCountry && (
                    <p className="text-sm text-destructive mt-1">{errors.shippingCountry.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="font-display text-xl font-semibold mb-4">{t("checkout.additional_comment")}</h2>
              <Textarea
                {...register("notes")}
                className="input-dark resize-none"
                rows={3}
                placeholder={t("checkout.notes_placeholder")}
              />
            </div>

            <div className="bg-card rounded-lg p-6 border border-border">
              <h2 className="font-display text-xl font-semibold mb-4">{t("checkout.payment")}</h2>
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <Banknote className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium">{t("checkout.cod_title")}</p>
                  <p className="text-sm text-muted-foreground">{t("checkout.cod_description")}</p>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full btn-hero">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("checkout.processing")}
                </>
              ) : (
                <>
                  <Banknote className="w-4 h-4 mr-2" />
                  {t("checkout.place_order")} ₾{orderTotal.toFixed(2)}
                </>
              )}
            </Button>
          </form>

          {/* Order Summary */}
          <div>
            <div className="bg-card rounded-lg p-6 border border-border sticky top-24">
              <h2 className="font-display text-xl font-bold mb-4">{t("cart.order_summary")}</h2>

              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.product.name.substring(0, 30)}...
                    </span>
                    <span>₾{(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                  <span>₾{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cart.shipping")}</span>
                  <span>{shippingCost === 0 ? t("cart.free") : `₾${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                  <span>{t("cart.total")}</span>
                  <span className="text-primary">₾{orderTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
