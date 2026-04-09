import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  product_name: string;
  product_sku: string;
  quantity: number;
  price_at_order: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  shipping_country: string;
  shipping_city: string;
  shipping_street: string;
  shipping_postal_code: string;
  notes?: string | null;
  total_amount: number;
  status: string;
  payment_status?: string | null;
  stripe_payment_intent?: string | null;
  tracking_number?: string | null;
  tracking_carrier?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  created_at: string;
}

interface EmailPayload {
  orderId: string;
  sendOwner: boolean;
  sendCustomer: boolean;
  statusEmailType?: "shipped" | "completed" | null;
}

// Escape HTML entities to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

// Helper: Format order date
function formatOrderDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Helper: Get short order ID
function getShortOrderId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

// Helper: Detect payment method
function getPaymentMethod(order: Order): string {
  if (order.payment_status === "paid" || order.stripe_payment_intent) {
    return "Card (Stripe)";
  }
  return "Cash on Delivery";
}

// Helper: Format shipping address
function formatAddress(order: Order): string {
  return `${escapeHtml(order.shipping_street)}<br>${escapeHtml(order.shipping_city)}, ${escapeHtml(order.shipping_postal_code)}<br>${escapeHtml(order.shipping_country)}`;
}

// Helper: Render order items table rows
function renderItemsRows(items: OrderItem[]): string {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(item.product_name)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(item.product_sku)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price_at_order.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price_at_order * item.quantity).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");
}

// Helper: Render full items table
function renderItemsTable(items: OrderItem[]): string {
  return `
    <table style="width: 100%; border-collapse: collapse; background: white;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="padding: 10px; text-align: left;">Product</th>
          <th style="padding: 10px; text-align: left;">OEM Code</th>
          <th style="padding: 10px; text-align: center;">Qty</th>
          <th style="padding: 10px; text-align: right;">Price</th>
          <th style="padding: 10px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${renderItemsRows(items)}
      </tbody>
    </table>
  `;
}

// Helper: Customer info table
function renderCustomerInfo(order: Order, orderDate: string): string {
  return `
    <table style="width: 100%;">
      <tr>
        <td style="padding: 4px 0;"><strong>Name:</strong></td>
        <td>${escapeHtml(order.customer_name)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;"><strong>Email:</strong></td>
        <td><a href="mailto:${escapeHtml(order.customer_email)}">${escapeHtml(order.customer_email)}</a></td>
      </tr>
      ${order.customer_phone ? `
      <tr>
        <td style="padding: 4px 0;"><strong>Phone:</strong></td>
        <td>${escapeHtml(order.customer_phone)}</td>
      </tr>
      ` : ""}
      <tr>
        <td style="padding: 4px 0;"><strong>Order Date:</strong></td>
        <td>${escapeHtml(orderDate)}</td>
      </tr>
    </table>
  `;
}

// Build Owner Notification Email
function buildOwnerEmail(order: Order, items: OrderItem[], paymentMethod: string): string {
  const orderDate = formatOrderDate(order.created_at);
  const shortId = getShortOrderId(order.id);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>New Order Notification</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a1a, #2d2d2d); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚗 New Order Received!</h1>
          <p style="margin: 5px 0 0; opacity: 0.9;">Order #${escapeHtml(shortId)}</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <h2 style="color: #c41e3a; margin-top: 0;">Customer Information</h2>
          ${renderCustomerInfo(order, orderDate)}

          <h2 style="color: #c41e3a;">Shipping Address</h2>
          <p style="margin: 0;">${formatAddress(order)}</p>

          ${order.notes ? `
          <h2 style="color: #c41e3a;">Order Notes</h2>
          <p style="background: #fff; padding: 10px; border-left: 3px solid #c41e3a; margin: 0;">${escapeHtml(order.notes)}</p>
          ` : ""}

          <h2 style="color: #c41e3a;">Order Items</h2>
          ${renderItemsTable(items)}

          <div style="margin-top: 15px; text-align: right;">
            <p style="margin: 5px 0; font-size: 16px;"><strong>Total: $${order.total_amount.toFixed(2)}</strong></p>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 4px;">
            <strong>💳 Payment Method:</strong> ${escapeHtml(paymentMethod)}
            ${order.payment_status ? `<br><strong>Payment Status:</strong> ${escapeHtml(order.payment_status)}` : ""}
          </div>
        </div>
        
        <div style="background: #1a1a1a; color: #999; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">This is an automated notification from AutoParts Store</p>
        </div>
      </body>
    </html>
  `;
}

// Build Customer Confirmation Email
function buildCustomerConfirmationEmail(order: Order, items: OrderItem[], paymentMethod: string): string {
  const orderDate = formatOrderDate(order.created_at);
  const shortId = getShortOrderId(order.id);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a1a, #2d2d2d); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🚗 Thank You for Your Order!</h1>
          <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">Order #${escapeHtml(shortId)}</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="font-size: 16px; margin-top: 0;">Hi ${escapeHtml(order.customer_name)},</p>
          <p>Thank you for shopping with AutoParts Store! We've received your order and it's being processed.</p>

          <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="color: #c41e3a; margin-top: 0;">Order Details</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 4px 0;"><strong>Order ID:</strong></td>
                <td>#${escapeHtml(shortId)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>Order Date:</strong></td>
                <td>${escapeHtml(orderDate)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>Payment Method:</strong></td>
                <td>${escapeHtml(paymentMethod)}</td>
              </tr>
            </table>
          </div>

          <h3 style="color: #c41e3a;">Shipping Address</h3>
          <p style="margin: 0; padding: 10px; background: white; border-radius: 4px;">${formatAddress(order)}</p>

          <h3 style="color: #c41e3a;">Items Ordered</h3>
          ${renderItemsTable(items)}

          <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 4px; text-align: right;">
            <p style="margin: 5px 0;"><strong>Subtotal:</strong> $${order.total_amount.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Shipping:</strong> Free</p>
            <p style="margin: 5px 0; font-size: 18px; color: #c41e3a;"><strong>Total: $${order.total_amount.toFixed(2)}</strong></p>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 4px; border-left: 4px solid #4caf50;">
            <strong>📦 What's Next?</strong>
            <p style="margin: 10px 0 0;">We'll process your order within 1-2 business days. You'll receive another email once your order has been shipped.</p>
          </div>
        </div>
        
        <div style="background: #1a1a1a; color: #999; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">Questions? Contact us at support@autoparts.com</p>
          <p style="margin: 5px 0 0;">AutoParts Store</p>
        </div>
      </body>
    </html>
  `;
}

// Build Status Update Email
function buildStatusEmail(order: Order, items: OrderItem[], statusType: "shipped" | "completed"): string {
  const shortId = getShortOrderId(order.id);
  
  const statusMessages = {
    shipped: {
      title: "Your Order Has Been Shipped! 📦",
      message: "Great news! Your order is on its way. You should receive it within 3-5 business days.",
      icon: "🚚"
    },
    completed: {
      title: "Your Order Is Complete! ✅",
      message: "Your order has been marked as completed. We hope you're enjoying your purchase!",
      icon: "🎉"
    }
  };

  const status = statusMessages[statusType];

  // Build tracking section for shipped emails
  let trackingSection = "";
  if (statusType === "shipped" && order.tracking_number) {
    trackingSection = `
      <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
        <h3 style="color: #856404; margin: 0 0 10px 0;">📍 Track Your Shipment</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 4px 0;"><strong>Tracking Number:</strong></td>
            <td style="font-family: monospace; font-size: 14px;">${escapeHtml(order.tracking_number)}</td>
          </tr>
          ${order.tracking_carrier ? `
          <tr>
            <td style="padding: 4px 0;"><strong>Carrier:</strong></td>
            <td>${escapeHtml(order.tracking_carrier)}</td>
          </tr>
          ` : ""}
        </table>
        ${order.tracking_url ? `
        <div style="margin-top: 12px;">
          <a href="${escapeHtml(order.tracking_url)}" 
             target="_blank" 
             style="display: inline-block; background: #c41e3a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Track Your Package →
          </a>
        </div>
        ` : ""}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Order ${statusType === "shipped" ? "Shipped" : "Completed"}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a1a, #2d2d2d); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${status.icon} ${status.title}</h1>
          <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">Order #${escapeHtml(shortId)}</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="font-size: 16px; margin-top: 0;">Hi ${escapeHtml(order.customer_name)},</p>
          <p>${status.message}</p>

          ${trackingSection}

          <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="color: #c41e3a; margin-top: 0;">Order Summary</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 4px 0;"><strong>Order ID:</strong></td>
                <td>#${escapeHtml(shortId)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>Items:</strong></td>
                <td>${items.length} item(s)</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>Total:</strong></td>
                <td>$${order.total_amount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <h3 style="color: #c41e3a;">Shipping Address</h3>
          <p style="margin: 0; padding: 10px; background: white; border-radius: 4px;">${formatAddress(order)}</p>

          ${statusType === "completed" ? `
          <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 4px; text-align: center;">
            <p style="margin: 0;">Thank you for choosing AutoParts Store!</p>
            <p style="margin: 10px 0 0;">We'd love to see you again.</p>
          </div>
          ` : ""}
        </div>
        
        <div style="background: #1a1a1a; color: #999; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">Questions? Contact us at support@autoparts.com</p>
          <p style="margin: 5px 0 0;">AutoParts Store</p>
        </div>
      </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-order-email function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const notificationEmail = Deno.env.get("ORDER_NOTIFICATION_EMAIL");

  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Email service unavailable" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (!notificationEmail) {
    console.error("ORDER_NOTIFICATION_EMAIL is not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Email service unavailable" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const payload: EmailPayload = await req.json();
    const { orderId, sendOwner, sendCustomer, statusEmailType } = payload;

    console.log(`Processing email request for order ${orderId}`, { sendOwner, sendCustomer, statusEmailType });

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Service unavailable" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Failed to fetch order:", orderError);
      return new Response(
        JSON.stringify({ success: false, error: "Unable to process request" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("Failed to fetch order items:", itemsError);
      return new Response(
        JSON.stringify({ success: false, error: "Unable to process request" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    const paymentMethod = getPaymentMethod(order);
    const shortId = getShortOrderId(order.id);
    const results: { owner?: boolean; customer?: boolean; errors: string[] } = { errors: [] };

    // Send owner notification
    if (sendOwner) {
      try {
        console.log(`Sending owner notification to ${notificationEmail}`);
        const ownerHtml = buildOwnerEmail(order, items || [], paymentMethod);
        await resend.emails.send({
          from: `AutoParts Store <${notificationEmail}>`,
          to: [notificationEmail],
          subject: `🚗 New Order #${shortId} - $${order.total_amount.toFixed(2)}`,
          html: ownerHtml,
        });
        results.owner = true;
        console.log("Owner notification sent successfully");
      } catch (error: any) {
        console.error("Failed to send owner email:", error.message);
        results.owner = false;
        results.errors.push("Owner email failed");
      }
    }

    // Send customer email
    if (sendCustomer && order.customer_email) {
      try {
        let customerHtml: string;
        let subject: string;

        if (statusEmailType === "shipped") {
          console.log(`Sending shipped status email to ${order.customer_email}`);
          customerHtml = buildStatusEmail(order, items || [], "shipped");
          subject = `Your AutoParts order #${shortId} has been shipped`;
        } else if (statusEmailType === "completed") {
          console.log(`Sending completed status email to ${order.customer_email}`);
          customerHtml = buildStatusEmail(order, items || [], "completed");
          subject = `Your AutoParts order #${shortId} is completed`;
        } else {
          console.log(`Sending confirmation email to ${order.customer_email}`);
          customerHtml = buildCustomerConfirmationEmail(order, items || [], paymentMethod);
          subject = `Your AutoParts order #${shortId} has been received`;
        }

        await resend.emails.send({
          from: `AutoParts Store <${notificationEmail}>`,
          to: [order.customer_email],
          subject,
          html: customerHtml,
        });
        results.customer = true;
        console.log("Customer email sent successfully");
      } catch (error: any) {
        console.error("Failed to send customer email:", error.message);
        results.customer = false;
        results.errors.push("Customer email failed");
      }
    }

    const success = results.errors.length === 0;
    console.log("Email processing complete", { success, results });

    return new Response(
      JSON.stringify({ 
        success, 
        ownerEmailSent: results.owner,
        customerEmailSent: results.customer,
        errors: results.errors.length > 0 ? results.errors : undefined 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-order-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Unable to process request" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
