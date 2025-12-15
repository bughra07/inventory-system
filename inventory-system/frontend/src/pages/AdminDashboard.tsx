import { useState, useEffect } from "react";
import { AdminHeader } from "../components/AdminHeader";
import { KPICard } from "../components/KPICard";
import { AlertBadge } from "../components/AlertBadge";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  ShoppingCart,
  Calendar,
  Building2,
  Tag,
  List
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const API_BASE_URL = "http://localhost:8080/api/v1";

type RecommendationType = "BUY" | "PROMOTE" | "AVOID" | "HOLD";

interface SalesTrendPoint {
  day: string;
  sales: number;
}

interface TopProduct {
  name: string;
  sales: number;
}

interface SlowMovingProduct {
  name: string;
  lastSale: string;
  stock: number;
}

interface RecommendationItem {
  id: number;
  product: string;
  message: string;
  type: RecommendationType;
  branch: string;
}

interface BranchOption {
  id: number | null;
  name: string;
}

interface BranchCardData {
  id: number;
  name: string;
  stockValue: number;
  products: number;
}

interface AdminDashboardProps {
  onNavigateToBranch?: (branchId: string) => void;
  onNavigateToReports?: () => void;
  onNavigateToRecommendations?: () => void;
  onNavigateToTransfer?: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToBranches?: () => void;
  onNavigateToTransactions?: () => void;
}

// tarih aralığını from/to'ya çevir
function getDateRange(dateRange: string): { from: string; to: string } {
  const today = new Date();
  const toDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let fromDate = new Date(toDate);

  if (dateRange.startsWith("Son 7")) {
    fromDate.setDate(toDate.getDate() - 6);
  } else if (dateRange.startsWith("Son 30")) {
    fromDate.setDate(toDate.getDate() - 29);
  } else if (dateRange.startsWith("Son 3")) {
    fromDate.setMonth(toDate.getMonth() - 3);
  } else {
    // Bu Yıl
    fromDate = new Date(toDate.getFullYear(), 0, 1);
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(fromDate), to: fmt(toDate) };
}

/** Backend’ten gelen string kodu badge tipine map’liyoruz */
function mapToBadgeType(code: string | null | undefined): RecommendationType {
  switch (code) {
    case "BUY":
      return "BUY";
    case "PROMOTE":
      return "PROMOTE";
    case "AVOID":
      return "AVOID";
    case "HOLD":
      return "HOLD";
    case "TRANSFER":
    case "TRANSFER_OR_PROMOTE":
      return "PROMOTE";
    case "WATCH":
    default:
      return "HOLD";
  }
}

export default function AdminDashboard({ 
  onNavigateToBranch, 
  onNavigateToReports, 
  onNavigateToRecommendations, 
  onNavigateToTransfer,
  onNavigateToProducts,
  onNavigateToBranches,
  onNavigateToTransactions
}: AdminDashboardProps) {
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([
    { id: null, name: "Tüm Şubeler" },
  ]);
  const [selectedBranch, setSelectedBranch] = useState("Tüm Şubeler");
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState("Son 30 Gün");

  const [revenue, setRevenue] = useState(0);
  const [cogs, setCogs] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [totalSalesQty, setTotalSalesQty] = useState(0);
  const [sktPartiCount, setSktPartiCount] = useState(0);

  const [salesTrendData, setSalesTrendData] = useState<SalesTrendPoint[]>([]);
  const [topProductsData, setTopProductsData] = useState<TopProduct[]>([]);
  const [slowMovingProducts, setSlowMovingProducts] = useState<SlowMovingProduct[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [branchCards, setBranchCards] = useState<BranchCardData[]>([]);

  // Şubeleri + şube kartlarını backend'den çek
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch(`${API_BASE_URL}/branches`);
        if (!res.ok) throw new Error("branches failed");
        const data: any[] = await res.json();

        const options: BranchOption[] = [
          { id: null, name: "Tüm Şubeler" },
          ...data.map((b) => ({
            id: Number(b.id),
            name: b.name ?? "İsimsiz Şube",
          })),
        ];
        setBranchOptions(options);

        // Şube kartları için stok değeri + ürün sayısı
        const cards: BranchCardData[] = await Promise.all(
          data.map(async (b) => {
            const branchId = Number(b.id);
            let stockValue = 0;
            let productsCount = 0;

            try {
              const invRes = await fetch(
                `${API_BASE_URL}/reports/inventory-valuation?branchId=${branchId}`
              );
              if (invRes.ok) {
                const inv = await invRes.json();
                stockValue = Number(inv ?? 0);
              }
            } catch {
              stockValue = 0;
            }

            try {
              const prodRes = await fetch(
                `${API_BASE_URL}/products?branchId=${branchId}&page=0&size=1`
              );
              if (prodRes.ok) {
                const body: any = await prodRes.json();
                if (Array.isArray(body)) {
                  productsCount = body.length;
                } else if (typeof body.totalElements === "number") {
                  productsCount = body.totalElements;
                } else if (Array.isArray(body.content)) {
                  productsCount = body.content.length;
                }
              }
            } catch {
              productsCount = 0;
            }

            return {
              id: branchId,
              name: b.name ?? "İsimsiz Şube",
              stockValue,
              products: productsCount,
            };
          })
        );

        setBranchCards(cards);
      } catch (err) {
        console.error("Branch load error", err);
      }
    }

    loadBranches();
  }, []);

  // Tarih + şube filtresine göre dashboard verilerini çek
  useEffect(() => {
    const { from, to } = getDateRange(dateRange);
    const branchQuery =
      selectedBranchId != null ? `&branchId=${selectedBranchId}` : "";

    async function loadDashboard() {
      try {
        // 1) Gelir tablosu
        try {
          const res = await fetch(
            `${API_BASE_URL}/reports/income-statement?from=${from}&to=${to}${branchQuery}`
          );
          if (res.ok) {
            const data: any = await res.json();
            const rev = Number(data.revenue ?? 0);
            const cg = Number(data.cogs ?? 0);
            setRevenue(rev);
            setCogs(cg);
          } else {
            setRevenue(0);
            setCogs(0);
          }
        } catch (e) {
          console.error("income-statement error", e);
          setRevenue(0);
          setCogs(0);
        }

        // 2) Envanter değeri
        try {
          const invUrl =
            selectedBranchId == null
              ? `${API_BASE_URL}/reports/inventory-valuation`
              : `${API_BASE_URL}/reports/inventory-valuation?branchId=${selectedBranchId}`;
          const invRes = await fetch(invUrl);
          if (invRes.ok) {
            const inv = await invRes.json();
            setTotalInventoryValue(Number(inv ?? 0));
          } else {
            setTotalInventoryValue(0);
          }
        } catch (e) {
          console.error("inventory-valuation error", e);
          setTotalInventoryValue(0);
        }

        // 3) Satış trendi
        try {
          const trendRes = await fetch(
            `${API_BASE_URL}/reports/sales-trend?from=${from}&to=${to}${branchQuery}`
          );
          if (trendRes.ok) {
            const arr: any[] = await trendRes.json();
            const mapped: SalesTrendPoint[] = arr.map((p: any) => {
              const dateStr =
                p.date ??
                p.day ??
                (Array.isArray(p) ? p[0] : "") ??
                "";
              const d = dateStr ? new Date(dateStr) : new Date();
              const label = d.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
              });
              const sales = Number(
                p.revenue ?? p.gross ?? (Array.isArray(p) ? p[1] : 0) ?? 0
              );
              return { day: label, sales };
            });
            setSalesTrendData(mapped);
          } else {
            setSalesTrendData([]);
          }
        } catch (e) {
          console.error("sales-trend error", e);
          setSalesTrendData([]);
        }

        // 4) En çok satan ürünler + toplam satış adedi
        try {
          const bestRes = await fetch(
            `${API_BASE_URL}/reports/bestsellers?from=${from}&to=${to}&limit=1000${branchQuery}`
          );
          if (bestRes.ok) {
            const arr: any[] = await bestRes.json();
            const mapped: TopProduct[] = arr.map((p: any) => ({
              name: p.productName ?? p.name ?? "Ürün",
              sales: Number(
                p.totalQuantity ?? p.quantity ?? p.total ?? 0
              ),
            }));
            setTopProductsData(mapped);

            const total = mapped.reduce(
              (sum, p) => sum + (p.sales || 0),
              0
            );
            setTotalSalesQty(total);
          } else {
            setTopProductsData([]);
            setTotalSalesQty(0);
          }
        } catch (e) {
          console.error("bestsellers error", e);
          setTopProductsData([]);
          setTotalSalesQty(0);
        }

        // 5) Yavaş giden ürünler
        try {
          const slowRes = await fetch(
            `${API_BASE_URL}/reports/slow-movers?from=${from}&to=${to}&threshold=3${branchQuery}`
          );
          if (slowRes.ok) {
            const arr: any[] = await slowRes.json();
            const mapped: SlowMovingProduct[] = arr.map((p: any) => {
              const days = p.daysSinceLastSale ?? null;
              return {
                name: p.productName ?? p.name ?? "Ürün",
                lastSale:
                  days != null ? `${days} gün önce` : "bilinmiyor",
                stock: Number(
                  p.totalQuantity ?? p.quantity ?? p.total ?? 0
                ),
              };
            });
            setSlowMovingProducts(mapped);
          } else {
            setSlowMovingProducts([]);
          }
        } catch (e) {
          console.error("slow-movers error", e);
          setSlowMovingProducts([]);
        }

        // 6) SKT uyarıları (sadece adet için)
        try {
          const alertUrl =
            selectedBranchId == null
              ? `${API_BASE_URL}/alerts/expiring?withinDays=30`
              : `${API_BASE_URL}/alerts/expiring?withinDays=30&branchId=${selectedBranchId}`;
          const alertRes = await fetch(alertUrl);
          if (alertRes.ok) {
            const arr: any[] = await alertRes.json();
            setSktPartiCount(arr.length);
          } else {
            setSktPartiCount(0);
          }
        } catch (e) {
          console.error("alerts error", e);
          setSktPartiCount(0);
        }

        // 7) Öneri sistemi
        try {
          const recRes = await fetch(
            `${API_BASE_URL}/recommendations?from=${from}&to=${to}${branchQuery}`
          );
          if (recRes.ok) {
            const arr: any[] = await recRes.json();
            const mapped: RecommendationItem[] = arr.map(
              (r: any, idx: number) => {
                const rawCode: string | null =
                  r.recommendation ?? r.action ?? r.type ?? null;
                return {
                  id: Number(r.id ?? idx),
                  product:
                    r.productName ??
                    r.product ??
                    r.name ??
                    "Ürün",
                  message:
                    r.message ??
                    r.reason ??
                    r.explanation ??
                    "",
                  type: mapToBadgeType(rawCode),
                  branch:
                    r.branchName ??
                    r.branch ??
                    selectedBranch ??
                    "Tüm Şubeler",
                };
              }
            );
            setRecommendations(mapped);
          } else {
            setRecommendations([]);
          }
        } catch (e) {
          console.error("recommendations error", e);
          setRecommendations([]);
        }
      } catch (err) {
        console.error("dashboard load error", err);
      }
    }

    loadDashboard();
  }, [dateRange, selectedBranchId, selectedBranch]);

  const grossProfit = revenue - cogs;
  const profitMargin =
    revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pistachio-50 via-white to-gray-50">
      <AdminHeader />
      
      <div className="container mx-auto px-6 py-8">
        {/* Filters & Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-8 border-2 border-gray-100">
          <div className="flex flex-wrap gap-6 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-3">
                <Calendar className="text-gray-500" size={20} />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-5 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                >
                  <option>Son 7 Gün</option>
                  <option>Son 30 Gün</option>
                  <option>Son 3 Ay</option>
                  <option>Bu Yıl</option>
                </select>
              </div>
              
              <div className="flex items-center gap-3">
                <Building2 className="text-gray-500" size={20} />
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSelectedBranch(name);
                    const found = branchOptions.find(
                      (b) => b.name === name
                    );
                    setSelectedBranchId(found?.id ?? null);
                  }}
                  className="px-5 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                >
                  {branchOptions.map((branch) => (
                    <option key={branch.id ?? "all"}>{branch.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onNavigateToTransfer}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors shadow-md hover:shadow-lg font-medium"
              >
                Transfer Yap
              </button>
              <button
                onClick={onNavigateToReports}
                className="px-6 py-2.5 bg-pistachio-500 hover:bg-pistachio-600 text-white rounded-xl transition-colors shadow-md hover:shadow-lg font-medium"
              >
                Detaylı Raporlar →
              </button>
            </div>
          </div>
        </div>

        {/* Master Data Management Section */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-8 border-2 border-gray-100">
          <h3 className="text-gray-800 mb-6 text-xl font-semibold">Ana Veri Yönetimi</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <button
              onClick={onNavigateToProducts}
              className="p-6 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 rounded-xl hover:shadow-lg hover:border-blue-300 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="bg-blue-500 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Tag className="text-white" size={24} />
                </div>
                <span className="text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <h4 className="text-gray-800 mb-1">Ürünler</h4>
              <p className="text-gray-600">Ürün kataloğu yönetimi</p>
            </button>

            <button
              onClick={onNavigateToBranches}
              className="p-6 bg-gradient-to-br from-purple-50 to-white border-2 border-purple-100 rounded-xl hover:shadow-lg hover:border-purple-300 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="bg-purple-500 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Building2 className="text-white" size={24} />
                </div>
                <span className="text-purple-600 group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <h4 className="text-gray-800 mb-1">Şubeler</h4>
              <p className="text-gray-600">Şube bilgileri yönetimi</p>
            </button>

            <button
              onClick={onNavigateToTransactions}
              className="p-6 bg-gradient-to-br from-green-50 to-white border-2 border-green-100 rounded-xl hover:shadow-lg hover:border-green-300 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="bg-green-500 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <List className="text-white" size={24} />
                </div>
                <span className="text-green-600 group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <h4 className="text-gray-800 mb-1">İşlemler</h4>
              <p className="text-gray-600">Satın alma & Satış kayıtları</p>
            </button>
          </div>
        </div>

        {/* Financial KPIs */}
        <div className="mb-8">
          <h3 className="text-gray-800 mb-6 text-xl font-semibold">Finansal Özet</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="Toplam Gelir"
              value={`₺${revenue.toLocaleString('tr-TR')}`}
              subtitle={dateRange}
              icon={TrendingUp}
              accentColor="pistachio"
            />
            <KPICard
              title="Maliyet (COGS)"
              value={`₺${cogs.toLocaleString('tr-TR')}`}
              subtitle={dateRange}
              icon={TrendingDown}
              accentColor="pistachio"
            />
            <KPICard
              title="Brüt Kar"
              value={`₺${grossProfit.toLocaleString('tr-TR')}`}
              subtitle={`%${profitMargin} marj`}
              icon={TrendingUp}
              trend={grossProfit > 0 ? "positive" : "negative"}
            />
          </div>
        </div>

        {/* Inventory & Alert Cards */}
        <div className="mb-8">
          <h3 className="text-gray-800 mb-6 text-xl font-semibold">Envanter & Uyarılar</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="Toplam Envanter Değeri"
              value={`₺${totalInventoryValue.toLocaleString('tr-TR')}`}
              subtitle="Tüm şubeler"
              icon={Package}
              accentColor="pistachio"
            />
            <KPICard
              title="SKT Uyarısı"
              value={`${sktPartiCount} Parti`}
              subtitle="30 gün içinde dolacak"
              icon={AlertTriangle}
              trend="negative"
            />
            <KPICard
              title="Toplam Satış"
              value={`${totalSalesQty.toLocaleString('tr-TR')} Adet`}
              subtitle={dateRange}
              icon={ShoppingCart}
              accentColor="pistachio"
            />
          </div>
        </div>

        {/* Sales Trend Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-8 border-2 border-gray-100">
          <h3 className="text-gray-800 mb-6 text-xl font-semibold">Satış Trendi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="#7fba1f" 
                strokeWidth={3}
                dot={{ fill: '#7fba1f', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Products */}
          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-gray-800 mb-6 text-xl font-semibold">En Çok Satan Ürünler (Top 10)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topProductsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="name" type="category" width={150} stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px'
                  }}
                />
                <Bar dataKey="sales" fill="#7fba1f" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Slow Moving Products */}
          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <h3 className="text-gray-800 mb-6 text-xl font-semibold">Yavaş Giden Ürünler</h3>
            <div className="space-y-4">
              {slowMovingProducts.map((product, index) => (
                <div 
                  key={index}
                  className="p-5 bg-red-50 border-2 border-red-100 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-gray-800 font-medium">{product.name}</h4>
                    <span className="px-3 py-1.5 bg-red-200 text-red-700 rounded-full text-sm font-medium">
                      {product.stock} adet
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">Son satış: {product.lastSale}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-800 text-xl font-semibold">Öneri & Uyarı Sistemi</h3>
            <button
              onClick={onNavigateToRecommendations}
              className="px-5 py-2.5 bg-pistachio-500 hover:bg-pistachio-600 text-white rounded-xl transition-colors font-medium"
            >
              Detaylı Öneri Modülü →
            </button>
          </div>
          
          <div className="space-y-4">
            {recommendations.slice(0, 5).map((rec) => (
              <div 
                key={rec.id}
                className="p-6 bg-gray-50 border-2 border-gray-100 rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h4 className="text-gray-800 mb-2 font-medium">{rec.product}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{rec.message}</p>
                  </div>
                  <AlertBadge type={rec.type} />
                </div>
                <p className="text-gray-500 text-sm">Şube: {rec.branch}</p>
              </div>
            ))}

            {recommendations.length === 0 && (
              <p className="text-sm text-gray-500">
                Bu tarih aralığı için öneri bulunamadı.
              </p>
            )}

            {recommendations.length > 5 && (
              <p className="text-xs text-gray-400">
                {recommendations.length - 5} ek öneri daha var · Detaylı Öneri Modülü&apos;nde görüntüleyebilirsiniz.
              </p>
            )}
          </div>
        </div>

        {/* Branch Quick Access */}
        <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
          <h3 className="text-gray-800 mb-6 text-xl font-semibold">Şube Detayları</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branchCards.map((branch) => (
              <button
                key={branch.id}
                onClick={() => onNavigateToBranch?.(String(branch.id))}
                className="p-6 bg-gradient-to-br from-pistachio-50 to-white border-2 border-pistachio-100 rounded-xl hover:shadow-lg hover:border-pistachio-300 transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="bg-pistachio-500 p-3 rounded-xl group-hover:scale-110 transition-transform">
                    <Building2 className="text-white" size={24} />
                  </div>
                  <span className="text-pistachio-600 group-hover:translate-x-1 transition-transform text-xl">
                    →
                  </span>
                </div>
                <h4 className="text-gray-800 mb-3 font-semibold text-lg">{branch.name}</h4>
                <div className="space-y-2">
                  <p className="text-gray-600 text-sm">
                    Stok: ₺{branch.stockValue.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-gray-600 text-sm">
                    Ürün: {branch.products} çeşit
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
