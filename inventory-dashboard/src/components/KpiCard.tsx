import React from "react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
}

export default function KpiCard({ icon: Icon, title, value, subtitle }: KpiCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="p-2 rounded-xl bg-slate-50">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <div className="flex flex-col">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="text-xl font-semibold text-slate-900">{value}</div>
        {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
      </div>
    </div>
  );
}