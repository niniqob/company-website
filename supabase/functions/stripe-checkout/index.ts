import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGINS = [
  "https://idomxajidxdpidecxktg.lovableproject.com",
  "https://autocenter.ge",
  "https://www.autocenter.ge",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-CHECKOUT] ${step}${detailsStr}`);
};

// Input validation schemas
const MAX_STRING_LENGTH = 255;
const MAX_NOTES_LENGTH = 1000;
const MAX_ITEMS = 50;

interface CartItem {
  productId: string;
  quantity: number;
}

interface CheckoutRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingCountry: string;
  shippingCity: string;
  shippingStreet: string;
  shippingPostalCode: string;
  notes?: string;
  cartItems: CartItem[];
}

function validateString(value: unknown, fieldName: string, maxLength: number, required = true): string {
  if (value === null || value === undefined || value === "") {
    if (required) throw new Error(`${fieldName} is required`);
    return "";
  }
  if (typeof value !== "string") throw new Error(`${fieldName} must be a string`);
  const trimmed = value.trim();
  if (required && trimmed.length === 0) throw new Error(`${fieldName} is required`);
  if (trimmed.length > maxLength) throw new Error(`${fieldName} must be ${maxLength} characters or less`);
  return trimmed;
}

function validateEmail(value: unknown): string {
  const email = validateString(value, "customerEmail", MAX_STRING_LENGTH, true);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new Error("Invalid email format");
  return email;
}

function validateCartItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) throw new Error("cartItems must be an array");
  if (items.length === 0) throw new Error("Cart is empty");
  if (items.length > MAX_ITEMS) throw new Error(`Cart cannot have more than ${MAX_ITEMS} items`);
  
  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid cart item at index ${index}`);
    }
    const { productId, quantity } = item as Record<string, unknown>;
    
    if (typeof productId !== "string" || productId.length === 0) {
      throw new Error(`Invalid productId at index ${index}`);
    }
    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      throw new Error(`Invalid productId format at index ${index}`);
    }
    
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error(`Invalid quantity at index ${index}, must be 1-100`);
    }
    
    return { productId, quantity };
  });
}

function validateRequest(body: unknown): CheckoutRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }
  
  const data = body as Record<string, unknown>;
  
  return {
    customerName: validateString(data.customerName, "customerName", MAX_STRING_LENGTH, true),
    customerEmail: validateEmail(data.customerEmail),
    customerPhone: validateString(data.customerPhone, "customerPhone", MAX_STRING_LENGTH, false) || undefined,
    shippingCountry: validateString(data.shippingCountry, "shippingCountry", MAX_STRING_LENGTH, true),
    shippingCity: validateString(data.shippingCity, "shippingCity", MAX_STRING_LENGTH, true),
    shippingStreet: validateString(data.shippingStreet, "shippingStreet", MAX_STRING_LENGTH, true),
    shippingPostalCode: validateString(data.shippingPostalCode, "shippingPostalCode", MAX_STRING_LENGTH, true),
    notes: validateString(data.notes, "notes", MAX_NOTES_LENGTH, false) || undefined,
    cartItems: validateCartItems(data.cartItems),
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables not configured");
    }

    // Parse and validate request
    const requestBody = await req.json();
    const validatedData = validateRequest(requestBody);
    logStep("Request validated", { 
      email: validatedData.customerEmail, 
      itemCount: validatedData.cartItems.length 
    });

    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Fetch product details for all cart items to get actual prices
    const productIds = validatedData.cartItems.map(item => item.productId);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, sku, price, stock")
      .in("id", productIds);

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    if (!products || products.length !== productIds.length) {
      throw new Error("One or more products not found");
    }

    // Build product lookup map
    const productMap = new Map(products.map(p => [p.id, p]));

    // STOCK VALIDATION: Check if all products have sufficient stock BEFORE proceeding
    for (const item of validatedData.cartItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }
      
      if (product.stock < item.quantity) {
        logStep("ERROR: Insufficient stock", { 
          productId: item.productId, 
          productName: product.name,
          available: product.stock, 
          requested: item.quantity 
        });
        return new Response(JSON.stringify({ 
          error: `პროდუქტის "${product.name}" მარაგი არასაკმარისია. ხელმისაწვდომია: ${product.stock} ცალი.`,
          code: "INSUFFICIENT_STOCK"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    // ATOMIC STOCK DECREMENT: Decrease stock for each item with conditional update
    // If any fails, we need to rollback the successful ones
    const stockUpdates: { productId: string; previousStock: number; newStock: number }[] = [];
    
    for (const item of validatedData.cartItems) {
      const product = productMap.get(item.productId)!;
      const newStock = product.stock - item.quantity;
      
      // Use conditional update to ensure atomicity
      const { data: updateResult, error: stockError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.productId)
        .gte("stock", item.quantity) // Only update if stock is still sufficient
        .select("id, stock")
        .maybeSingle();

      if (stockError) {
        logStep("ERROR: Stock update failed", { productId: item.productId, error: stockError.message });
        // Rollback previous stock updates
        await rollbackStockUpdates(supabase, stockUpdates);
        throw new Error(`Stock update failed: ${stockError.message}`);
      }

      if (!updateResult) {
        // Race condition: stock was modified by another request
        logStep("ERROR: Stock race condition detected", { productId: item.productId });
        // Rollback previous stock updates
        await rollbackStockUpdates(supabase, stockUpdates);
        return new Response(JSON.stringify({ 
          error: `პროდუქტის "${product.name}" მარაგი შეიცვალა. გთხოვთ, სცადოთ თავიდან.`,
          code: "STOCK_CHANGED"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409, // Conflict
        });
      }

      stockUpdates.push({
        productId: item.productId,
        previousStock: product.stock,
        newStock: newStock,
      });
      
      logStep("Stock decremented", { 
        productId: item.productId, 
        productName: product.name,
        oldStock: product.stock, 
        newStock: newStock 
      });
    }

    // Build order items with verified prices
    const orderItemsData = validatedData.cartItems.map(item => {
      const product = productMap.get(item.productId)!;
      return {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: item.quantity,
        price_at_order: product.price, // Use actual price from DB, not client
      };
    });

    // Calculate total using verified prices
    const subtotal = orderItemsData.reduce(
      (sum, item) => sum + Number(item.price_at_order) * item.quantity,
      0
    );
    const shippingCost = subtotal >= 99 ? 0 : 9.99;
    const orderTotal = subtotal + shippingCost;

    logStep("Order calculated", { subtotal, shippingCost, orderTotal });

    // Create order in database (server-side, with verified data)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: validatedData.customerName,
        customer_email: validatedData.customerEmail,
        customer_phone: validatedData.customerPhone || null,
        shipping_country: validatedData.shippingCountry,
        shipping_city: validatedData.shippingCity,
        shipping_street: validatedData.shippingStreet,
        shipping_postal_code: validatedData.shippingPostalCode,
        notes: validatedData.notes || null,
        total_amount: orderTotal,
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      logStep("ERROR: Failed to create order", { error: orderError?.message });
      // Rollback stock updates
      await rollbackStockUpdates(supabase, stockUpdates);
      throw new Error(`Failed to create order: ${orderError?.message || "Unknown error"}`);
    }
    logStep("Order created", { orderId: order.id });

    // Create order items with verified prices
    const orderItemsToInsert = orderItemsData.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsToInsert);

    if (itemsError) {
      // Cleanup: delete the order and rollback stock if items failed
      await supabase.from("orders").delete().eq("id", order.id);
      await rollbackStockUpdates(supabase, stockUpdates);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }
    logStep("Order items created", { count: orderItemsToInsert.length });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Build line items for Stripe using verified prices
    const lineItems = orderItemsData.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(Number(item.price_at_order) * 100),
        product_data: {
          name: item.product_name,
          metadata: {
            sku: item.product_sku,
            product_id: item.product_id || "",
          },
        },
      },
    }));

    // Add shipping if applicable
    if (shippingCost > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(shippingCost * 100),
          product_data: {
            name: "Shipping",
            metadata: {
              sku: "SHIPPING",
              product_id: "",
            },
          },
        },
      });
    }

    const origin = req.headers.get("origin") || "https://idomxajidxdpidecxktg.lovableproject.com";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.customer_email,
      line_items: lineItems,
      metadata: {
        order_id: order.id,
      },
      success_url: `${origin}/checkout/success?order_id=${order.id}`,
      cancel_url: `${origin}/checkout/cancel?order_id=${order.id}`,
    });

    logStep("Created Stripe session", { sessionId: session.id });

    // Update order with Stripe session ID
    const { error: updateError } = await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    if (updateError) {
      console.error("Failed to update order with session ID:", updateError);
    }

    return new Response(JSON.stringify({ url: session.url, orderId: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// Helper function to rollback stock updates on failure
// deno-lint-ignore no-explicit-any
async function rollbackStockUpdates(
  supabase: any,
  stockUpdates: { productId: string; previousStock: number; newStock: number }[]
) {
  for (const update of stockUpdates) {
    try {
      await supabase
        .from("products")
        .update({ stock: update.previousStock })
        .eq("id", update.productId);
      logStep("Stock rollback successful", { productId: update.productId, restoredStock: update.previousStock });
    } catch (rollbackError) {
      logStep("ERROR: Stock rollback failed", { productId: update.productId, error: String(rollbackError) });
    }
  }
}
