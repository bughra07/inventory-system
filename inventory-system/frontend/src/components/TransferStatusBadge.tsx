interface TransferStatusBadgeProps {
  status: "Tamamlandı" | "Bekliyor" | "İptal";
}

export function TransferStatusBadge({ status }: TransferStatusBadgeProps) {
  const styles = {
    Tamamlandı: "bg-green-100 text-green-700 border-green-300",
    Bekliyor: "bg-yellow-100 text-yellow-700 border-yellow-300",
    İptal: "bg-red-100 text-red-700 border-red-300",
  };

  const icons = {
    Tamamlandı: "✓",
    Bekliyor: "⏳",
    İptal: "✗",
  };

  return (
    <span className={`${styles[status]} border-2 rounded-lg px-4 py-1.5 inline-flex items-center gap-2 font-medium`}>
      <span>{icons[status]}</span>
      <span>{status}</span>
    </span>
  );
}
