import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      // Fetch products count
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      // Fetch all orders for counts
      const { data: allOrders } = await supabase
        .from("orders")
        .select("total_amount, status")
        .is("deleted_at", null);

      // Fetch completed orders for revenue calculation
      const { data: completedOrders } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "completed")
        .is("deleted_at", null);

      const totalOrders = allOrders?.length || 0;
      const totalRevenue = completedOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const pendingOrders = allOrders?.filter((o) => o.status === "pending").length || 0;

      setStats({
        totalProducts: productsCount || 0,
        totalOrders,
        totalRevenue,
        pendingOrders,
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      label: t("admin.dashboard.total_products"),
      value: stats.totalProducts,
      icon: Package,
      href: "/admin/products",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: t("admin.dashboard.total_orders"),
      value: stats.totalOrders,
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: t("admin.dashboard.total_revenue"),
      value: `₾${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      href: "/admin/orders",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: t("admin.dashboard.pending_orders"),
      value: stats.pendingOrders,
      icon: TrendingUp,
      href: "/admin/orders",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-8">{t("admin.dashboard.title")}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            to={stat.href}
            className="bg-card rounded-lg p-6 border border-border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div>
              {loading ? (
                <div className="h-8 bg-muted rounded w-20 animate-pulse" />
              ) : (
                <p className="font-display text-2xl font-bold">{stat.value}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-8">
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="font-display text-xl font-semibold mb-4">{t("admin.dashboard.quick_actions")}</h2>
          <div className="space-y-3">
            <Link
              to="/admin/products/new"
              className="block p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <span className="font-medium">{t("admin.dashboard.add_product")}</span>
              <p className="text-sm text-muted-foreground">{t("admin.dashboard.add_product_desc")}</p>
            </Link>
            <Link
              to="/admin/orders"
              className="block p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <span className="font-medium">{t("admin.dashboard.view_orders")}</span>
              <p className="text-sm text-muted-foreground">{t("admin.dashboard.view_orders_desc")}</p>
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="font-display text-xl font-semibold mb-4">{t("admin.dashboard.getting_started")}</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary flex-shrink-0 mt-0.5">1</span>
              <span>{t("admin.dashboard.step_1")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary flex-shrink-0 mt-0.5">2</span>
              <span>{t("admin.dashboard.step_2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary flex-shrink-0 mt-0.5">3</span>
              <span>{t("admin.dashboard.step_3")}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
