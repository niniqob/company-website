import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCatalogData } from "@/hooks/useCatalogData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, X, Image as ImageIcon, Trash2 } from "lucide-react";
import { getDraft, setDraft, clearDraft, getDraftKey } from "@/lib/formDrafts";

interface VehicleCompatibilitySelection {
  makeId: string;
  makeName: string;
  modelId: string | null;
  modelName: string | null;
}

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(200),
  sku: z.string().min(2, "OEM Code is required").max(50),
  brand: z.string().min(1, "Brand is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  search_keywords: z.string().max(500).optional(),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  low_stock_threshold: z.coerce.number().int().min(0, "Threshold cannot be negative"),
  image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  car_year_from: z.coerce.number().int().optional().or(z.literal("")),
  car_year_to: z.coerce.number().int().optional().or(z.literal("")),
  is_featured: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface DraftData {
  formData: Partial<ProductFormData>;
  compatibilities: VehicleCompatibilitySelection[];
}

const DRAFT_KEY_PREFIX = "admin_product_draft";

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dbDataLoaded, setDbDataLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Vehicle compatibility state
  const [compatibilities, setCompatibilities] = useState<VehicleCompatibilitySelection[]>([]);
  const [selectedMakeId, setSelectedMakeId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");

  // Load catalog data from database
  const { categories, brands, vehicleMakes, vehicleModels, loading: catalogLoading } = useCatalogData();

  const draftKey = getDraftKey(DRAFT_KEY_PREFIX, id);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      stock: 0,
      low_stock_threshold: 5,
      price: 0,
      is_featured: false,
    },
  });

  // Watch all form values for draft saving
  const watchedValues = watch();

  const watchedImageUrl = watch("image_url");

  // Debounced draft save function
  const saveDraft = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      const draftData: DraftData = {
        formData: watchedValues,
        compatibilities,
      };
      setDraft(draftKey, draftData);
    }, 500);
  }, [watchedValues, compatibilities, draftKey]);

  // Save draft when form values or compatibilities change
  useEffect(() => {
    // Only save draft after initial load
    if (dbDataLoaded || !isEditing) {
      saveDraft();
    }
  }, [watchedValues, compatibilities, saveDraft, dbDataLoaded, isEditing]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Load draft on mount (for new products)
  useEffect(() => {
    if (!isEditing) {
      const draft = getDraft<DraftData>(draftKey);
      if (draft) {
        if (draft.formData) {
          reset({
            stock: 0,
            low_stock_threshold: 5,
            price: 0,
            is_featured: false,
            ...draft.formData,
          });
          if (draft.formData.image_url) {
            setImagePreview(draft.formData.image_url);
          }
        }
        if (draft.compatibilities && Array.isArray(draft.compatibilities)) {
          setCompatibilities(draft.compatibilities);
        }
      }
      setDbDataLoaded(true);
    }
  }, [isEditing, draftKey, reset]);

  // Fetch product and its compatibilities when editing
  useEffect(() => {
    if (isEditing && id) {
      async function fetchProduct() {
        // Fetch product data
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

        // Fetch existing compatibilities
        const { data: compatData } = await supabase
          .from("product_vehicle_compatibility")
          .select("id, make_id, model_id")
          .eq("product_id", id);

        // Fetch makes and models for name lookup
        const [makesRes, modelsRes] = await Promise.all([
          supabase.from("vehicle_makes").select("id, name"),
          supabase.from("vehicle_models").select("id, name"),
        ]);

        const makesMap = new Map((makesRes.data || []).map(m => [m.id, m.name]));
        const modelsMap = new Map((modelsRes.data || []).map(m => [m.id, m.name]));

        // Build DB values
        const dbFormData: ProductFormData = data ? {
          name: data.name,
          sku: data.sku,
          brand: data.brand,
          category: data.category,
          description: data.description || "",
          search_keywords: data.search_keywords || "",
          price: data.price,
          stock: data.stock,
          low_stock_threshold: data.low_stock_threshold ?? 5,
          image_url: data.image_url || "",
          car_year_from: data.car_year_from || "",
          car_year_to: data.car_year_to || "",
          is_featured: data.is_featured ?? false,
        } : {
          name: "",
          sku: "",
          brand: "",
          category: "",
          description: "",
          search_keywords: "",
          price: 0,
          stock: 0,
          low_stock_threshold: 5,
          image_url: "",
          car_year_from: "",
          car_year_to: "",
          is_featured: false,
        };

        const dbCompatibilities: VehicleCompatibilitySelection[] = (compatData || []).map(c => ({
          makeId: c.make_id,
          makeName: makesMap.get(c.make_id) || "Unknown",
          modelId: c.model_id,
          modelName: c.model_id ? modelsMap.get(c.model_id) || null : null,
        }));

        // Check for existing draft
        const draft = getDraft<DraftData>(draftKey);

        if (draft && draft.formData) {
          // Merge draft with DB data - draft wins for user-entered fields
          const mergedFormData = { ...dbFormData };
          
          // Only apply draft values that differ from empty/default
          for (const key of Object.keys(draft.formData) as (keyof ProductFormData)[]) {
            const draftValue = draft.formData[key];
            if (draftValue !== undefined && draftValue !== "" && draftValue !== null) {
              (mergedFormData as any)[key] = draftValue;
            }
          }

          reset(mergedFormData);
          setImagePreview(mergedFormData.image_url || null);

          // Use draft compatibilities if present
          if (draft.compatibilities && Array.isArray(draft.compatibilities) && draft.compatibilities.length > 0) {
            setCompatibilities(draft.compatibilities);
          } else {
            setCompatibilities(dbCompatibilities);
          }
        } else {
          // No draft, use DB data
          reset(dbFormData);
          if (data?.image_url) {
            setImagePreview(data.image_url);
          }
          setCompatibilities(dbCompatibilities);
        }

        setDbDataLoaded(true);
        setLoading(false);
      }
      fetchProduct();
    }
  }, [id, isEditing, reset, draftKey]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("toast.error"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("toast.error"));
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `products/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      setValue("image_url", publicUrl);
      setImagePreview(publicUrl);
      toast.success(t("toast.image_uploaded"));
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(t("toast.upload_failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearImage = () => {
    setValue("image_url", "");
    setImagePreview(null);
  };

  // Get models for selected make
  const modelsForSelectedMake = vehicleModels.filter(m => m.make_id === selectedMakeId);

  // Add compatibility
  const handleAddCompatibility = () => {
    if (!selectedMakeId) return;

    const make = vehicleMakes.find(m => m.id === selectedMakeId);
    if (!make) return;

    const model = selectedModelId ? vehicleModels.find(m => m.id === selectedModelId) : null;

    // Check for duplicates
    const exists = compatibilities.some(
      c => c.makeId === selectedMakeId && c.modelId === (selectedModelId || null)
    );

    if (exists) {
      toast.error(t("admin.product_form.already_added"));
      return;
    }

    setCompatibilities(prev => [
      ...prev,
      {
        makeId: selectedMakeId,
        makeName: make.name,
        modelId: selectedModelId || null,
        modelName: model?.name || null,
      }
    ]);

    // Reset selections
    setSelectedMakeId("");
    setSelectedModelId("");
  };

  // Remove compatibility
  const handleRemoveCompatibility = (index: number) => {
    setCompatibilities(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormData) => {
    setSubmitting(true);

    const productData = {
      name: data.name,
      sku: data.sku,
      brand: data.brand,
      category: data.category,
      description: data.description || null,
      search_keywords: data.search_keywords || null,
      price: data.price,
      stock: Math.max(0, data.stock),
      low_stock_threshold: Math.max(0, data.low_stock_threshold),
      image_url: data.image_url || null,
      car_make: null, // Legacy field, we now use the join table
      car_model: null,
      car_year_from: data.car_year_from ? Number(data.car_year_from) : null,
      car_year_to: data.car_year_to ? Number(data.car_year_to) : null,
      is_featured: data.is_featured,
    };

    let productId = id;
    let error;

    if (isEditing && id) {
      const result = await supabase.from("products").update(productData).eq("id", id);
      error = result.error;
    } else {
      const result = await supabase.from("products").insert(productData).select("id").single();
      error = result.error;
      if (result.data) {
        productId = result.data.id;
      }
    }

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    // Save compatibilities
    if (productId) {
      try {
        // Delete existing compatibilities
        await supabase
          .from("product_vehicle_compatibility")
          .delete()
          .eq("product_id", productId);

        // Insert new compatibilities
        if (compatibilities.length > 0) {
          const compatRows = compatibilities.map(c => ({
            product_id: productId,
            make_id: c.makeId,
            model_id: c.modelId,
          }));

          const { error: compatError } = await supabase
            .from("product_vehicle_compatibility")
            .insert(compatRows);

          if (compatError) {
            console.error("Compatibility save error:", compatError);
            toast.error(t("admin.product_form.compatibility_save_error"));
          }
        }
      } catch (e) {
        console.error("Compatibility save error:", e);
        toast.error(t("admin.product_form.compatibility_save_error"));
      }
    }

    // Clear draft after successful save
    clearDraft(draftKey);

    toast.success(isEditing ? t("toast.product_updated") : t("toast.product_created"));
    navigate("/admin/products");
    setSubmitting(false);
  };

  // Handle clearing draft and resetting form
  const handleClearDraft = () => {
    clearDraft(draftKey);
    if (isEditing) {
      // Reset to DB values - trigger refetch
      setLoading(true);
      setDbDataLoaded(false);
    } else {
      // Reset to defaults
      reset({
        name: "",
        sku: "",
        brand: "",
        category: "",
        description: "",
        search_keywords: "",
        price: 0,
        stock: 0,
        low_stock_threshold: 5,
        image_url: "",
        car_year_from: "",
        car_year_to: "",
        is_featured: false,
      });
      setCompatibilities([]);
      setImagePreview(null);
    }
    toast.success(t("admin.product_form.draft_cleared"));
  };

  if (loading || catalogLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const hasNoCatalogData = categories.length === 0 || brands.length === 0;

  return (
    <div className="max-w-2xl">
      <Link to="/admin/products" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t("admin.product_form.back")}
      </Link>

      <h1 className="font-display text-3xl font-bold mb-8">
        {isEditing ? t("admin.product_form.edit_title") : t("admin.product_form.add_title")}
      </h1>

      {hasNoCatalogData && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <p className="text-yellow-600 dark:text-yellow-400 text-sm">
            {categories.length === 0 && t("admin.product_form.no_categories") + " "}
            {brands.length === 0 && t("admin.product_form.no_brands") + " "}
            <Link to="/admin/catalog" className="underline font-medium">
              {t("admin.product_form.go_to_catalog")}
            </Link>{" "}
            {t("admin.product_form.to_add_first")}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="font-semibold mb-4">{t("admin.product_form.basic_info")}</h2>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
            <input
              type="checkbox"
              id="is_featured"
              {...register("is_featured")}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="is_featured" className="text-sm font-medium cursor-pointer">
              {t("admin.product_form.featured")}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("admin.product_form.name")} *</label>
            <Input {...register("name")} className="input-dark" placeholder="e.g. Front Brake Pads" />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.product_form.oem_code")} *</label>
              <Input {...register("sku")} className="input-dark" placeholder={t("admin.product_form.oem_code_placeholder")} />
              {errors.sku && <p className="text-sm text-destructive mt-1">{errors.sku.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.product_form.brand")} *</label>
              <select 
                {...register("brand")} 
                className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground"
              >
                <option value="">{t("admin.product_form.select_brand")}</option>
                {brands.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
              {errors.brand && <p className="text-sm text-destructive mt-1">{errors.brand.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("admin.product_form.category")} *</label>
            <select 
              {...register("category")} 
              className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground"
            >
              <option value="">{t("admin.product_form.select_category")}</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("admin.product_form.description")}</label>
            <Textarea {...register("description")} className="input-dark resize-none" rows={4} placeholder={t("admin.product_form.description_placeholder")} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("admin.product_form.search_keywords")}</label>
            <Textarea {...register("search_keywords")} className="input-dark resize-none" rows={2} placeholder={t("admin.product_form.search_keywords_placeholder")} />
            <p className="text-xs text-muted-foreground mt-1">{t("admin.product_form.search_keywords_help")}</p>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="font-semibold mb-4">{t("admin.product_form.pricing")}</h2>

          <div>
            <label className="block text-sm font-medium mb-2">{t("admin.product_form.price")} *</label>
            <Input {...register("price")} type="number" step="0.01" className="input-dark" />
            {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.product_form.stock")} *</label>
              <Input {...register("stock")} type="number" min="0" className="input-dark" />
              {errors.stock && <p className="text-sm text-destructive mt-1">{errors.stock.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.product_form.low_stock_threshold")} *</label>
              <Input {...register("low_stock_threshold")} type="number" min="0" className="input-dark" />
              {errors.low_stock_threshold && <p className="text-sm text-destructive mt-1">{errors.low_stock_threshold.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">{t("admin.product_form.threshold_hint")}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="font-semibold mb-4">{t("admin.product_form.image")}</h2>

          {imagePreview && (
            <div className="relative w-full max-w-xs">
              <img 
                src={imagePreview} 
                alt="Product preview" 
                className="w-full h-48 object-cover rounded-lg border border-border"
                onError={() => setImagePreview(null)}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="image-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2"
            >
              {uploading ? (
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

          <div>
            <label className="block text-sm font-medium mb-2">{t("admin.product_form.image_url")}</label>
            <Input {...register("image_url")} className="input-dark" placeholder="https://example.com/image.jpg" />
            {errors.image_url && <p className="text-sm text-destructive mt-1">{errors.image_url.message}</p>}
          </div>

          {!imagePreview && (
            <div className="flex items-center justify-center w-full max-w-xs h-32 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("admin.product_form.no_image")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Vehicle Compatibility Section */}
        <div className="bg-card rounded-lg p-6 border border-border space-y-4">
          <h2 className="font-semibold mb-4">{t("admin.product_form.vehicle")}</h2>

          {/* Add new compatibility row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <select
                value={selectedMakeId}
                onChange={(e) => {
                  setSelectedMakeId(e.target.value);
                  setSelectedModelId("");
                }}
                className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground"
              >
                <option value="">{t("admin.product_form.select_make")}</option>
                {vehicleMakes.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={!selectedMakeId}
                className="w-full h-10 px-3 rounded-md bg-card border border-border text-foreground disabled:opacity-50"
              >
                <option value="">{t("admin.product_form.any_model")}</option>
                {modelsForSelectedMake.length === 0 && selectedMakeId && (
                  <option disabled>{t("admin.product_form.no_models_for_make")}</option>
                )}
                {modelsForSelectedMake.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddCompatibility}
              disabled={!selectedMakeId}
            >
              {t("admin.product_form.add_compatibility_btn")}
            </Button>
          </div>

          {/* List of added compatibilities */}
          {compatibilities.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t("admin.product_form.added_compatibilities")}:</p>
              <div className="flex flex-wrap gap-2">
                {compatibilities.map((c, index) => (
                  <div
                    key={`${c.makeId}-${c.modelId || 'any'}-${index}`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm"
                  >
                    <span>
                      {c.makeName}
                      {c.modelName ? ` / ${c.modelName}` : ` / ${t("admin.product_form.any_model")}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCompatibility(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Year range (optional) */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.product_form.year_from")}</label>
              <Input {...register("car_year_from")} type="number" className="input-dark" placeholder="e.g. 2015" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("admin.product_form.year_to")}</label>
              <Input {...register("car_year_to")} type="number" className="input-dark" placeholder="e.g. 2023" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Button type="submit" disabled={submitting} className="btn-hero">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? t("admin.product_form.updating") : t("admin.product_form.creating")}
              </>
            ) : (
              isEditing ? t("admin.product_form.update") : t("admin.product_form.create")
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClearDraft}
            className="text-muted-foreground"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t("admin.product_form.clear_draft")}
          </Button>
          <Link to="/admin/products">
            <Button type="button" variant="outline">{t("admin.product_form.cancel")}</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
