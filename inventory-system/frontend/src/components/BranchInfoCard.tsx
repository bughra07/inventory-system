import { LucideIcon } from "lucide-react";

interface BranchInfoCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "pistachio" | "blue" | "orange" | "red";
}

export function BranchInfoCard({ title, value, icon: Icon, color = "pistachio" }: BranchInfoCardProps) {
  const colorClasses = {
    pistachio: "bg-pistachio-50 border-pistachio-200",
    blue: "bg-blue-50 border-blue-200",
    orange: "bg-orange-50 border-orange-200",
    red: "bg-red-50 border-red-200",
  };

  const iconColorClasses = {
    pistachio: "bg-pistachio-500",
    blue: "bg-blue-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  return (
    <div className={`${colorClasses[color]} border-2 rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow`}>
      <div className="flex items-center gap-4">
        <div className={`${iconColorClasses[color]} p-3 rounded-xl`}>
          <Icon className="text-white" size={24} />
        </div>
        <div>
          <p className="text-gray-600 mb-2 text-sm">{title}</p>
          <h3 className="text-gray-800 text-xl font-semibold">{value}</h3>
        </div>
      </div>
    </div>
  );
}
