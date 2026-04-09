import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Wrench, Loader2, AlertCircle, WifiOff, ShieldX, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Schema is created inside component to access translations
type LoginForm = {
  email: string;
  password: string;
};


export default function AdminLogin() {
  const navigate = useNavigate();
  const { signIn, signOut, isAdmin, user, isLoading: authLoading, isRoleLoading } = useAuth();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t("admin.login.invalid_email")),
    password: z.string().min(6, t("admin.login.password_min")),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Test Supabase connection on mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { error } = await supabase.from("products").select("id").limit(1);
        if (error) {
          console.error("[AdminLogin] Supabase connection test failed:", error);
          setConnectionError(t("admin.login.connection_error"));
        }
      } catch (err) {
        console.error("[AdminLogin] Supabase connection exception:", err);
        setConnectionError(t("admin.login.backend_error"));
      }
    };
    testConnection();
  }, []);

  // Handle redirect logic - wait for BOTH auth loading AND role loading to complete
  useEffect(() => {
    // Don't do anything while still loading
    if (authLoading || isRoleLoading) {
      return;
    }

    // User is logged in
    if (user) {
      if (isAdmin) {
        // User is admin - redirect to admin dashboard
        navigate("/admin");
      } else {
        // User is logged in but NOT admin - show access denied
        setAccessDenied(true);
      }
    }
  }, [user, isAdmin, authLoading, isRoleLoading, navigate]);

  const getReadableError = (errorMessage: string): string => {
    const lower = errorMessage.toLowerCase();
    if (lower.includes("invalid login credentials")) {
      return t("admin.login.error_invalid_credentials");
    }
    if (lower.includes("email not confirmed")) {
      return t("admin.login.error_email_not_confirmed");
    }
    if (lower.includes("user not found")) {
      return t("admin.login.error_user_not_found");
    }
    if (lower.includes("too many requests")) {
      return t("admin.login.error_too_many_requests");
    }
    return errorMessage;
  };

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    setError(null);
    setAccessDenied(false);

    if (import.meta.env.DEV) {
      console.log("[AdminLogin] Attempting login for:", data.email);
    }

    const { error } = await signIn(data.email, data.password);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[AdminLogin] Login error:", error.message);
      }
      setError(getReadableError(error.message));
      setIsSubmitting(false);
    } else {
      // Login succeeded - wait for role check in useEffect
      // Keep spinner while role is being checked
      if (import.meta.env.DEV) {
        console.log("[AdminLogin] Login succeeded, checking role...");
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setAccessDenied(false);
    setIsSubmitting(false);
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied screen if user is logged in but not admin
  if (accessDenied || (user && !isAdmin && !isRoleLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">{t("admin.login.access_denied")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("admin.login.access_denied_message")}
          </p>
          <Button onClick={handleSignOut} variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" />
            {t("admin.login.sign_out")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">{t("admin.login.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("admin.login.subtitle")}</p>
        </div>

        {connectionError && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm mb-4">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>{connectionError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-lg p-6 border border-border space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">{t("admin.login.email")}</label>
            <Input
              {...register("email")}
              type="email"
              className="input-dark"
              placeholder="admin@example.com"
              disabled={isSubmitting || isRoleLoading}
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t("admin.login.password")}</label>
            <Input
              {...register("password")}
              type="password"
              className="input-dark"
              placeholder="••••••••"
              disabled={isSubmitting || isRoleLoading}
            />
            {errors.password && (
              <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting || isRoleLoading} className="w-full btn-hero">
            {(isSubmitting || isRoleLoading) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("admin.login.signing_in")}
              </>
            ) : (
              t("admin.login.sign_in")
            )}
          </Button>
        </form>

      </div>
    </div>
  );
}
