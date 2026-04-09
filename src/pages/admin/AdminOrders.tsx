import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchQuery } from "@/lib/sanitizeSearch";
import { useLanguage } from "@/contexts/LanguageContext";
import { Order, OrderItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronUp, Package, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "completed", "canceled"];

export default function AdminOrders() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Delete order state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);

  async function fetchOrders() {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    
    if (search) {
      const sanitized = sanitizeSearchQuery(search);
      query = query.or(`customer_name.ilike.%${sanitized}%,customer_phone.ilike.%${sanitized}%`);
    }
    
    const { data } = await query;
    if (data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchOrders();
  }, [search]);

  const loadOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) return;
    
    const { data } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);
    
    if (data) {
      setOrderItems((prev) => ({ ...prev, [orderId]: data as OrderItem[] }));
    }
  };

  const toggleExpand = (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
      loadOrderItems(orderId);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingStatus(orderId);
    
    const updateData: Record<string, unknown> = { status };
    
    // Set shipped_at timestamp when marking as shipped
    if (status === "shipped") {
      updateData.shipped_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) {
      toast.error(t("toast.error"));
    } else {
      toast.success(t("toast.status_updated"));
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { 
          ...o, 
          status,
          ...(status === "shipped" ? { shipped_at: new Date().toISOString() } : {})
        } : o))
      );
    }
    setUpdatingStatus(null);
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    setDeletingOrder(true);
    const { error } = await supabase
      .from("orders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", orderToDelete.id);

    if (error) {
      toast.error(t("toast.error"));
    } else {
      toast.success(t("toast.order_deleted"));
      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
    }
    setDeletingOrder(false);
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const canDeleteOrder = (order: Order) => {
    return ["canceled", "completed"].includes(order.status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "confirmed": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "shipped": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "completed": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "canceled": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPaymentMethod = (order: Order) => {
    if (order.stripe_payment_intent || order.payment_status === "paid") {
      return t("admin.orders.payment_card");
    }
    return t("admin.orders.payment_cod");
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-8">{t("admin.orders.title")}</h1>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("admin.orders.search_by_name_phone")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 input-dark"
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-4 border border-border animate-pulse">
              <div className="h-20 bg-muted rounded" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="bg-card rounded-lg p-12 border border-border text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t("admin.orders.no_orders")}</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-card rounded-lg border border-border overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(order.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {expandedOrder === order.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      {order.customer_phone && (
                        <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-9 sm:ml-0">
                    <Badge variant="outline" className={getStatusColor(order.status)}>
                      {t(`status.${order.status}`)}
                    </Badge>
                    <span className="font-display font-bold text-primary">
                      ₾{Number(order.total_amount).toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground hidden md:block">
                      {format(new Date(order.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>

              {expandedOrder === order.id && (
                <div className="border-t border-border p-4 bg-muted/20">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">{t("admin.orders.customer_details")}</h3>
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <p><strong>{t("admin.orders.name")}:</strong> {order.customer_name}</p>
                        {order.customer_phone && <p><strong>{t("admin.orders.phone")}:</strong> {order.customer_phone}</p>}
                      </div>
                      
                      <h3 className="font-semibold mb-3 mt-4">{t("admin.orders.shipping_address")}</h3>
                      <div className="text-sm text-muted-foreground">
                        <p>{order.shipping_street}</p>
                        <p>{order.shipping_city}, {order.shipping_postal_code}</p>
                        <p>{order.shipping_country}</p>
                      </div>

                      {order.notes && (
                        <>
                          <h3 className="font-semibold mb-2 mt-4">{t("admin.orders.notes")}</h3>
                          <p className="text-sm text-muted-foreground italic">{order.notes}</p>
                        </>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">{t("admin.orders.payment_info")}</h3>
                      <div className="text-sm space-y-2 mb-4">
                        <p><strong>{t("admin.orders.method")}:</strong> {getPaymentMethod(order)}</p>
                        {order.shipped_at && (
                          <p><strong>{t("admin.orders.shipped_on")}:</strong> {format(new Date(order.shipped_at), "MMM d, yyyy 'at' h:mm a")}</p>
                        )}
                      </div>

                      <h3 className="font-semibold mb-3">{t("admin.orders.order_items")}</h3>
                      {orderItems[order.id] ? (
                        <div className="space-y-2">
                          {orderItems[order.id].map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {item.quantity}x {item.product_name}
                              </span>
                              <span>₾{(Number(item.price_at_order) * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-border flex justify-between font-semibold">
                            <span>{t("admin.orders.total")}</span>
                            <span className="text-primary">₾{Number(order.total_amount).toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t("admin.orders.loading_items")}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border">
                    <label className="block text-sm font-medium mb-2">{t("admin.orders.update_status")}</label>
                    <div className="flex flex-wrap gap-2">
                      {ORDER_STATUSES.map((status) => (
                        <Button
                          key={status}
                          variant={order.status === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateStatus(order.id, status)}
                          disabled={updatingStatus === order.id || order.status === status}
                          className={order.status === status ? "bg-primary" : ""}
                        >
                          {updatingStatus === order.id && order.status !== status ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            t(`status.${status}`)
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {canDeleteOrder(order) && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToDelete(order);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t("admin.orders.delete_order")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.orders.delete_order")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.orders.delete_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOrder}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              disabled={deletingOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingOrder ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("common.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
