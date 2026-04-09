import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchQuery } from "@/lib/sanitizeSearch";
import { useLanguage } from "@/contexts/LanguageContext";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Search, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AdminProducts() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchProducts() {
    setLoading(true);
    let query = supabase.from("products").select("*").order("created_at", { ascending: false });
    
    if (search) {
      const sanitized = sanitizeSearchQuery(search);
      query = query.or(`name.ilike.%${sanitized}%,sku.ilike.%${sanitized}%`);
    }
    
    const { data } = await query;
    if (data) {
      setProducts(data as Product[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.products.delete_confirm"))) return;
    
    setDeletingId(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    
    if (error) {
      toast.error(t("toast.failed_delete"));
    } else {
      toast.success(t("toast.product_deleted"));
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    setDeletingId(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold">{t("admin.products.title")}</h1>
        <Link to="/admin/products/new">
          <Button className="btn-hero">
            <Plus className="w-4 h-4 mr-2" />
            {t("admin.products.add")}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("admin.products.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 input-dark"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">{t("admin.products.table.product")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">{t("admin.products.table.sku")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium hidden lg:table-cell">{t("admin.products.table.category")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium">{t("admin.products.table.price")}</th>
                <th className="text-left px-4 py-3 text-sm font-medium hidden sm:table-cell">{t("admin.products.table.stock")}</th>
                <th className="text-right px-4 py-3 text-sm font-medium">{t("admin.products.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-4" colSpan={6}>
                      <div className="h-10 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t("admin.products.no_products")}</p>
                    <Link to="/admin/products/new" className="text-primary hover:underline">
                      {t("admin.products.add_first")}
                    </Link>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground hidden md:table-cell">
                      {product.sku}
                    </td>
                    <td className="px-4 py-4 text-sm hidden lg:table-cell">{product.category}</td>
                    <td className="px-4 py-4 font-medium">${product.price.toFixed(2)}</td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${product.stock <= 0 ? "text-destructive" : product.stock <= (product.low_stock_threshold ?? 5) ? "text-yellow-500" : "text-green-500"}`}>
                          {product.stock}
                        </span>
                        {product.stock <= 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {t("admin.stock.out_of_stock")}
                          </Badge>
                        ) : product.stock <= (product.low_stock_threshold ?? 5) ? (
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {t("admin.stock.low_stock")}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/products/${product.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                          disabled={deletingId === product.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
