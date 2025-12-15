import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "positive" | "negative" | "neutral";
  accentColor?: string;
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, accentColor = "pistachio" }: KPICardProps) {
  const getBgColor = () => {
    if (trend === "positive") return "bg-green-50";
    if (trend === "negative") return "bg-red-50";
    return "bg-gray-50";
  };

  const getIconBg = () => {
    if (trend === "positive") return "bg-green-500";
    if (trend === "negative") return "bg-red-500";
    return `bg-${accentColor}-500`;
  };

  const getTextColor = () => {
    if (trend === "positive") return "text-green-700";
    if (trend === "negative") return "text-red-700";
    return "text-gray-700";
  };

  return (
    <div className={`${getBgColor()} rounded-2xl p-6 border-2 border-gray-100 shadow-md hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between mb-6">
        <div className={`${getIconBg()} p-3 rounded-xl`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
      <div>
        <p className="text-gray-600 mb-2 text-sm">{title}</p>
        <h3 className={`${getTextColor()} text-2xl font-semibold mb-2`}>{value}</h3>
        {subtitle && (
          <p className="text-gray-500 mt-2 text-sm">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
