import { Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <section aria-labelledby="appearance-title" className="flex items-center justify-between gap-4 border-b pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <Moon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="appearance-title" className="text-sm font-semibold">
            <label htmlFor="dark-appearance">Vista oscura</label>
          </h2>
          <p id="appearance-description" className="text-xs text-muted-foreground">Solo en este dispositivo</p>
        </div>
      </div>
      <Switch
        id="dark-appearance"
        aria-describedby="appearance-description"
        checked={theme === "dark"}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
    </section>
  );
}
