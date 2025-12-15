interface RecommendationBadgeProps {
  type: "BUY" | "AVOID" | "PROMOTE" | "HOLD";
  size?: "sm" | "md" | "lg";
}

export function RecommendationBadge({ type, size = "md" }: RecommendationBadgeProps) {
  const styles = {
    BUY: "bg-green-100 text-green-700 border-green-300",
    AVOID: "bg-red-100 text-red-700 border-red-300",
    PROMOTE: "bg-blue-100 text-blue-700 border-blue-300",
    HOLD: "bg-yellow-100 text-yellow-700 border-yellow-300",
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-1.5 text-sm",
    lg: "px-5 py-2 text-base",
  };

  return (
    <span className={`${styles[type]} ${sizeClasses[size]} border-2 rounded-lg inline-block font-medium`}>
      {type}
    </span>
  );
}
