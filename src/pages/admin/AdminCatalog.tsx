import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Star, Upload, X, Cog } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CatalogItem {
  id: string;
  name: string;
  description?: string | null;
  is_top_brand?: boolean;
  image_url?: string | null;
}

interface VehicleModelItem {
  id: string;
  name: string;
  make_id: string;
  make_name?: string;
}

interface VehicleMake {
  id: string;
  name: string;
}

type CatalogType = "vehicle_makes" | "categories" | "brands" | "vehicle_models";

export default function AdminCatalog() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<CatalogType>("categories");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModelItem[]>([]);
  const [vehicleMakes, setVehicleMakes] = useState<VehicleMake[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [editModel, setEditModel] = useState<VehicleModelItem | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsTopBrand, setNewIsTopBrand] = useState(false);
  const [newMakeId, setNewMakeId] = useState("");
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingTop, setTogglingTop] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { key: CatalogType; labelKey: string }[] = [
    { key: "categories", labelKey: "admin.catalog.categories" },
    { key: "brands", labelKey: "admin.catalog.brands" },
    { key: "vehicle_makes", labelKey: "admin.catalog.vehicle_makes" },
    { key: "vehicle_models", labelKey: "admin.catalog.vehicle_models" },
  ];

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  // Fetch vehicle makes for the models dropdown
  useEffect(() => {
    async function fetchMakes() {
      const { data } = await supabase.from("vehicle_makes").select("id, name").order("name");
      setVehicleMakes(data || []);
    }
    fetchMakes();
  }, []);

  async function fetchItems() {
    setLoading(true);
    
    if (activeTab === "vehicle_models") {
      // Fetch models with their make names
      const { data: modelsData } = await supabase
        .from("vehicle_models")
        .select("id, name, make_id")
        .order("name");
      
      const { data: makesData } = await supabase
        .from("vehicle_makes")
        .select("id, name");
      
      const makesMap = new Map((makesData || []).map(m => [m.id, m.name]));
      
      const modelsWithMakeNames = (modelsData || []).map(model => ({
        ...model,
        make_name: makesMap.get(model.make_id) || "Unknown"
      }));
      
      setVehicleModels(modelsWithMakeNames);
      setItems([]);
    } else {
      const { data } = await supabase.from(activeTab).select("*").order("name");
      setItems(data || []);
      setVehicleModels([]);
    }
    
    setLoading(false);
  }

  async function handleSave() {
    if (!newName.trim()) {
      toast.error(t("admin.catalog.name_required"));
      return;
    }

    if (activeTab === "vehicle_models" && !newMakeId) {
      toast.error(t("admin.vehicle_models.make_required"));
      return;
    }

    setSaving(true);

    if (activeTab === "vehicle_models") {
      // Handle vehicle models separately
      const payload = { 
        name: newName.trim(),
        make_id: newMakeId
      };

      let error;
      if (editModel) {
        const res = await supabase.from("vehicle_models").update(payload).eq("id", editModel.id);
        error = res.error;
      } else {
        const res = await supabase.from("vehicle_models").insert(payload);
        error = res.error;
      }

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(editModel ? t("toast.item_updated") : t("toast.item_added"));
        closeDialog();
        fetchItems();
      }
    } else {
      // Handle other catalog types
      const payload: any = { name: newName.trim() };
      if (activeTab === "categories") {
        payload.description = newDescription.trim() || null;
        payload.image_url = newImageUrl || null;
      }
      if (activeTab === "brands") {
        payload.is_top_brand = newIsTopBrand;
      }

      let error;
      if (editItem) {
        const res = await supabase.from(activeTab).update(payload).eq("id", editItem.id);
        error = res.error;
      } else {
        const res = await supabase.from(activeTab).insert(payload);
        error = res.error;
      }

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(editItem ? t("toast.item_updated") : t("toast.item_added"));
        closeDialog();
        fetchItems();
      }
    }

    setSaving(false);
  }

  async function handleToggleTopBrand(item: CatalogItem) {
    if (activeTab !== "brands") return;
    setTogglingTop(item.id);
    
    const newValue = !item.is_top_brand;
    const { error } = await supabase
      .from("brands")
      .update({ is_top_brand: newValue })
      .eq("id", item.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("admin.brands.updated"));
      fetchItems();
    }
    setTogglingTop(null);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("admin.catalog.delete_confirm"))) return;
    
    const tableName = activeTab === "vehicle_models" ? "vehicle_models" : activeTab;
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("toast.item_deleted"));
      fetchItems();
    }
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditItem(null);
    setEditModel(null);
    setNewName("");
    setNewDescription("");
    setNewIsTopBrand(false);
    setNewMakeId("");
    setNewImageUrl(null);
  }

  function openEdit(item: CatalogItem) {
    setEditItem(item);
    setEditModel(null);
    setNewName(item.name);
    setNewDescription(item.description || "");
    setNewIsTopBrand(item.is_top_brand || false);
    setNewImageUrl(item.image_url || null);
    setNewMakeId("");
    setDialogOpen(true);
  }

  function openEditModel(model: VehicleModelItem) {
    setEditModel(model);
    setEditItem(null);
    setNewName(model.name);
    setNewMakeId(model.make_id);
    setNewDescription("");
    setNewIsTopBrand(false);
    setDialogOpen(true);
  }

  function openNew() {
    setEditItem(null);
    setEditModel(null);
    setNewName("");
    setNewDescription("");
    setNewIsTopBrand(false);
    setNewMakeId("");
    setNewImageUrl(null);
    setDialogOpen(true);
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("category-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("category-images")
        .getPublicUrl(filePath);

      setNewImageUrl(publicUrl);
      toast.success(t("toast.image_uploaded"));
    } catch (error: any) {
      toast.error(t("toast.upload_failed"));
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleRemoveImage() {
    setNewImageUrl(null);
  }

  const getTabLabel = (key: CatalogType) => {
    switch (key) {
      case "categories": return t("admin.catalog.categories");
      case "brands": return t("admin.catalog.brands");
      case "vehicle_makes": return t("admin.catalog.vehicle_makes");
      case "vehicle_models": return t("admin.catalog.vehicle_models");
      default: return key;
    }
  };

  const getDialogTitle = () => {
    if (activeTab === "vehicle_models") {
      return editModel ? t("admin.catalog.edit_dialog_title") : t("admin.catalog.add_dialog_title");
    }
    return editItem ? t("admin.catalog.edit_dialog_title") : t("admin.catalog.add_dialog_title");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">{t("admin.catalog.title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="btn-hero">
              <Plus className="w-4 h-4 mr-2" /> {t("admin.catalog.add_new")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {getDialogTitle()} {getTabLabel(activeTab)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {activeTab === "vehicle_models" && (
                <div>
                  <label className="block text-sm font-medium mb-2">{t("admin.vehicle_models.make")} *</label>
                  <select
                    value={newMakeId}
                    onChange={(e) => setNewMakeId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground"
                  >
                    <option value="">{t("admin.vehicle_models.select_make")}</option>
                    {vehicleMakes.map((make) => (
                      <option key={make.id} value={make.id}>{make.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {activeTab === "vehicle_models" ? t("admin.vehicle_models.model_name") : t("admin.catalog.name")} *
                </label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="input-dark" />
              </div>
              {activeTab === "categories" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("admin.catalog.description")}</label>
                    <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="input-dark" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t("admin.catalog.category_image")}</label>
                    {newImageUrl ? (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border mb-2">
                        <img 
                          src={newImageUrl} 
                          alt="Category preview" 
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t("admin.catalog.uploading")}
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              {t("admin.catalog.upload_image")}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
              {activeTab === "brands" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_top_brand"
                    checked={newIsTopBrand}
                    onCheckedChange={(checked) => setNewIsTopBrand(checked === true)}
                  />
                  <label
                    htmlFor="is_top_brand"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("admin.brands.top_brand_label")}
                  </label>
                </div>
              )}
              <Button onClick={handleSave} disabled={saving} className="w-full btn-hero">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {(editItem || editModel) ? t("common.update") : t("common.create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            onClick={() => setActiveTab(tab.key)}
          >
            {t(tab.labelKey)}
          </Button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : activeTab === "vehicle_models" ? (
        // Vehicle Models Table
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">{t("admin.vehicle_models.model_name")}</th>
                <th className="text-left p-4 font-medium">{t("admin.vehicle_models.make")}</th>
                <th className="text-right p-4 font-medium">{t("admin.catalog.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {vehicleModels.map((model) => (
                <tr key={model.id} className="border-t border-border">
                  <td className="p-4">{model.name}</td>
                  <td className="p-4 text-muted-foreground">{model.make_name}</td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditModel(model)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(model.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {vehicleModels.length === 0 && (
                <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">{t("admin.catalog.no_items")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        // Other catalog items table
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {activeTab === "categories" && <th className="text-left p-4 font-medium w-16">{t("admin.catalog.category_image")}</th>}
                <th className="text-left p-4 font-medium">{t("admin.catalog.name")}</th>
                {activeTab === "categories" && <th className="text-left p-4 font-medium">{t("admin.catalog.description")}</th>}
                {activeTab === "brands" && <th className="text-center p-4 font-medium">{t("admin.brands.top_brand_column")}</th>}
                <th className="text-right p-4 font-medium">{t("admin.catalog.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  {activeTab === "categories" && (
                    <td className="p-4">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Cog className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                  )}
                  <td className="p-4">{item.name}</td>
                  {activeTab === "categories" && <td className="p-4 text-muted-foreground">{item.description || "-"}</td>}
                  {activeTab === "brands" && (
                    <td className="p-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleTopBrand(item)}
                        disabled={togglingTop === item.id}
                        className={item.is_top_brand ? "text-primary" : "text-muted-foreground"}
                      >
                        {togglingTop === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Star className={`w-4 h-4 ${item.is_top_brand ? "fill-primary" : ""}`} />
                        )}
                      </Button>
                    </td>
                  )}
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">{t("admin.catalog.no_items")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
