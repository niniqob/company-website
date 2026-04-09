import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VehicleMake {
  id: string;
  name: string;
}

export interface VehicleModel {
  id: string;
  make_id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

export interface Brand {
  id: string;
  name: string;
  is_top_brand: boolean;
}

export interface ProductVehicleCompatibility {
  id: string;
  product_id: string;
  make_id: string;
  model_id: string | null;
}

export function useCatalogData() {
  const [vehicleMakes, setVehicleMakes] = useState<VehicleMake[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCatalogData() {
      setLoading(true);
      
      const [makesRes, modelsRes, categoriesRes, brandsRes] = await Promise.all([
        supabase.from("vehicle_makes").select("id, name").order("name"),
        supabase.from("vehicle_models").select("id, make_id, name").order("name"),
        supabase.from("categories").select("id, name, description, image_url").order("name"),
        supabase.from("brands").select("id, name, is_top_brand").order("name"),
      ]);

      if (makesRes.data) setVehicleMakes(makesRes.data);
      if (modelsRes.data) setVehicleModels(modelsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
      
      setLoading(false);
    }

    fetchCatalogData();
  }, []);

  return { vehicleMakes, vehicleModels, categories, brands, loading };
}
