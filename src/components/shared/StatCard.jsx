import { Card } from "@/components/ui/card";

export default function StatCard({ icon: Icon, label, value, color = "text-primary", bgColor = "bg-primary/10" }) {
  return (
    <Card className="p-4 flex items-center gap-3 border-0 shadow-sm bg-card">
      <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold font-display">{value}</p>
      </div>
    </Card>
  );
}