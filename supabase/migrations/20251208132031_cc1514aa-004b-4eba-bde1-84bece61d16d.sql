-- Create vehicle_makes table for admin-managed makes
CREATE TABLE public.vehicle_makes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table for admin-managed categories
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brands table for admin-managed brands
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vehicle_makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Public read access for storefront
CREATE POLICY "Vehicle makes are publicly viewable" 
ON public.vehicle_makes 
FOR SELECT 
USING (true);

CREATE POLICY "Categories are publicly viewable" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Brands are publicly viewable" 
ON public.brands 
FOR SELECT 
USING (true);

-- Admin write access
CREATE POLICY "Admins can insert vehicle makes" 
ON public.vehicle_makes 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update vehicle makes" 
ON public.vehicle_makes 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete vehicle makes" 
ON public.vehicle_makes 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories" 
ON public.categories 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories" 
ON public.categories 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert brands" 
ON public.brands 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update brands" 
ON public.brands 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete brands" 
ON public.brands 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_vehicle_makes_updated_at
BEFORE UPDATE ON public.vehicle_makes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing hardcoded data into the new tables
INSERT INTO public.vehicle_makes (name) VALUES
  ('Audi'), ('BMW'), ('Chevrolet'), ('Ford'), ('Honda'), ('Hyundai'), 
  ('Kia'), ('Mazda'), ('Mercedes-Benz'), ('Nissan'), ('Porsche'), 
  ('Subaru'), ('Tesla'), ('Toyota'), ('Volkswagen'), ('Volvo');

INSERT INTO public.categories (name, description) VALUES
  ('Brakes', 'Pads, rotors, calipers, and hardware for safe stopping.'),
  ('Suspension', 'Shocks, struts, springs, and control arms.'),
  ('Engine', 'Filters, sensors, belts, and performance upgrades.'),
  ('Lighting', 'Headlights, taillights, fog lights, and bulbs.'),
  ('Exhaust', 'Mufflers, pipes, and performance exhaust systems.'),
  ('Transmission', 'Clutches, gearboxes, and related parts.'),
  ('Electrical', 'Alternators, starters, batteries, and wiring.'),
  ('Body Parts', 'Bumpers, fenders, grilles, and mirrors.'),
  ('Interior', 'Seats, trim, knobs, and accessories.'),
  ('Wheels & Tires', 'Rims, tires, and wheel accessories.');

INSERT INTO public.brands (name) VALUES
  ('Bosch'), ('Brembo'), ('Hella'), ('Denso'), ('NGK'), 
  ('Bilstein'), ('Eibach'), ('Moog'), ('ACDelco'), ('Valeo');