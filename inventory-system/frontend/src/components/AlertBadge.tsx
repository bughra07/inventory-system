interface AlertBadgeProps {
  type: "BUY" | "AVOID" | "PROMOTE";
}

export function AlertBadge({ type }: AlertBadgeProps) {
  const getStyles = () => {
    switch (type) {
      case "BUY":
        return "bg-green-100 text-green-700 border-green-300";
      case "AVOID":
        return "bg-red-100 text-red-700 border-red-300";
      case "PROMOTE":
        return "bg-orange-100 text-orange-700 border-orange-300";
    }
  };

  return (
    <span className={`px-4 py-1.5 rounded-full border-2 inline-block font-medium ${getStyles()}`}>
      {type}
    </span>
  );
}
