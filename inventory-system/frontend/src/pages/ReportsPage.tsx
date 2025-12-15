import { useEffect, useMemo, useState } from "react";
import { AdminHeader } from "../components/AdminHeader";
import {
  Calendar,
  Building2,
  TrendingUp,
  Package,
  DollarSign,
  Download,
  FileText,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API_BASE_URL = "http://localhost:8080/api/v1";

// ===================== TYPES =====================

interface BranchOption {
  id: number;
  name: string;
}

interface IncomeStatementResponse {
  from: string;
  to: string;
  branchId: number | null;
  revenue: string;      // BigDecimal toString
  cogs: string;
  grossProfit: string;
}

interface SalesTrendPointResponse {
  date: string;         // "2025-11-05"
  revenue: number;
  cogs: number;
  grossProfit: number;
}

interface CategorySalesResponse {
  categoryId: number;
  categoryName: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number | null;
}

interface ProductMarginResponse {
  productId: number;
  productName: string;
  sku: string;
  revenue: number;
  cogs: number;
  profit: number;
  marginPercent: number | null;
}

interface ProductProfitRow {
  product: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

const COLORS = ["#7fba1f", "#3b82f6", "#f59e0b", "#ef4444"];

// ===================== COMPONENT =====================

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("2025-11-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const [income, setIncome] = useState<IncomeStatementResponse | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendPointResponse[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySalesResponse[]>([]);
  const [productMargins, setProductMargins] = useState<ProductMarginResponse[]>([]);
  const [inventoryValue, setInventoryValue] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===================== BRANCHES FETCH =====================

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/branches`);
        if (!res.ok) throw new Error("Şubeler yüklenemedi");
        const data = await res.json(); // Branch[]
        const options: BranchOption[] = data.map((b: any) => ({
          id: b.id,
          name: b.name,
        }));
        setBranches(options);
      } catch (e) {
        console.error(e);
      }
    };

    fetchBranches();
  }, []);

  // ===================== REPORTS FETCH =====================

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          from: startDate,
          to: endDate,
        });

        if (selectedBranchId !== null) {
          params.append("branchId", selectedBranchId.toString());
        }

        const incomeUrl = `${API_BASE_URL}/reports/income-statement?${params.toString()}`;
        const salesTrendUrl = `${API_BASE_URL}/reports/sales-trend?${params.toString()}`;
        const categorySalesUrl = `${API_BASE_URL}/reports/category-sales?${params.toString()}`;
        const productMarginsUrl = `${API_BASE_URL}/reports/product-margins?${params.toString()}&limit=50`;
        const inventoryUrl = `${API_BASE_URL}/reports/inventory-valuation${
          selectedBranchId !== null ? `?branchId=${selectedBranchId}` : ""
        }`;

        const [incomeRes, salesRes, catRes, prodRes, invRes] = await Promise.all([
          fetch(incomeUrl),
          fetch(salesTrendUrl),
          fetch(categorySalesUrl),
          fetch(productMarginsUrl),
          fetch(inventoryUrl),
        ]);

        if (!incomeRes.ok) throw new Error("Gelir tablosu yüklenemedi");
        if (!salesRes.ok) throw new Error("Satış trendi yüklenemedi");
        if (!catRes.ok) throw new Error("Kategori satışları yüklenemedi");
        if (!prodRes.ok) throw new Error("Ürün kâr marjları yüklenemedi");
        if (!invRes.ok) throw new Error("Envanter değeri yüklenemedi");

        const incomeJson: IncomeStatementResponse = await incomeRes.json();
        const salesJson: SalesTrendPointResponse[] = await salesRes.json();
        const catJson: CategorySalesResponse[] = await catRes.json();
        const prodJson: ProductMarginResponse[] = await prodRes.json();
        const invJson = await invRes.json();

        setIncome(incomeJson);
        setSalesTrend(salesJson || []);
        setCategorySales(catJson || []);
        setProductMargins(prodJson || []);
        setInventoryValue(
          typeof invJson === "number" ? invJson : Number(invJson)
        );
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Bilinmeyen hata");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [startDate, endDate, selectedBranchId]);

  // ===================== DERIVED VALUES =====================

  // Ürün bazlı kâr marjı tablosu
  const productProfitData: ProductProfitRow[] = useMemo(() => {
    if (!productMargins || productMargins.length === 0) {
      return [];
    }
    return productMargins.map((p) => ({
      product: p.productName,
      revenue: Number(p.revenue),
      cost: Number(p.cogs),
      profit: Number(p.profit),
      margin: p.marginPercent ?? 0,
    }));
  }, [productMargins]);

    const bottom3Products = useMemo(() => {
    if (!productProfitData || productProfitData.length === 0) return [];
    const sorted = [...productProfitData].sort((a, b) => a.margin - b.margin);
    return sorted.slice(0, 3);
  }, [productProfitData]);


  // Ürün datasından toplamlar
  const derivedTotals = useMemo(() => {
    if (!productProfitData || productProfitData.length === 0) {
      return { revenue: 0, cost: 0, gross: 0, margin: 0 };
    }

    let revenue = 0;
    let cost = 0;

    for (const p of productProfitData) {
      revenue += p.revenue || 0;
      cost += p.cost || 0;
    }

    const gross = revenue - cost;
    const margin = revenue > 0 ? (gross / revenue) * 100 : 0;

    return { revenue, cost, gross, margin };
  }, [productProfitData]);

  // Income statement datası
  const incomeRevenue = income ? Number(income.revenue) : 0;
  const incomeCost = income ? Number(income.cogs) : 0;
  const incomeGross = income ? Number(income.grossProfit) : 0;

  const hasIncomeData =
    income &&
    !Number.isNaN(incomeRevenue) &&
    (incomeRevenue > 0 || incomeCost > 0 || incomeGross > 0);

  const totalRevenue = hasIncomeData ? incomeRevenue : derivedTotals.revenue;
  const totalCost = hasIncomeData ? incomeCost : derivedTotals.cost;
  const grossProfit = hasIncomeData ? incomeGross : derivedTotals.gross;
  const profitMargin =
    totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  // Satış + envanter grafik datası
  const salesTrendData = useMemo(() => {
    if (!salesTrend || salesTrend.length === 0) {
      return [];
    }
    return salesTrend.map((p) => ({
      date: new Date(p.date).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
      }),
      sales: Number(p.revenue),
      inventory: inventoryValue ?? 0,
    }));
  }, [salesTrend, inventoryValue]);

  // Kategori pie datası
  const categorySalesData = useMemo(() => {
    if (!categorySales || categorySales.length === 0) {
      return [];
    }
    const total = categorySales.reduce(
      (sum, c) => sum + Number(c.revenue),
      0
    );
    if (total === 0) return [];

    return categorySales.map((c) => {
      const value = Number(c.revenue);
      const percentage = Number(((value / total) * 100).toFixed(1));
      return {
        name: c.categoryName,
        value,
        percentage,
      };
    });
  }, [categorySales]);

  const handleCSVDownload = () => {
    const headers = ["Ürün Adı", "Gelir (₺)", "Maliyet (₺)", "Kar (₺)", "Kar Marjı (%)"];
    const rows = productProfitData.map((item) => [
      item.product,
      item.revenue,
      item.cost,
      item.profit,
      item.margin.toFixed(1),
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `kar-marji-raporu-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ===================== RENDER =====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-pistachio-50 via-white to-gray-50">
      <AdminHeader />

      <div className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border-2 border-gray-100">
          <div className="flex items-center gap-3">
            <FileText className="text-pistachio-600" size={32} />
            <div>
              <h2 className="text-pistachio-700">Raporlar</h2>
              <p className="text-gray-500">
                Zaman bazlı analitik raporlar ve grafikler
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border-2 border-gray-100">
          <h3 className="text-gray-800 mb-4">Filtreler</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-600 mb-3 font-medium">Başlangıç Tarihi</label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 mb-3 font-medium">Bitiş Tarihi</label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 mb-3 font-medium">Şube</label>
              <div className="relative">
                <Building2
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <select
                  value={selectedBranchId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedBranchId(val === "" ? null : Number(val));
                  }}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors appearance-none"
                >
                  <option value="">Tüm Şubeler</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Income Statement Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border-2 border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="text-pistachio-600" size={24} />
            <h3 className="text-gray-800">
              Gelir Tablosu Özeti{" "}
              {loading && (
                <span className="text-sm text-gray-400">(yükleniyor...)</span>
              )}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-blue-50 border-2 border-blue-100 rounded-xl">
              <p className="text-gray-600 mb-2">Toplam Gelir</p>
              <h3 className="text-blue-700">
                ₺{totalRevenue.toLocaleString("tr-TR")}
              </h3>
            </div>
            <div className="p-5 bg-orange-50 border-2 border-orange-100 rounded-xl">
              <p className="text-gray-600 mb-2">Toplam Maliyet (COGS)</p>
              <h3 className="text-orange-700">
                ₺{totalCost.toLocaleString("tr-TR")}
              </h3>
            </div>
            <div className="p-5 bg-green-50 border-2 border-green-100 rounded-xl">
              <p className="text-gray-600 mb-2">Brüt Kar</p>
              <h3 className="text-green-700">
                ₺{grossProfit.toLocaleString("tr-TR")}
              </h3>
            </div>
            <div className="p-5 bg-pistachio-50 border-2 border-pistachio-100 rounded-xl">
              <p className="text-gray-600 mb-2">Kar Marjı</p>
              <h3 className="text-pistachio-700">%{profitMargin}</h3>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sales Trend Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="text-pistachio-600" size={24} />
              <h3 className="text-gray-800">Satış Trendi</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "2px solid #e5e7eb",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#7fba1f"
                  strokeWidth={3}
                  name="Satış (₺)"
                  dot={{ fill: "#7fba1f", r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Inventory Value Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <Package className="text-blue-600" size={24} />
              <h3 className="text-gray-800">Envanter Değer Trendi</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "2px solid #e5e7eb",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="inventory"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Envanter (₺)"
                  dot={{ fill: "#3b82f6", r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Sales Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border-2 border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="text-orange-600" size={24} />
            <h3 className="text-gray-800">Kategori Bazlı Satış Dağılımı</h3>
          </div>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySalesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} %${percentage}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categorySalesData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "2px solid #e5e7eb",
                    borderRadius: "12px",
                  }}
                  formatter={(value: number) =>
                    `₺${value.toLocaleString("tr-TR")}`
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-4">
              {categorySalesData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index] }}
                  ></div>
                  <div>
                    <p className="text-gray-700">{item.name}</p>
                    <p className="text-gray-500">
                      ₺{item.value.toLocaleString("tr-TR")}
                    </p>
                  </div>
                </div>
              ))}
              {categorySalesData.length === 0 && (
                <p className="text-gray-400 text-sm">
                  Bu tarih aralığında kategori bazlı satış verisi bulunamadı.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Product Profit Margin Analysis */}
        <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-green-600" size={24} />
              <h3 className="text-gray-800">Ürün Bazlı Kar Marjı Analizi</h3>
            </div>
            <button
              onClick={handleCSVDownload}
              className="inline-flex items-center gap-2 px-5 py-3 bg-pistachio-500 hover:bg-pistachio-600 text-white rounded-xl transition-colors shadow-md hover:shadow-lg"
              disabled={productProfitData.length === 0}
            >
              <Download size={20} />
              CSV İndir
            </button>
          </div>

          {/* Top 3 Most Profitable */}
          <div className="mb-6">
            <h4 className="text-gray-700 mb-3">En Kârlı Ürünler (Top 3)</h4>
            {productProfitData.length === 0 ? (
              <p className="text-gray-400 text-sm">
                Bu tarih aralığında ürün bazlı veri bulunamadı.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {productProfitData.slice(0, 3).map((product, index) => (
                  <div
                    key={product.product}
                    className="p-4 bg-green-50 border-2 border-green-100 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white">
                        {index + 1}
                      </span>
                      <span className="px-3 py-1 bg-green-200 text-green-700 rounded-full">
                        %{product.margin.toFixed(1)}
                      </span>
                    </div>
                    <h5 className="text-gray-800 mb-2">{product.product}</h5>
                    <p className="text-gray-600">
                      Kar: ₺{product.profit.toLocaleString("tr-TR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

                    {/* Bottom 3 Least Profitable */}
          <div className="mb-6">
            <h4 className="text-gray-700 mb-3">En Az Kârlı Ürünler (Bottom 3)</h4>
            {bottom3Products.length === 0 ? (
              <p className="text-gray-400 text-sm">
                Bu tarih aralığında ürün bazlı veri bulunamadı.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bottom3Products.map((product, index) => (
                  <div
                    key={product.product}
                    className="p-4 bg-red-50 border-2 border-red-100 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white">
                        {index + 1}
                      </span>
                      <span className="px-3 py-1 bg-red-200 text-red-700 rounded-full">
                        %{product.margin.toFixed(1)}
                      </span>
                    </div>
                    <h5 className="text-gray-800 mb-2">{product.product}</h5>
                    <p className="text-gray-600">
                      Kar: ₺{product.profit.toLocaleString("tr-TR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Full Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-4 px-5 text-gray-600 font-semibold">Ürün Adı</th>
                  <th className="text-right py-4 px-5 text-gray-600 font-semibold">Gelir (₺)</th>
                  <th className="text-right py-4 px-5 text-gray-600 font-semibold">Maliyet (₺)</th>
                  <th className="text-right py-4 px-5 text-gray-600 font-semibold">Kar (₺)</th>
                  <th className="text-right py-4 px-5 text-gray-600 font-semibold">
                    Kar Marjı (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {productProfitData.map((item, index) => {
                  const isHighMargin = item.margin >= 30;
                  const isLowMargin = item.margin < 20;

                  return (
                    <tr
                      key={index}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        isHighMargin
                          ? "bg-green-50/30"
                          : isLowMargin
                          ? "bg-red-50/30"
                          : ""
                      }`}
                    >
                      <td className="py-5 px-5 text-gray-800 font-medium">{item.product}</td>
                      <td className="py-5 px-5 text-right text-gray-700 font-medium">
                        ₺{item.revenue.toLocaleString("tr-TR")}
                      </td>
                      <td className="py-5 px-5 text-right text-gray-700 font-medium">
                        ₺{item.cost.toLocaleString("tr-TR")}
                      </td>
                      <td className="py-5 px-5 text-right text-gray-700 font-medium">
                        ₺{item.profit.toLocaleString("tr-TR")}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`px-3 py-1 rounded-full ${
                            isHighMargin
                              ? "bg-green-100 text-green-700"
                              : isLowMargin
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          %{item.margin.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {productProfitData.length === 0 && (
                  <tr>
                    <td
                      className="py-4 px-4 text-gray-400 text-sm"
                      colSpan={5}
                    >
                      Bu tarih aralığında ürün bazlı satış verisi yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
