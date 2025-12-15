import { Building2, UserCog } from "lucide-react";

interface RoleCardProps {
  role: "admin" | "branch";
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

export function RoleCard({ role, title, description, isSelected, onClick }: RoleCardProps) {
  const Icon = role === "admin" ? UserCog : Building2;
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-8 rounded-2xl border-2 transition-all duration-300 text-left group ${
        isSelected
          ? "border-pistachio-500 bg-gradient-to-br from-pistachio-50 to-white shadow-xl scale-[1.02]"
          : "border-gray-200 bg-white hover:border-pistachio-300 hover:shadow-lg hover:scale-[1.01]"
      }`}
    >
      <div className="flex items-start gap-6">
        <div
          className={`p-4 rounded-xl transition-all duration-300 ${
            isSelected 
              ? "bg-pistachio-500 text-white shadow-lg" 
              : "bg-gray-100 text-gray-600 group-hover:bg-pistachio-100 group-hover:text-pistachio-600"
          }`}
        >
          <Icon size={32} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <h4 className={`mb-3 text-lg font-semibold ${isSelected ? "text-pistachio-700" : "text-gray-800"}`}>
            {title}
          </h4>
          <p className="text-gray-600 leading-relaxed">{description}</p>
        </div>
        {isSelected && (
          <div className="flex items-center justify-center">
            <div className="w-7 h-7 bg-pistachio-500 rounded-full flex items-center justify-center shadow-md">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
