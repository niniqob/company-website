import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Clock, Instagram } from "lucide-react";
import { SITE_CONFIG } from "@/lib/siteConfig";
import { useLanguage } from "@/contexts/LanguageContext";
import logoImage from "@/assets/logo.jpg";

// Custom Facebook icon since lucide doesn't have one
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    aria-hidden="true"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t, language } = useLanguage();
  
  // Use English address for EN, Georgian for others
  const addressLine1 = language === "en" ? SITE_CONFIG.addressLine1En : SITE_CONFIG.addressLine1;
  const addressLine2 = language === "en" ? SITE_CONFIG.addressLine2En : SITE_CONFIG.addressLine2;
  
  const socialLinks = [
    {
      name: "Facebook",
      url: "https://www.facebook.com/share/1AMtNex7wG/?mibextid=wwXIfr",
      icon: FacebookIcon,
    },
    {
      name: "Instagram", 
      url: "https://www.instagram.com/autocentergeorgia?igsh=MWRsbjlwMnJyOWkweg==",
      icon: Instagram,
    },
  ];

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12">
        {/* Mobile: Social icons at top */}
        <div className="md:hidden mb-8">
          <h3 className="font-display text-lg font-semibold mb-4">{t("footer.social")}</h3>
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className="flex items-center justify-center w-11 h-11 rounded-lg bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img 
                src={logoImage} 
                alt={t("site.name")} 
                className="h-10 w-auto object-contain"
              />
              <span className="font-display text-xl font-bold text-foreground">
                {t("site.name")}
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("footer.description")}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">{t("footer.contact")}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-muted-foreground text-sm">
                <Phone className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <span>{SITE_CONFIG.phone}</span>
                  <p className="text-primary font-medium">{t("footer.available_24_7")}</p>
                </div>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <Mail className="w-4 h-4 text-primary" />
                <span>{SITE_CONFIG.email}</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span>{addressLine1}<br />{addressLine2}</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground text-sm">
                <Clock className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <p>{t("footer.hours_weekday")}</p>
                  <p>{t("footer.hours_sunday")}</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Social - Desktop only */}
          <div className="hidden md:block">
            <h3 className="font-display text-lg font-semibold mb-4">{t("footer.social")}</h3>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © {currentYear} {t("site.name")}. {t("footer.rights_reserved")}
          </p>
          <Link
            to="/admin/login"
            className="text-muted-foreground/50 hover:text-muted-foreground text-xs transition-colors"
          >
            {t("footer.admin")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
