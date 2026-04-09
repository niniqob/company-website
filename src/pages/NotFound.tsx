import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-primary">{t("notfound.title")}</h1>
        <p className="mb-8 text-xl text-muted-foreground">{t("notfound.message")}</p>
        <Link to="/">
          <Button className="btn-hero">{t("notfound.return")}</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
