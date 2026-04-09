-- Remove public INSERT policies from orders and order_items tables
-- Orders and order items are now created server-side via the stripe-checkout edge function

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;