import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CatalystCategory, CatalystItem } from "@/types";

export function useCatalystsData() {
  const [categories, setCategories] = useState<CatalystCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("catalyst_categories")
      .select("*")
      .order("name");
    
    if (data) {
      setCategories(data as CatalystCategory[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return { categories, loading, refetch: fetchCategories };
}

export function useCatalystsByCategory(categoryId: string | null) {
  const [items, setItems] = useState<CatalystItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchItems() {
      if (!categoryId) {
        setItems([]);
        return;
      }

      setLoading(true);
      const { data } = await supabase
        .from("catalysts")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");

      if (data) {
        setItems(data as CatalystItem[]);
      }
      setLoading(false);
    }

    fetchItems();
  }, [categoryId]);

  return { items, loading };
}

export interface CatalystItemWithCategory extends CatalystItem {
  category_name?: string;
}

export function useAllCatalysts() {
  const [items, setItems] = useState<CatalystItemWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("catalysts")
      .select("*, catalyst_categories(name)")
      .order("name");

    if (data) {
      const itemsWithCategory = data.map((item: Record<string, unknown>) => ({
        ...item,
        category_name: (item.catalyst_categories as { name: string } | null)?.name || undefined,
      })) as CatalystItemWithCategory[];
      setItems(itemsWithCategory);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return { items, loading, refetch: fetchItems };
}
