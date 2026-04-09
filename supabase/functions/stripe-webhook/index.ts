import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

interface OrderItem {
  product_id: string | null;
  quantity: number;
  product_name: string;
  product_sku: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  low_stock_threshold: number;
}

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("Missing Stripe signature");
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Signature verification failed", { error: err instanceof Error ? err.message : String(err) });
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    logStep("Event received", { type: event.type });

    if (event.type !== "checkout.session.completed") {
      logStep("Ignoring event type", { type: event.type });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    if (!orderId) {
      logStep("No order_id in session metadata");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    logStep("Processing payment for order", {
      orderId,
      sessionId: session.id,
      paymentIntent: session.payment_intent,
      customerEmail: session.customer_email,
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Check if order is already paid to prevent double processing
    const { data: existingOrder, error: fetchOrderError } = await supabase
      .from("orders")
      .select("payment_status")
      .eq("id", orderId)
      .single();

    if (fetchOrderError) {
      logStep("Failed to fetch existing order", { error: fetchOrderError.message });
      throw new Error(`Failed to fetch order: ${fetchOrderError.message}`);
    }

    if (existingOrder?.payment_status === "paid") {
      logStep("Order already paid, skipping duplicate webhook", { orderId });
      return new Response(JSON.stringify({ received: true, orderId, skipped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update order to paid status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        stripe_session_id: session.id,
        stripe_payment_intent: typeof session.payment_intent === "string" 
          ? session.payment_intent 
          : session.payment_intent?.id || null,
        status: "confirmed",
      })
      .eq("id", orderId);

    if (updateError) {
      logStep("Failed to update order", { error: updateError.message });
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    logStep("Order updated successfully", { orderId });

    // Decrement stock for order items (non-blocking)
    const lowStockProducts: LowStockProduct[] = [];
    try {
      logStep("Fetching order items for stock update", { orderId });
      
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, quantity, product_name, product_sku")
        .eq("order_id", orderId);

      if (itemsError) {
        logStep("WARNING: Failed to fetch order items for stock update", { error: itemsError.message });
      } else if (orderItems && orderItems.length > 0) {
        logStep("Updating stock for order items", { count: orderItems.length });

        for (const item of orderItems as OrderItem[]) {
          if (!item.product_id) {
            logStep("Skipping stock update for item without product_id", { productName: item.product_name });
            continue;
          }

          try {
            // Decrement stock with GREATEST to prevent negative values
            const { data: updatedProduct, error: stockError } = await supabase
              .rpc("decrement_product_stock", { 
                p_product_id: item.product_id, 
                p_quantity: item.quantity 
              });

            if (stockError) {
              // Fallback: manual update if RPC doesn't exist
              logStep("RPC not available, using manual stock update", { productId: item.product_id });
              
              // Get current stock
              const { data: product, error: getError } = await supabase
                .from("products")
                .select("stock, low_stock_threshold, name, sku")
                .eq("id", item.product_id)
                .single();

              if (getError) {
                logStep("WARNING: Failed to get product for stock update", { 
                  productId: item.product_id, 
                  error: getError.message 
                });
                continue;
              }

              const newStock = Math.max(0, (product?.stock ?? 0) - item.quantity);
              const { error: updateStockError } = await supabase
                .from("products")
                .update({ stock: newStock })
                .eq("id", item.product_id);

              if (updateStockError) {
                logStep("WARNING: Failed to update product stock", { 
                  productId: item.product_id, 
                  error: updateStockError.message 
                });
              } else {
                logStep("Stock updated successfully", { 
                  productId: item.product_id, 
                  previousStock: product?.stock,
                  newStock,
                  decremented: item.quantity 
                });

                // Check for low stock
                const threshold = product?.low_stock_threshold ?? 5;
                if (newStock <= threshold) {
                  lowStockProducts.push({
                    id: item.product_id,
                    name: product?.name || item.product_name,
                    sku: product?.sku || item.product_sku,
                    stock: newStock,
                    low_stock_threshold: threshold,
                  });
                }
              }
            } else {
              logStep("Stock decremented via RPC", { productId: item.product_id, decremented: item.quantity });
            }
          } catch (stockUpdateError) {
            logStep("WARNING: Exception during stock update", { 
              productId: item.product_id, 
              error: stockUpdateError instanceof Error ? stockUpdateError.message : String(stockUpdateError) 
            });
          }
        }

        logStep("Stock update completed", { itemsProcessed: orderItems.length });
      }
    } catch (stockError) {
      logStep("WARNING: Stock update process failed (non-blocking)", { 
        error: stockError instanceof Error ? stockError.message : String(stockError) 
      });
    }

    // Send low stock email notification (non-blocking)
    if (lowStockProducts.length > 0) {
      try {
        logStep("Sending low stock alert email", { productsCount: lowStockProducts.length });
        
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const notificationEmail = Deno.env.get("ORDER_NOTIFICATION_EMAIL");

        if (resendApiKey && notificationEmail) {
          const resend = new Resend(resendApiKey);

          const productRows = lowStockProducts.map(p => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">${p.name}</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">${p.sku}</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: ${p.stock === 0 ? '#dc2626' : '#f59e0b'}; font-weight: bold;">${p.stock}</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${p.low_stock_threshold}</td>
            </tr>
          `).join("");

          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Low Stock Alert</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
              <div style="background-color: #ffffff; padding: 30px; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #f59e0b; margin: 0;">⚠️ Low Stock Alert</h1>
                </div>
                
                <p style="color: #333; font-size: 16px;">
                  The following products are at or below their low stock threshold after order processing:
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <thead>
                    <tr style="background-color: #f8f8f8;">
                      <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                      <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">SKU</th>
                      <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Remaining</th>
                      <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${productRows}
                  </tbody>
                </table>
                
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                  Please restock these items soon to avoid stockouts.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #888; font-size: 12px; text-align: center;">
                  This is an automated notification from your AutoParts store.
                </p>
              </div>
            </body>
            </html>
          `;

          await resend.emails.send({
            from: `AutoParts Store <${notificationEmail}>`,
            to: [notificationEmail],
            subject: `[AutoParts] Low Stock Alert - ${lowStockProducts.length} product(s) need attention`,
            html: emailHtml,
          });

          logStep("Low stock alert email sent successfully");
        } else {
          logStep("WARNING: Missing RESEND_API_KEY or ORDER_NOTIFICATION_EMAIL for low stock alert");
        }
      } catch (emailError) {
        logStep("WARNING: Failed to send low stock alert email (non-blocking)", { 
          error: emailError instanceof Error ? emailError.message : String(emailError) 
        });
      }
    }

    // Send confirmation emails (non-blocking)
    try {
      logStep("Triggering confirmation emails", { orderId });
      
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          orderId,
          sendOwner: true,
          sendCustomer: true,
          statusEmailType: null,
        }),
      });

      const emailResult = await emailResponse.json();
      logStep("Email function response", emailResult);

      if (!emailResult.success) {
        logStep("WARNING: Email sending had issues", { errors: emailResult.errors });
      }
    } catch (emailError) {
      logStep("WARNING: Email function error (non-blocking)", { 
        error: emailError instanceof Error ? emailError.message : String(emailError) 
      });
    }

    return new Response(JSON.stringify({ received: true, orderId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
});
