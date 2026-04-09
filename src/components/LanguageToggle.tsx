import { useLanguage, Language } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const LANGUAGE_LABELS: Record<Language, string> = {
  ka: "ქარ",
  en: "EN",
  tr: "TR",
};

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="font-medium text-xs px-2 h-8 border border-border hover:bg-muted gap-1"
        >
          <Globe className="w-3.5 h-3.5" />
          {LANGUAGE_LABELS[language]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[80px]">
        <DropdownMenuItem onClick={() => setLanguage("ka")} className={language === "ka" ? "bg-muted" : ""}>
          ქარ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("en")} className={language === "en" ? "bg-muted" : ""}>
          EN
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("tr")} className={language === "tr" ? "bg-muted" : ""}>
          TR
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
