import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { CatalystCategory, CatalystItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useAllCatalysts, useCatalystsData } from "@/hooks/useCatalystsData";

type TabValue = "categories" | "items";

type CategoryFormState = {
  name: string;
  description: string;
  image_url: string;
};

type ItemFormState = {
  name: string;
  code: string;
  description: string;
  image_url: string;
  category_id: string;
};

async function uploadPublicImage(file: File, folder: string) {
  const fileExt = file.name.split(".").pop() || "jpg";
  const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
  return urlData.publicUrl;
}

export default function AdminCatalysts() {
  const { t } = useLanguage();

  const [tab, setTab] = useState<TabValue>("categories");

  const {
    categories,
    loading: categoriesLoading,
    refetch: refetchCategories,
  } = useCatalystsData();

  const {
    items,
    loading: itemsLoading,
    refetch: refetchItems,
  } = useAllCatalysts();

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CatalystCategory | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryUploading, setCategoryUploading] = useState(false);
  const categoryFileRef = useRef<HTMLInputElement>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    name: "",
    description: "",
    image_url: "",
  });

  // Item dialog state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalystItem | null>(null);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemUploading, setItemUploading] = useState(false);
  const itemFileRef = useRef<HTMLInputElement>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>({
    name: "",
    code: "",
    description: "",
    image_url: "",
    category_id: "",
  });

  useEffect(() => {
    // Ensure forms start clean if user changes tabs while a dialog is open
    if (!categoryDialogOpen) {
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "", image_url: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryDialogOpen]);

  useEffect(() => {
    if (!itemDialogOpen) {
      setEditingItem(null);
      setItemForm({ name: "", code: "", description: "", image_url: "", category_id: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemDialogOpen]);

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", description: "", image_url: "" });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (c: CatalystCategory) => {
    setEditingCategory(c);
    setCategoryForm({
      name: c.name,
      description: c.description ?? "",
      image_url: c.image_url ?? "",
    });
    setCategoryDialogOpen(true);
  };

  const openAddItem = () => {
    setEditingItem(null);
    setItemForm({
      name: "",
      code: "",
      description: "",
      image_url: "",
      category_id: categories[0]?.id ?? "",
    });
    setItemDialogOpen(true);
  };

  const openEditItem = (it: CatalystItem) => {
    setEditingItem(it);
    setItemForm({
      name: it.name,
      code: it.code,
      description: it.description ?? "",
      image_url: it.image_url ?? "",
      category_id: it.category_id,
    });
    setItemDialogOpen(true);
  };

  const handleCategoryUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("toast.error"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("toast.error"));
      return;
    }

    setCategoryUploading(true);
    try {
      const url = await uploadPublicImage(file, "catalyst-categories");
      setCategoryForm((p) => ({ ...p, image_url: url }));
      toast.success(t("toast.image_uploaded"));
    } catch (e: any) {
      console.error("Category image upload error:", e);
      toast.error(t("toast.upload_failed"));
    } finally {
      setCategoryUploading(false);
      if (categoryFileRef.current) categoryFileRef.current.value = "";
    }
  };

  const handleItemUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("toast.error"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("toast.error"));
      return;
    }

    setItemUploading(true);
    try {
      const url = await uploadPublicImage(file, "catalysts");
      setItemForm((p) => ({ ...p, image_url: url }));
      toast.success(t("toast.image_uploaded"));
    } catch (e: any) {
      console.error("Item image upload error:", e);
      toast.error(t("toast.upload_failed"));
    } finally {
      setItemUploading(false);
      if (itemFileRef.current) itemFileRef.current.value = "";
    }
  };

  const saveCategory = async () => {
    const name = categoryForm.name.trim();
    const description = categoryForm.description.trim();

    if (!name) {
      toast.error(t("toast.error"));
      return;
    }

    // Description is required in UI
    if (!description) {
      toast.error(t("toast.error"));
      return;
    }

    setCategorySubmitting(true);
    const payload = {
      name,
      description,
      image_url: categoryForm.image_url.trim() ? categoryForm.image_url.trim() : null,
    };

    const { error } = editingCategory
      ? await supabase.from("catalyst_categories").update(payload).eq("id", editingCategory.id)
      : await supabase.from("catalyst_categories").insert(payload);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingCategory ? t("toast.item_updated") : t("toast.item_added"));
      setCategoryDialogOpen(false);
      await refetchCategories();
    }

    setCategorySubmitting(false);
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm(t("common.confirm"))) return;

    // Block deletion if catalysts exist in this category
    const { count, error: countError } = await supabase
      .from("catalysts")
      .select("id", { count: "exact", head: true })
      .eq("category_id", categoryId);

    if (countError) {
      toast.error(countError.message);
      return;
    }

    if ((count ?? 0) > 0) {
      toast.error(t("admin.catalysts.delete_blocked"));
      return;
    }

    const { error } = await supabase.from("catalyst_categories").delete().eq("id", categoryId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("toast.item_deleted"));
      await refetchCategories();
    }
  };

  const saveItem = async () => {
    const name = itemForm.name.trim();
    const code = itemForm.code.trim();
    const description = itemForm.description.trim();
    const category_id = itemForm.category_id;

    if (!name || !code || !category_id) {
      toast.error(t("toast.error"));
      return;
    }

    // Description is required in UI
    if (!description) {
      toast.error(t("toast.error"));
      return;
    }

    setItemSubmitting(true);

    const payload = {
      name,
      code,
      description,
      image_url: itemForm.image_url.trim() ? itemForm.image_url.trim() : null,
      category_id,
    };

    const { error } = editingItem
      ? await supabase.from("catalysts").update(payload).eq("id", editingItem.id)
      : await supabase.from("catalysts").insert(payload);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingItem ? t("toast.item_updated") : t("toast.item_added"));
      setItemDialogOpen(false);
      await refetchItems();
    }

    setItemSubmitting(false);
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm(t("common.confirm"))) return;

    const { error } = await supabase.from("catalysts").delete().eq("id", itemId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("toast.item_deleted"));
      await refetchItems();
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("admin.catalysts.title")}</h1>
        </div>

        {tab === "categories" ? (
          <Button type="button" className="btn-hero" onClick={openAddCategory}>
            <Plus className="w-4 h-4 mr-2" />
            {t("admin.catalysts.add_category")}
          </Button>
        ) : (
          <Button type="button" className="btn-hero" onClick={openAddItem} disabled={categories.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            {t("admin.catalysts.add_item")}
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="categories">{t("admin.catalysts.categories_tab")}</TabsTrigger>
          <TabsTrigger value="items">{t("admin.catalysts.items_tab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">{t("admin.catalysts.name")}</th>
                    <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">{t("admin.catalysts.description")}</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">{t("admin.catalysts.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {categoriesLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-4 py-4" colSpan={3}>
                          <div className="h-10 bg-muted rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : categories.length === 0 ? (
                    <tr>
                      <td className="px-4 py-12 text-center text-muted-foreground" colSpan={3}>
                        {t("catalysts.empty_categories")}
                      </td>
                    </tr>
                  ) : (
                    categories.map((c) => (
                      <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                              {c.image_url ? (
                                <img
                                  src={c.image_url}
                                  alt={`${c.name} ${t("admin.catalysts.photo")}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{c.name}</p>
                              <p className="text-sm text-muted-foreground truncate md:hidden">
                                {c.description ?? ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground hidden md:table-cell">
                          {c.description}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditCategory(c)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCategory(c.id)}
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
        </TabsContent>

        <TabsContent value="items" className="mt-6">
          {categories.length === 0 && !categoriesLoading ? (
            <div className="bg-card rounded-lg border border-border p-6 text-muted-foreground">
              {t("catalysts.empty_categories")}
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium">{t("admin.catalysts.name")}</th>
                      <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">{t("admin.catalysts.code")}</th>
                      <th className="text-left px-4 py-3 text-sm font-medium hidden lg:table-cell">{t("admin.catalysts.category")}</th>
                      <th className="text-right px-4 py-3 text-sm font-medium">{t("admin.catalysts.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          <td className="px-4 py-4" colSpan={4}>
                            <div className="h-10 bg-muted rounded animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : items.length === 0 ? (
                      <tr>
                        <td className="px-4 py-12 text-center text-muted-foreground" colSpan={4}>
                          {t("catalysts.empty_products")}
                        </td>
                      </tr>
                    ) : (
                      items.map((it) => (
                        <tr key={it.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                                {it.image_url ? (
                                  <img
                                    src={it.image_url}
                                    alt={`${it.name} ${t("admin.catalysts.photo")}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{it.name}</p>
                                <p className="text-sm text-muted-foreground truncate md:hidden">{it.code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground hidden md:table-cell">{it.code}</td>
                          <td className="px-4 py-4 text-sm hidden lg:table-cell">
                            {categoryNameById.get(it.category_id) ?? ""}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditItem(it)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteItem(it.id)}
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
          )}
        </TabsContent>
      </Tabs>

      {/* Category dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? `${t("common.edit")} — ${t("admin.catalysts.categories_tab")}`
                : t("admin.catalysts.add_category")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.catalysts.name")} *</label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.catalysts.description")} *</label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                className="input-dark resize-none"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.catalysts.photo")}</label>

              {categoryForm.image_url ? (
                <div className="relative w-full max-w-xs">
                  <img
                    src={categoryForm.image_url}
                    alt={t("admin.catalysts.photo")}
                    className="w-full h-40 object-cover rounded-lg border border-border"
                    loading="lazy"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => setCategoryForm((p) => ({ ...p, image_url: "" }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full max-w-xs h-32 border-2 border-dashed border-border rounded-lg bg-muted/20">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t("admin.product_form.no_image")}</p>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-4">
                <input
                  ref={categoryFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCategoryUpload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => categoryFileRef.current?.click()}
                  disabled={categoryUploading}
                  className="flex items-center gap-2"
                >
                  {categoryUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("admin.product_form.uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {t("admin.product_form.upload")}
                    </>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">{t("admin.product_form.or_url")}</span>
              </div>

              <div className="mt-3">
                <Input
                  value={categoryForm.image_url}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, image_url: e.target.value }))}
                  className="input-dark"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" className="btn-hero" onClick={saveCategory} disabled={categorySubmitting}>
              {categorySubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? `${t("common.edit")} — ${t("admin.catalysts.items_tab")}`
                : t("admin.catalysts.add_item")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.catalysts.name")} *</label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.catalysts.code")} *</label>
              <Input
                value={itemForm.code}
                onChange={(e) => setItemForm((p) => ({ ...p, code: e.target.value }))}
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.catalysts.category")} *</label>
              <select
                value={itemForm.category_id}
                onChange={(e) => setItemForm((p) => ({ ...p, category_id: e.target.value }))}
                className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground"
              >
                <option value="" disabled>
                  {t("admin.product_form.select_category")}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.catalysts.description")} *</label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                className="input-dark resize-none"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.catalysts.photo")}</label>

              {itemForm.image_url ? (
                <div className="relative w-full max-w-xs">
                  <img
                    src={itemForm.image_url}
                    alt={t("admin.catalysts.photo")}
                    className="w-full h-40 object-cover rounded-lg border border-border"
                    loading="lazy"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => setItemForm((p) => ({ ...p, image_url: "" }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full max-w-xs h-32 border-2 border-dashed border-border rounded-lg bg-muted/20">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t("admin.product_form.no_image")}</p>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-4">
                <input
                  ref={itemFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleItemUpload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => itemFileRef.current?.click()}
                  disabled={itemUploading}
                  className="flex items-center gap-2"
                >
                  {itemUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("admin.product_form.uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {t("admin.product_form.upload")}
                    </>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">{t("admin.product_form.or_url")}</span>
              </div>

              <div className="mt-3">
                <Input
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm((p) => ({ ...p, image_url: e.target.value }))}
                  className="input-dark"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" className="btn-hero" onClick={saveItem} disabled={itemSubmitting}>
              {itemSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

