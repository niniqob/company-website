export interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  description: string | null;
  price: number;
  stock: number;
  low_stock_threshold: number | null;
  image_url: string | null;
  car_make: string | null;
  car_model: string | null;
  car_year_from: number | null;
  car_year_to: number | null;
  is_featured: boolean;
  search_keywords: string | null;
  product_type: 'part' | 'catalyst';
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_country: string;
  shipping_city: string;
  shipping_street: string;
  shipping_postal_code: string;
  notes: string | null;
  total_amount: number;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  payment_status: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string;
  quantity: number;
  price_at_order: number;
  created_at: string;
}

export interface CarCompatibility {
  year: number | null;
  make: string | null;
  model: string | null;
}

export const CAR_MAKES = [
  "Audi",
  "BMW",
  "Chevrolet",
  "Ford",
  "Honda",
  "Hyundai",
  "Kia",
  "Mazda",
  "Mercedes-Benz",
  "Nissan",
  "Porsche",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
];

export const CAR_MODELS: Record<string, string[]> = {
  Audi: ["A3", "A4", "A6", "Q3", "Q5", "Q7", "TT"],
  BMW: ["3 Series", "5 Series", "X1", "X3", "X5", "M3", "M5"],
  Chevrolet: ["Camaro", "Corvette", "Cruze", "Equinox", "Malibu", "Silverado"],
  Ford: ["F-150", "Mustang", "Explorer", "Focus", "Escape", "Bronco"],
  Honda: ["Civic", "Accord", "CR-V", "Pilot", "Fit", "HR-V"],
  Hyundai: ["Elantra", "Sonata", "Tucson", "Santa Fe", "Kona"],
  Kia: ["Forte", "Optima", "Sportage", "Sorento", "Soul"],
  Mazda: ["Mazda3", "Mazda6", "CX-5", "CX-9", "MX-5 Miata"],
  "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE"],
  Nissan: ["Altima", "Maxima", "Sentra", "Rogue", "Pathfinder", "370Z"],
  Porsche: ["911", "Cayenne", "Macan", "Panamera", "Taycan"],
  Subaru: ["Impreza", "Legacy", "Outback", "Forester", "Crosstrek", "WRX"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y"],
  Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Supra"],
  Volkswagen: ["Golf", "Jetta", "Passat", "Tiguan", "Atlas", "GTI"],
  Volvo: ["S60", "S90", "XC40", "XC60", "XC90"],
};

export const CATEGORIES = [
  { key: "Brakes", name: "Brakes", description: "Pads, rotors, calipers, and hardware for safe stopping." },
  { key: "Suspension", name: "Suspension", description: "Shocks, struts, springs, and control arms." },
  { key: "Engine", name: "Engine", description: "Filters, sensors, belts, and performance upgrades." },
  { key: "Lighting", name: "Lighting", description: "Headlights, taillights, fog lights, and bulbs." },
  { key: "Exhaust", name: "Exhaust", description: "Mufflers, pipes, and performance exhaust systems." },
  { key: "Transmission", name: "Transmission", description: "Clutches, gearboxes, and related parts." },
  { key: "Electrical", name: "Electrical", description: "Alternators, starters, batteries, and wiring." },
  { key: "Body Parts", name: "Body Parts", description: "Bumpers, fenders, grilles, and mirrors." },
  { key: "Interior", name: "Interior", description: "Seats, trim, knobs, and accessories." },
  { key: "Wheels & Tires", name: "Wheels & Tires", description: "Rims, tires, and wheel accessories." },
];

export type Category = typeof CATEGORIES[number];

export const BRANDS = [
  "Bosch",
  "Brembo",
  "Hella",
  "Denso",
  "NGK",
  "Bilstein",
  "Eibach",
  "Moog",
  "ACDelco",
  "Valeo",
];

export interface BrandWithTopFlag {
  id: string;
  name: string;
  is_top_brand: boolean;
}

export interface CatalystCategory {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export interface CatalystItem {
  id: string;
  category_id: string;
  name: string;
  code: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}
