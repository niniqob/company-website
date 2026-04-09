import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
  console.log(`[CREATE-COD-ORDER] ${step}${detailsStr}`);
};

const MAX_STRING_LENGTH = 255;
const MAX_NOTES_LENGTH = 1000;
const MAX_ITEMS = 50;
const COOLDOWN_MINUTES = 2;

interface CartItem {
  productId: string;
  quantity: number;
}

interface OrderRequest {
  customerName: string;
  customerPhone: string;
  shippingCountry: string;
  shippingCity: string;
  shippingStreet: string;
  shippingPostalCode: string;
  notes?: string;
  cartItems: CartItem[];
}

function validateString(value: unknown, fieldName: string, maxLength: number, required = true): string {
  if (value === null || value === undefined || value === "") {
    if (required) throw new Error(`VALIDATION_ERROR`);
    return "";
  }
  if (typeof value !== "string") throw new Error(`VALIDATION_ERROR`);
  const trimmed = value.trim();
  if (required && trimmed.length === 0) throw new Error(`VALIDATION_ERROR`);
  if (trimmed.length > maxLength) throw new Error(`VALIDATION_ERROR`);
  return trimmed;
}

function validatePhone(value: unknown): string {
  const phone = validateString(value, "customerPhone", MAX_STRING_LENGTH, true);
  // Allow digits, spaces, dashes, plus sign, and parentheses
  const phoneRegex = /^[\d\s\-+()]{5,}$/;
  if (!phoneRegex.test(phone)) throw new Error("VALIDATION_ERROR");
  return phone;
}

function validateCartItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) throw new Error("VALIDATION_ERROR");
  if (items.length === 0) throw new Error("CART_EMPTY");
  if (items.length > MAX_ITEMS) throw new Error("VALIDATION_ERROR");
  
  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`VALIDATION_ERROR`);
    }
    const { productId, quantity } = item as Record<string, unknown>;
    
    if (typeof productId !== "string" || productId.length === 0) {
      throw new Error(`VALIDATION_ERROR`);
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      throw new Error(`VALIDATION_ERROR`);
    }
    
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error(`VALIDATION_ERROR`);
    }
    
    return { productId, quantity };
  });
}

function validateRequest(body: unknown): OrderRequest {
  if (!body || typeof body !== "object") {
    throw new Error("VALIDATION_ERROR");
  }
  
  const data = body as Record<string, unknown>;
  
  return {
    customerName: validateString(data.customerName, "customerName", MAX_STRING_LENGTH, true),
    customerPhone: validatePhone(data.customerPhone),
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
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing Supabase configuration");
      throw new Error("SERVICE_ERROR");
    }

    const requestBody = await req.json();
    const validatedData = validateRequest(requestBody);
    logStep("Request validated", { 
      phone: validatedData.customerPhone, 
      itemCount: validatedData.cartItems.length 
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Check 2-minute cooldown per phone number
    const cooldownTime = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();
    const { data: recentOrders, error: cooldownError } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_phone", validatedData.customerPhone)
      .gte("created_at", cooldownTime)
      .limit(1);

    if (cooldownError) {
      logStep("Cooldown check error", { error: cooldownError.message });
    }

    if (recentOrders && recentOrders.length > 0) {
      logStep("Cooldown active for phone", { phone: validatedData.customerPhone });
      return new Response(JSON.stringify({ 
        error: "შეკვეთის გაკეთება შესაძლებელია ყოველ 2 წუთში ერთხელ.",
        code: "COOLDOWN"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Fetch product details for all cart items
    const productIds = validatedData.cartItems.map(item => item.productId);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, sku, price, stock")
      .in("id", productIds);

    if (productsError) {
      logStep("ERROR: Failed to fetch products", { error: productsError.message });
      throw new Error("SERVICE_ERROR");
    }

    if (!products || products.length !== productIds.length) {
      logStep("ERROR: Some products not found");
      throw new Error("PRODUCT_ERROR");
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // STOCK VALIDATION: Check if all products have sufficient stock BEFORE any updates
    for (const item of validatedData.cartItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        logStep("ERROR: Product not found in map", { productId: item.productId });
        throw new Error("PRODUCT_ERROR");
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
        throw new Error("SERVICE_ERROR");
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

    const orderItemsData = validatedData.cartItems.map(item => {
      const product = productMap.get(item.productId)!;
      return {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: item.quantity,
        price_at_order: product.price,
      };
    });

    const subtotal = orderItemsData.reduce(
      (sum, item) => sum + Number(item.price_at_order) * item.quantity,
      0
    );
    const shippingCost = subtotal >= 99 ? 0 : 9.99;
    const orderTotal = subtotal + shippingCost;

    logStep("Order calculated", { subtotal, shippingCost, orderTotal });

    // Create order - COD (Cash on Delivery) - no email required
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: validatedData.customerName,
        customer_email: null, // No email collected for COD orders
        customer_phone: validatedData.customerPhone,
        shipping_country: validatedData.shippingCountry,
        shipping_city: validatedData.shippingCity,
        shipping_street: validatedData.shippingStreet,
        shipping_postal_code: validatedData.shippingPostalCode,
        notes: validatedData.notes || null,
        total_amount: orderTotal,
        status: "pending",
        payment_status: "pending", // COD - payment pending until delivery
      })
      .select()
      .single();

    if (orderError || !order) {
      logStep("ERROR: Failed to create order", { error: orderError?.message });
      // Rollback stock updates
      await rollbackStockUpdates(supabase, stockUpdates);
      throw new Error("SERVICE_ERROR");
    }
    logStep("Order created", { orderId: order.id });

    const orderItemsToInsert = orderItemsData.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsToInsert);

    if (itemsError) {
      logStep("ERROR: Failed to create order items", { error: itemsError.message });
      // Rollback: delete order and restore stock
      await supabase.from("orders").delete().eq("id", order.id);
      await rollbackStockUpdates(supabase, stockUpdates);
      throw new Error("SERVICE_ERROR");
    }
    logStep("Order items created", { count: orderItemsToInsert.length });

    // Send owner notification email only (no customer email for COD)
    try {
      await supabase.functions.invoke("send-order-email", {
        body: {
          orderId: order.id,
          sendOwner: true,
          sendCustomer: false, // No email to send to customer
          statusEmailType: null,
        },
      });
      logStep("Owner email notification triggered");
    } catch (emailError) {
      logStep("Email notification failed (non-blocking)", { error: String(emailError) });
    }

    return new Response(JSON.stringify({ orderId: order.id, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Return generic error messages to clients
    let clientMessage = "შეკვეთის დამუშავება ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.";
    let statusCode = 400;
    
    if (errorMessage === "CART_EMPTY") {
      clientMessage = "კალათა ცარიელია.";
    } else if (errorMessage === "PRODUCT_ERROR") {
      clientMessage = "ერთ-ერთი პროდუქტი ვერ მოიძებნა.";
    } else if (errorMessage === "SERVICE_ERROR") {
      clientMessage = "სერვისის შეცდომა. გთხოვთ, სცადოთ მოგვიანებით.";
      statusCode = 500;
    }
    
    return new Response(JSON.stringify({ error: clientMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
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
