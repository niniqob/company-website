import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { SITE_CONFIG } from "@/lib/siteConfig";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

export default function Contact() {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactSchema = z.object({
    name: z.string().min(2, { message: "სახელი სავალდებულოა" }).max(100),
    phone: z.string().min(9, { message: "ტელეფონის ნომერი სავალდებულოა" }).max(20),
    subject: z.string().min(5, { message: "თემა სავალდებულოა" }).max(200),
    message: z.string().min(10, { message: "შეტყობინება სავალდებულოა" }).max(1000),
  });

  type ContactForm = z.infer<typeof contactSchema>;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const getErrorMessageFromInvoke = async (err: unknown): Promise<string | undefined> => {
    // supabase-js FunctionsHttpError may include a Response in `context`
    const context = (err as any)?.context;
    if (context && typeof context.clone === "function" && typeof context.json === "function") {
      try {
        const payload = await context.clone().json();
        const msg = payload?.error ?? payload?.message;
        if (typeof msg === "string" && msg.trim()) return msg;
      } catch {
        // ignore JSON parse failures
      }
    }

    const message = (err as any)?.message;
    if (typeof message === "string" && message.trim()) return message;

    return undefined;
  };

  const onSubmit = async (data: ContactForm) => {
    setIsSubmitting(true);

    try {
      const { data: result, error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: data.name,
          phone: data.phone || undefined,
          subject: data.subject,
          message: data.message,
        },
      });

      if (error) {
        const message = await getErrorMessageFromInvoke(error);
        toast.error(message || t("contact.error"));
        return;
      }

      if (result?.success) {
        toast.success(t("contact.sent"), {
          description: t("contact.sent_desc"),
        });
        reset();
        return;
      }

      toast.error((result as any)?.error || t("contact.error"));
    } catch (err) {
      console.error("Failed to send contact message:", err);
      const message = await getErrorMessageFromInvoke(err);
      toast.error(message || t("contact.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl lg:text-5xl font-bold mb-4">{t("contact.title")}</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("contact.subtitle")}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t("contact.phone")}</h3>
                  <p className="text-muted-foreground">{SITE_CONFIG.phone}</p>
                  <p className="text-sm text-muted-foreground">ორშ-შაბ 9:00-19:00</p>
                  <p className="text-sm text-muted-foreground">კვირა 9:00-17:00</p>
                  <p className="text-sm font-medium text-primary mt-1">{t("footer.available_24_7")}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t("contact.email")}</h3>
                  <p className="text-muted-foreground">{SITE_CONFIG.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t("contact.address")}</h3>
                  <p className="text-muted-foreground">{SITE_CONFIG.addressLine1}</p>
                  <p className="text-muted-foreground">{SITE_CONFIG.addressLine2}</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="bg-card rounded-lg p-6 border border-border space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t("contact.name")}</label>
                <Input {...register("name")} className="input-dark" />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("contact.phone")} *</label>
                <Input {...register("phone")} type="tel" placeholder="+995 5XX XXX XXX" className="input-dark" />
                {errors.phone && (
                  <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("contact.subject")}</label>
                <Input {...register("subject")} className="input-dark" />
                {errors.subject && (
                  <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("contact.message")}</label>
                <Textarea
                  {...register("message")}
                  className="input-dark resize-none"
                  rows={5}
                />
                {errors.message && (
                  <p className="text-sm text-destructive mt-1">{errors.message.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full btn-hero">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("contact.sending")}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t("contact.send")}
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
