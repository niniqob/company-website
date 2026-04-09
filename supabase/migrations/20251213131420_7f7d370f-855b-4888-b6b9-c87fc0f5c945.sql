-- Make customer_email nullable for phone-only checkout
ALTER TABLE public.orders ALTER COLUMN customer_email DROP NOT NULL;