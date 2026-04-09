# Admin Setup Guide

This document explains how to set up the first admin user and configure backend features for your AutoParts store.

## Overview

- **Customers** browse and order without any registration (guest checkout only).
- **Admins** access the admin panel at `/admin` to manage products and orders.

---

## Step 1: Enable Auto-Confirm for Email (Recommended)

To avoid email confirmation friction during admin signup:

1. Open the **Backend** panel (Lovable Cloud dashboard)
2. Go to **Users** → **Settings** 
3. Find the **Email** authentication settings
4. Enable **Auto-confirm users** or disable **Email confirmations**

This ensures when you create an admin user, their email is immediately confirmed.

---

## Step 2: Create an Admin User

Create a user account with email and password:

**Option A: Via Backend Dashboard**
1. Open the Backend panel
2. Go to **Users** → **Add User**
3. Enter an email and password for the admin

---

## Step 3: Assign the Admin Role

After creating the user, you need to grant them admin privileges:

1. Open the Backend panel
2. Go to **Database** → **Tables** → **user_roles**
3. Click **Insert Row** and add:
   - `user_id`: The UUID of the admin user (find in Users table)
   - `role`: `admin`

**Or via SQL:**

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('<ADMIN_USER_UUID>', 'admin');
```

Replace `<ADMIN_USER_UUID>` with the actual user ID from the `auth.users` table.

---

## Admin User Setup (Production)

### Primary Admin Account

| Email | Password |
|-------|----------|
| `autocenter@gmail.com` | `Centerauto67` |

### Step-by-Step Setup Instructions

#### 1. Create the Admin User in Supabase

1. Open the **Backend** panel (Lovable Cloud dashboard)
2. Navigate to **Users** → **Add User**
3. Enter:
   - **Email**: `autocenter@gmail.com`
   - **Password**: `Centerauto67`
4. **Enable "Auto Confirm"** or check the "Confirm user" option
5. Click **Save** / **Create User**

**If the user already exists:**
1. Find the user in the Users list
2. If not confirmed, click to confirm the email
3. To reset password: delete the user and recreate with the steps above

#### 2. Grant Admin Role (SQL)

After creating the user, run this SQL in the Backend → SQL Editor (or use the table UI):

```sql
-- Find user ID and insert admin role (safe, idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'autocenter@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

To verify the role was added:
```sql
SELECT u.email, ur.role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'autocenter@gmail.com';
```

#### 3. Test Login

1. Go to `/admin/login`
2. Enter `autocenter@gmail.com` and `Centerauto67`
3. You should be redirected to `/admin`

---

## Admin User Setup (Development)

For development and testing, additional admin users can be created:

### Test Admin Accounts

| Email | Password |
|-------|----------|
| `kipagiorgi411@gmail.com` | `qobela123` |
| `23202185@ibsu.edu.ge` | `qobela123` |

### Setup Steps

1. Go to Backend Dashboard → **Users** → **Add User**
2. Create both users with the emails and passwords above
3. Run the following SQL to grant them admin roles:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email IN ('kipagiorgi411@gmail.com', '23202185@ibsu.edu.ge')
ON CONFLICT (user_id, role) DO NOTHING;
```

**Note:** Never use these credentials in production. Always use strong, unique passwords for production admin accounts.

---

## Step 4: Log In

1. Navigate to `/admin/login`
2. Enter the admin email and password
3. You'll be redirected to the admin dashboard

---

## Product Images (Storage)

Product images are stored in Supabase Storage using the `product-images` bucket.

### How It Works

1. The `product-images` bucket is automatically created with public read access
2. Admins can upload images directly from the product form
3. Images are stored with unique filenames to prevent conflicts
4. Public URLs are automatically generated and saved to the product

### Uploading Images

In the admin product form (`/admin/products/new` or `/admin/products/:id/edit`):

1. Click **Upload Image** to select a file from your computer
2. The image is uploaded to storage and the URL is set automatically
3. You can also manually enter an image URL if preferred
4. A preview is shown for the current image

### Image Requirements

- Maximum file size: 5MB
- Supported formats: JPG, PNG, GIF, WebP
- Images are publicly accessible (required for storefront display)

---

## Inventory & Low Stock

The store tracks product inventory automatically.

### Inventory Fields

Each product has:

| Field | Description | Default |
|-------|-------------|---------|
| `stock` | Current quantity in stock | 0 |
| `low_stock_threshold` | Alert when stock falls at or below this level | 5 |

### Automatic Stock Reduction

When an order is paid via Stripe:

1. Stripe sends a webhook for `checkout.session.completed`
2. The webhook updates the order to `payment_status: 'paid'`
3. Stock is automatically decremented for each product in the order
4. Stock never goes below 0 (clamped using `GREATEST(stock - quantity, 0)`)

### Admin Products Page

The Admin Products list (`/admin/products`) shows:

- Current stock quantity for each product
- **"Out of stock"** badge (red) when `stock = 0`
- **"Low stock"** badge (yellow) when `stock <= low_stock_threshold`

### Managing Stock

In the product form (`/admin/products/new` or `/admin/products/:id/edit`):

1. Set **Stock Quantity** to the number of units available
2. Set **Low Stock Threshold** to receive alerts when stock gets low
3. Both fields validate for non-negative values

### Low Stock Email Notifications

When stock falls at or below the threshold after an order:

- An email is sent to `ORDER_NOTIFICATION_EMAIL`
- Subject: "[AutoParts] Low Stock Alert - X product(s) need attention"
- Includes: Product name, SKU, remaining stock, threshold
- One email per order (lists all affected products)

Email sending is non-blocking and does not affect order processing.

### Idempotency

The webhook includes protection against duplicate processing:
- If an order is already `payment_status: 'paid'`, stock is not decremented again
- This prevents issues from Stripe webhook retries

---

## Email Notifications

The store sends transactional emails using [Resend](https://resend.com). There are four types of emails:

### Email Types

| Email Type | Recipient | When Sent |
|------------|-----------|-----------|
| **Order Confirmation** | Customer | After successful Stripe payment |
| **Owner Notification** | Store Owner | After successful Stripe payment |
| **Status Update** | Customer | When admin changes status to "shipped" or "completed" |
| **Low Stock Alert** | Store Owner | After stock update when products are low |

### Configuration

Set these secrets in the Backend panel:

| Secret Name | Description |
|-------------|-------------|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
| `ORDER_NOTIFICATION_EMAIL` | Email address to receive order notifications (also used as sender) |

### Setting Up Resend

1. Sign up at [resend.com](https://resend.com)
2. Create an API key at [resend.com/api-keys](https://resend.com/api-keys)
3. For production, verify your domain at [resend.com/domains](https://resend.com/domains)
4. Add the API key as a secret in the Backend panel

### Customer Confirmation Email

Sent to the customer after successful payment. Includes:

- Order ID (shortened) and order date
- Customer name, email, phone
- Shipping address
- Payment method (Card/Stripe or Cash on Delivery)
- List of items with quantities and prices
- Subtotal, shipping, and total
- "What's Next?" message with processing time estimate

### Owner Notification Email

Sent to `ORDER_NOTIFICATION_EMAIL` when a new order is placed. Includes:

- Full order details
- Customer contact information
- Shipping address
- Payment method and status
- All items with SKUs and prices
- Order total

### Status Update Emails

Sent to customers when admins change the order status:

| Status | Email Subject |
|--------|---------------|
| `shipped` | "Your AutoParts order #XXXXXXXX has been shipped" |
| `completed` | "Your AutoParts order #XXXXXXXX is completed" |

These emails include:
- Brief status message
- Order ID and summary
- Shipping address
- **Tracking information** (for shipped emails, if tracking number is provided)
  - Tracking number
  - Carrier name
  - "Track Your Package" button linking to the tracking URL

### Resend Emails from Admin

From the Admin Orders page (`/admin/orders`):

1. Click on an order to expand its details
2. Click the **"Resend Confirmation Email"** button
3. Both owner and customer will receive confirmation emails
4. A toast notification confirms success or shows errors

### Email Troubleshooting

- **Emails not sending**: Check that `RESEND_API_KEY` and `ORDER_NOTIFICATION_EMAIL` secrets are set correctly
- **Check logs**: View edge function logs for `send-order-email` in the Backend panel
- **Domain not verified**: For production, verify your domain at [resend.com/domains](https://resend.com/domains)
- **Non-blocking**: Email failures do not prevent orders from completing. Checkout and payment work even if emails fail.

---

## Order Tracking Numbers

Admins can add and manage tracking information for orders directly from the Admin Orders page.

### Tracking Fields

| Field | Description |
|-------|-------------|
| `tracking_number` | The shipment tracking number |
| `tracking_carrier` | Carrier name (e.g., UPS, FedEx, DHL, USPS, Local Courier) |
| `tracking_url` | Full URL where the customer can track their shipment |
| `shipped_at` | Timestamp when the order was marked as shipped |

### Adding Tracking Info

1. Go to `/admin/orders`
2. Click on an order to expand its details
3. Click the **"shipped"** status button
4. A dialog will appear prompting for tracking information:
   - **Tracking Number** (required for shipped status)
   - **Carrier** (optional but recommended)
   - **Tracking URL** (optional - full URL for tracking)
5. Click **"Ship Order"** to update the status and save tracking info

The `shipped_at` timestamp is automatically set when the order is marked as shipped.

### Editing Tracking Info

1. Expand an order that has been shipped
2. In the "Tracking Info" section, click the **edit button** (pencil icon)
3. Update the tracking number, carrier, or URL
4. Click **"Save Changes"**

### Tracking in Emails

When an order is marked as shipped and has tracking information:
- The shipped email includes the tracking number and carrier
- If a tracking URL is provided, a "Track Your Package" button is included
- Customers can click directly to track their shipment

---

## Payments (Stripe)

The store uses Stripe for secure payment processing. When customers complete checkout, they are redirected to Stripe's hosted checkout page.

### Configuration

Set these environment variables (secrets) in the Backend:

| Secret Name | Description |
|-------------|-------------|
| `STRIPE_SECRET_KEY` | Private API key from Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret from Stripe |

### Setting Up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
3. Add `STRIPE_SECRET_KEY` to your Backend secrets

### Configuring Webhooks

1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set the endpoint URL to:
   ```
   https://idomxajidxdpidecxktg.supabase.co/functions/v1/stripe-webhook
   ```
4. Select event: `checkout.session.completed`
5. Copy the **Signing secret** and add it as `STRIPE_WEBHOOK_SECRET` in Backend secrets

### Payment Flow

1. Customer fills checkout form with shipping details
2. Order is created in database with `payment_status: 'pending'`
3. Customer is redirected to Stripe Checkout
4. After successful payment:
   - Stripe sends webhook to `stripe-webhook` function
   - Order updated to `status: 'confirmed'` and `payment_status: 'paid'`
   - **Stock is decremented for all order items**
   - **Low stock alerts sent if applicable**
   - **Confirmation emails sent to both owner and customer**
5. Customer redirected to success page

### Order Status

| Status | Description |
|--------|-------------|
| `pending` | Order created, awaiting payment |
| `confirmed` | Payment successful (set by webhook) |
| `shipped` | Admin marked as shipped (sends status email) |
| `completed` | Order delivered (sends status email) |
| `canceled` | Order canceled |

### Payment Status

| Status | Description |
|--------|-------------|
| `pending` | Awaiting payment |
| `paid` | Payment confirmed by Stripe |
| `failed` | Payment failed |

### Testing Payments

Use Stripe test mode with card number `4242 4242 4242 4242` and any future expiry date.

### Troubleshooting

- Check edge function logs for `stripe-checkout` and `stripe-webhook`
- Verify webhook secret is correct
- Ensure the webhook endpoint is accessible
- Use Stripe Dashboard → Developers → Events to see webhook attempts

---

## Customer Order Lookup

Customers can check their order status without logging in using the Order Lookup page.

### How It Works

- **URL**: `/order-lookup`
- Customers enter:
  - **Order ID**: The short order ID from their confirmation email (e.g., `#ABC12345`)
  - **Email**: The email address used when placing the order
- If both match, they see their order details

### What Customers Can See

- Order status (pending, confirmed, shipped, completed, canceled)
- Payment status and method
- Order items with quantities and prices
- Order total
- Shipping address
- Tracking information (if available):
  - Tracking number
  - Carrier
  - "Track Your Shipment" link

### Security

- Orders can only be looked up with **both** a matching email AND order ID
- Customers cannot see orders belonging to other email addresses
- The page is read-only; only admins can modify orders

### Links to Order Lookup

- From the **Checkout Success** page after payment
- From the **Footer** under "Support" → "Track Your Order"

---

## URLs Reference

| Page | URL |
|------|-----|
| Storefront Home | `/` |
| Shop | `/shop` |
| Product Details | `/product/:id` |
| Cart | `/cart` |
| Checkout | `/checkout` |
| Checkout Success | `/checkout/success` |
| Checkout Cancel | `/checkout/cancel` |
| Contact | `/contact` |
| **Order Lookup** | `/order-lookup` |
| Admin Login | `/admin/login` |
| Admin Dashboard | `/admin` |
| Admin Products | `/admin/products` |
| Add Product | `/admin/products/new` |
| Edit Product | `/admin/products/:id/edit` |
| Admin Orders | `/admin/orders` |

---

## Database Structure

### user_roles Table

```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL, -- 'admin' or 'user'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### products Table (Inventory Columns)

```sql
-- Inventory-related columns in products table
stock INTEGER NOT NULL DEFAULT 0,              -- Current quantity in stock
low_stock_threshold INTEGER NOT NULL DEFAULT 5 -- Alert threshold
```

### orders Table (Payment & Tracking Columns)

```sql
-- Payment-related columns in orders table
stripe_session_id TEXT,        -- Stripe Checkout session ID
stripe_payment_intent TEXT,    -- Stripe PaymentIntent ID
payment_status TEXT DEFAULT 'pending'  -- 'pending', 'paid', 'failed'

-- Tracking-related columns
tracking_number TEXT,          -- Shipment tracking number
tracking_carrier TEXT,         -- Carrier name (UPS, FedEx, etc.)
tracking_url TEXT,             -- Full tracking URL
shipped_at TIMESTAMPTZ         -- When order was marked as shipped
```

### has_role Function (RPC)

The `has_role` function checks if a user has a specific role:

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

This function is used by RLS policies to protect admin-only operations.

---

## Security Notes

- Only users with the `admin` role in `user_roles` can access admin features
- Products can be viewed by anyone but modified only by admins
- Orders can be created by anyone (guest checkout) but viewed/updated only by admins
- Product images can be uploaded only by admins
- The `has_role` function uses `SECURITY DEFINER` to bypass RLS when checking roles
- Stripe webhook validates signatures using `STRIPE_WEBHOOK_SECRET`
- Payment processing happens on Stripe's secure servers
- Email failures are non-blocking and do not affect checkout or order processing
- Stock updates are idempotent (duplicate webhooks don't decrement stock twice)
