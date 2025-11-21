import React, { useEffect, useMemo, useState } from "react";
import {
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";
import {
    TrendingUp,
    AlertTriangle,
    Store,
    Calendar,
    RefreshCw,
    Database,
    Brain,
    ListOrdered,
    Download,
    Sun,
    Moon,
} from "lucide-react";

/**
 * === Inventory & Recommendation Dashboard ===
 * - Tek dosyalık React bileşeni (default export)
 * - Tailwind ile stiller, Recharts ile grafikler, lucide-react ile ikonlar
 * - Backend endpoint'lerine fetch ile bağlanır (BASE_URL'i düzenleyin)
 */

const BASE_URL = "http://localhost:8080/api/v1";

// --- Types ---

interface IncomeStatementResponse {
    from: string;
    to: string;
    branchId?: number | null;
    revenue: number | string;
    cogs: number | string;
    grossProfit: number | string;
}

interface BestSellerItem {
    productId: number;
    productName: string;
    quantity: number;
}
interface SlowMoverItem {
    productId: number;
    productName: string;
    quantity: number;
}

interface TimeToEmptyItem {
    productId: number;
    productName: string;
    currentStock: number;
    avgDailySales: number | null;
    daysToEmpty: number | null;
}

// Rule-based recommendation DTO
interface RecommendationRuleItem {
    productId: number;
    productName: string;
    branchId: number | null;
    soldQuantity: number;
    currentStock: number;
    avgDailySales: number | null;
    daysToEmpty: number | null;
    expiringSoonQuantity: number;
    recommendation: string;
    explanation: string;
}

// ML DTO
interface MlItem {
    productId: number;
    productName: string;
    branchId: number | null;
    currentStock: number;
    baselineDailySales: number;
    trendDailySales: number | null;
    seasonalFactor: number | null;
    finalPredictedDaily: number | null;
    finalPredictedDemand: number | null;
    expiringSoonQuantity: number;
    recommendation: string;
    riskScore: number;
    explanation: string;
}

interface MlResponse {
    from: string;
    to: string;
    branchId: number | null;
    horizonDays: number;
    rmse: number | null;
    mape: number | null;
    sampleCount: number;
    items: MlItem[];
}

// Master Data & Alerts
interface BranchResponse {
    id: number;
    name: string;
    code?: string;
    address?: string;
}

interface CategoryResponse {
    id: number;
    name: string;
}

interface ProductResponse {
    id: number;
    name: string;
    categoryName?: string;
    sku?: string;
    stock?: number;
}

interface PurchaseResponse {
    id: number;
    branchName?: string;
    supplierName?: string;
    totalCost?: number;
    createdAt: string;
}

interface SaleResponse {
    id: number;
    branchName?: string;
    totalAmount?: number;
    createdAt: string;
}

interface ExpiringBatchResponse {
    batchId: number;
    productName: string;
    branchName?: string;
    branchId?: number;
    expiryDate: string;
    quantity: number;
    daysLeft: number;
}

// Purchase / Sale form tipleri (frontend)
interface PurchaseFormItem {
    productId: string;
    quantity: string;
    unitCost: string;
    expiryDate: string;
}
interface SaleFormItem {
    productId: string;
    quantity: string;
    unitPrice: string;
}

// Helpers
async function getJSON<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}

function fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function recColor(rec: string) {
    switch ((rec || "").toUpperCase()) {
        case "BUY":
            return "bg-emerald-100 text-emerald-700";
        case "PROMOTE":
            return "bg-amber-100 text-amber-700";
        case "TRANSFER_OR_PROMOTE":
            return "bg-indigo-100 text-indigo-700";
        case "AVOID":
            return "bg-rose-100 text-rose-700";
        case "HOLD":
        default:
            return "bg-slate-100 text-slate-700";
    }
}

function RiskBadge({ score }: { score: number }) {
    const pct = Math.round(score * 100);
    let color = "bg-slate-100 text-slate-700";
    if (score >= 0.8) color = "bg-rose-100 text-rose-700";
    else if (score >= 0.6) color = "bg-orange-100 text-orange-700";
    else if (score >= 0.4) color = "bg-amber-100 text-amber-700";
    else color = "bg-emerald-100 text-emerald-700";
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
            Risk {pct}%
        </span>
    );
}

function KpiCard({
    icon: Icon,
    title,
    value,
    subtitle,
}: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
}) {
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

function Tabs({
    tabs,
    active,
    onChange,
}: {
    tabs: string[];
    active: string;
    onChange: (t: string) => void;
}) {
    return (
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            {tabs.map((t) => (
                <button
                    key={t}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${active === t
                            ? "bg-white shadow border border-slate-200"
                            : "text-slate-600"
                        }`}
                    onClick={() => onChange(t)}
                >
                    {t}
                </button>
            ))}
        </div>
    );
}

function SimpleTable<T>({
    columns,
    rows,
    keyField,
}: {
    columns: {
        key: keyof T;
        label: string;
        render?: (v: any, row: T) => React.ReactNode;
    }[];
    rows: T[];
    keyField: keyof T;
}) {
    return (
        <div className="overflow-auto bg-white rounded-2xl border border-slate-100">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                    <tr>
                        {columns.map((c) => (
                            <th
                                key={String(c.key)}
                                className="text-left px-3 py-2 whitespace-nowrap"
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r: any) => (
                        <tr key={String(r[keyField])} className="border-t border-slate-100">
                            {columns.map((c) => (
                                <td key={String(c.key)} className="px-3 py-2 align-top">
                                    {c.render ? c.render(r[c.key], r) : String(r[c.key] ?? "-")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function downloadCsv(
    filename: string,
    headers: string[],
    rows: Array<Array<string | number | null | undefined>>
) {
    const csvRows = [];

    // Header
    csvRows.push(headers.join(","));

    // Rows
    for (const r of rows) {
        csvRows.push(
            r
                .map((v) =>
                    v == null
                        ? ""
                        : typeof v === "string"
                            ? `"${v.replace(/"/g, '""')}"`
                            : v
                )
                .join(",")
        );
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// === Ana Dashboard ===
export default function Dashboard() {
    // Dark mode
    const [darkMode, setDarkMode] = useState(false);

    // Filtreler
    const [from, setFrom] = useState<string>(
        fmt(new Date(new Date().getFullYear(), 0, 1))
    );
    const [to, setTo] = useState<string>(fmt(new Date()));
    const [branchId, setBranchId] = useState<string>(""); // global filter
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState("Overview");
    const [recTab, setRecTab] = useState("Rule-based");

    // Overview / Reports / Recs
    const [income, setIncome] = useState<IncomeStatementResponse | null>(null);
    const [bestsellers, setBestsellers] = useState<BestSellerItem[]>([]);
    const [slowMovers, setSlowMovers] = useState<SlowMoverItem[]>([]);
    const [timeToEmpty, setTimeToEmpty] = useState<TimeToEmptyItem[]>([]);
    const [tteProductId, setTteProductId] = useState<string>("");
    const [loadingTte, setLoadingTte] = useState(false);
    const [invValue, setInvValue] = useState<number | string>("-");
    const [ruleRecs, setRuleRecs] = useState<RecommendationRuleItem[]>([]);
    const [mlRecs, setMlRecs] = useState<MlResponse | null>(null);
    const [expiringSoonCountOverview, setExpiringSoonCountOverview] =
        useState<number>(0); // NEW: overview KPI

    // Master Data
    const [branches, setBranches] = useState<BranchResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [productsTable, setProductsTable] = useState<ProductResponse[]>([]);
    const [purchases, setPurchases] = useState<PurchaseResponse[]>([]);
    const [sales, setSales] = useState<SaleResponse[]>([]);
    const [expiringBatches, setExpiringBatches] = useState<ExpiringBatchResponse[]>(
        []
    );

    const [loadingBranches, setLoadingBranches] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingPurchases, setLoadingPurchases] = useState(false);
    const [loadingSales, setLoadingSales] = useState(false);
    const [loadingExpiring, setLoadingExpiring] = useState(false);

    // Branch View
    const [branchOverviewId, setBranchOverviewId] = useState<string>("");
    const [loadingBranchView, setLoadingBranchView] = useState(false);
    const [branchViewName, setBranchViewName] = useState<string>("");
    const [branchBest, setBranchBest] = useState<BestSellerItem[]>([]);
    const [branchSlow, setBranchSlow] = useState<SlowMoverItem[]>([]);
    const [branchInvValue, setBranchInvValue] = useState<number | string>("-");
    const [branchExpiring, setBranchExpiring] = useState<ExpiringBatchResponse[]>(
        []
    );

    // NEW: Purchase / Sale form state
    const [showPurchaseForm, setShowPurchaseForm] = useState(false);
    const [showSaleForm, setShowSaleForm] = useState(false);

    const [purchaseForm, setPurchaseForm] = useState<{
        branchId: string;
        supplierName: string;
        items: PurchaseFormItem[];
    }>({
        branchId: "",
        supplierName: "",
        items: [
            { productId: "", quantity: "", unitCost: "", expiryDate: "" },
        ],
    });

    const [saleForm, setSaleForm] = useState<{
        branchId: string;
        items: SaleFormItem[];
    }>({
        branchId: "",
        items: [{ productId: "", quantity: "", unitPrice: "" }],
    });

    const [submittingPurchase, setSubmittingPurchase] = useState(false);
    const [submittingSale, setSubmittingSale] = useState(false);

    const b = branchId.trim() === "" ? null : Number(branchId);

    // ==== Ana yükleme ====
    async function loadAll() {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ from, to });
            if (b !== null && !Number.isNaN(b)) qs.append("branchId", String(b));

            const expQs = new URLSearchParams({ withinDays: "30" });
            if (b !== null && !Number.isNaN(b)) expQs.append("branchId", String(b));

            const [inc, bs, sm, inv, ml, exp] = await Promise.all([
                getJSON<IncomeStatementResponse>(
                    `${BASE_URL}/reports/income-statement?${qs.toString()}`
                ),
                getJSON<BestSellerItem[]>(
                    `${BASE_URL}/reports/bestsellers?${qs.toString()}&limit=10`
                ),
                getJSON<SlowMoverItem[]>(
                    `${BASE_URL}/reports/slow-movers?${qs.toString()}&threshold=5`
                ),
                getJSON<number | string>(
                    `${BASE_URL}/reports/inventory-valuation${b !== null ? `?branchId=${b}` : ""
                    }`
                ),
                getJSON<MlResponse>(
                    `${BASE_URL}/recommendations/ml?${qs.toString()}&horizonDays=30`
                ),
                getJSON<ExpiringBatchResponse[]>(
                    `${BASE_URL}/alerts/expiring-batches?${expQs.toString()}`
                ),
            ]);

            setIncome(inc);
            setBestsellers(bs);
            setSlowMovers(sm);
            setInvValue(inv);
            setMlRecs(ml);
            setExpiringSoonCountOverview(exp.length);

            const rr = await getJSON<RecommendationRuleItem[]>(
                `${BASE_URL}/recommendations?${qs.toString()}&tteWindowDays=30&expiryWindowDays=30`
            );
            setRuleRecs(rr);
        } catch (e) {
            console.error(e);
            alert(`Yükleme hatası: ${(e as Error).message}`);
        } finally {
            setLoading(false);
        }
    }

    // ==== Time-to-Empty tekil ====
    async function fetchTte() {
        if (!tteProductId.trim()) return;

        const id = Number(tteProductId);
        if (Number.isNaN(id)) {
            alert("Geçerli bir productId gir.");
            return;
        }

        setLoadingTte(true);
        try {
            const qs = new URLSearchParams({
                productId: String(id),
                windowDays: "30",
            });
            if (b !== null && !Number.isNaN(b)) {
                qs.append("branchId", String(b));
            }

            const res = await getJSON<TimeToEmptyItem & { branchId?: number | null }>(
                `${BASE_URL}/reports/time-to-empty?${qs.toString()}`
            );

            setTimeToEmpty((prev) => {
                const filtered = prev.filter((p) => p.productId !== res.productId);
                return [res, ...filtered];
            });
        } catch (e) {
            console.error(e);
            alert(`TTE yüklenirken hata: ${(e as Error).message}`);
        } finally {
            setLoadingTte(false);
        }
    }

    // ==== Master Data loader’ları ====
    async function loadBranches() {
        setLoadingBranches(true);
        try {
            const data = await getJSON<BranchResponse[]>(`${BASE_URL}/branches`);
            setBranches(data);
        } catch (e) {
            console.error(e);
            alert(`Branches yüklenirken hata: ${(e as Error).message}`);
        } finally {
            setLoadingBranches(false);
        }
    }

    async function loadCategories() {
        setLoadingCategories(true);
        try {
            const data = await getJSON<CategoryResponse[]>(`${BASE_URL}/categories`);
            setCategories(data);
        } catch (e) {
            console.error(e);
            alert(`Categories yüklenirken hata: ${(e as Error).message}`);
        } finally {
            setLoadingCategories(false);
        }
    }

    async function loadProducts() {
        setLoadingProducts(true);
        try {
            const data = await getJSON<ProductResponse[]>(`${BASE_URL}/products`);
            setProductsTable(data);
        } catch (e) {
            console.error(e);
            alert(`Products yüklenirken hata: ${(e as Error).message}`);
        } finally {
            setLoadingProducts(false);
        }
    }

    async function loadPurchases() {
        setLoadingPurchases(true);
        try {
            const data = await getJSON<PurchaseResponse[]>(`${BASE_URL}/purchases`);
            setPurchases(data);
        } catch (e) {
            console.error(e);
            alert(`Purchases yüklenirken hata: ${(e as Error).message}`);
        } finally {
            setLoadingPurchases(false);
        }
    }

    async function loadSales() {
        setLoadingSales(true);
        try {
            const data = await getJSON<SaleResponse[]>(`${BASE_URL}/sales`);
            setSales(data);
        } catch (e) {
            console.error(e);
            alert(`Sales yüklenirken hata: ${(e as Error).message}`);
        } finally {
            setLoadingSales(false);
        }
    }

    async function loadExpiringBatches(globalBranchId?: number | null) {
        setLoadingExpiring(true);
        try {
            const qs = new URLSearchParams({ withinDays: "30" });
            if (globalBranchId != null && !Number.isNaN(globalBranchId)) {
                qs.append("branchId", String(globalBranchId));
            }
            const data = await getJSON<ExpiringBatchResponse[]>(
                `${BASE_URL}/alerts/expiring-batches?${qs.toString()}`
            );
            setExpiringBatches(data);
        } catch (e) {
            console.error(e);
            alert(`Expiring batches yüklenirken hata: ${(e as Error).message}`);
        } finally {
            setLoadingExpiring(false);
        }
    }

    // ==== Branch View loader ====
    async function loadBranchView() {
        if (!branchOverviewId.trim()) return;
        const id = Number(branchOverviewId);
        if (Number.isNaN(id)) {
            alert("Geçerli bir branchId gir.");
            return;
        }

        setLoadingBranchView(true);
        try {
            const qs = new URLSearchParams({ from, to, branchId: String(id) });

            const [bs, sm, inv, exp] = await Promise.all([
                getJSON<BestSellerItem[]>(
                    `${BASE_URL}/reports/bestsellers?${qs.toString()}&limit=10`
                ),
                getJSON<SlowMoverItem[]>(
                    `${BASE_URL}/reports/slow-movers?${qs.toString()}&threshold=5`
                ),
                getJSON<number | string>(
                    `${BASE_URL}/reports/inventory-valuation?branchId=${id}`
                ),
                getJSON<ExpiringBatchResponse[]>(
                    `${BASE_URL}/alerts/expiring-batches?branchId=${id}&withinDays=30`
                ),
            ]);

            setBranchBest(bs);
            setBranchSlow(sm);
            setBranchInvValue(inv);
            setBranchExpiring(exp);

            const br = branches.find((x) => x.id === id);
            setBranchViewName(br?.name ?? `Branch #${id}`);
        } catch (e) {
            console.error(e);
            alert(`Branch view yüklenirken hata: ${(e as Error).message}`);
        } finally {
            setLoadingBranchView(false);
        }
    }

    // ==== Purchase form submit ====
    async function submitPurchaseForm() {
        const branchNum = Number(purchaseForm.branchId);
        if (Number.isNaN(branchNum)) {
            alert("Purchase için geçerli bir branchId gir.");
            return;
        }

        const items = purchaseForm.items
            .filter((i) => i.productId && i.quantity)
            .map((i) => ({
                productId: Number(i.productId),
                quantity: Number(i.quantity),
                unitCost: i.unitCost ? Number(i.unitCost) : null,
                expiryDate: i.expiryDate || null,
            }));

        if (items.length === 0) {
            alert("En az bir item dolu olmalı.");
            return;
        }

        const payload = {
            branchId: branchNum,
            supplierName: purchaseForm.supplierName || null,
            items,
        };

        setSubmittingPurchase(true);
        try {
            const res = await fetch(`${BASE_URL}/purchases`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || res.statusText);
            }
            // success
            await loadPurchases();
            setShowPurchaseForm(false);
            setPurchaseForm({
                branchId: "",
                supplierName: "",
                items: [
                    { productId: "", quantity: "", unitCost: "", expiryDate: "" },
                ],
            });
        } catch (e) {
            console.error(e);
            alert(`Purchase oluşturulurken hata: ${(e as Error).message}`);
        } finally {
            setSubmittingPurchase(false);
        }
    }

    // ==== Sale form submit ====
    async function submitSaleForm() {
        const branchNum = Number(saleForm.branchId);
        if (Number.isNaN(branchNum)) {
            alert("Sale için geçerli bir branchId gir.");
            return;
        }

        const items = saleForm.items
            .filter((i) => i.productId && i.quantity)
            .map((i) => ({
                productId: Number(i.productId),
                quantity: Number(i.quantity),
                unitPrice: i.unitPrice ? Number(i.unitPrice) : null,
            }));

        if (items.length === 0) {
            alert("En az bir item dolu olmalı.");
            return;
        }

        const payload = {
            branchId: branchNum,
            items,
        };

        setSubmittingSale(true);
        try {
            const res = await fetch(`${BASE_URL}/sales`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || res.statusText);
            }
            await loadSales();
            setShowSaleForm(false);
            setSaleForm({
                branchId: "",
                items: [{ productId: "", quantity: "", unitPrice: "" }],
            });
        } catch (e) {
            console.error(e);
            alert(`Sale oluşturulurken hata: ${(e as Error).message}`);
        } finally {
            setSubmittingSale(false);
        }
    }

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const revenue = Number(income?.revenue ?? 0);
    const cogs = Number(income?.cogs ?? 0);
    const gross = Number(income?.grossProfit ?? revenue - cogs);

    const bestChart = useMemo(
        () => bestsellers.map((x) => ({ name: x.productName, qty: x.quantity })),
        [bestsellers]
    );
    const slowChart = useMemo(
        () => slowMovers.map((x) => ({ name: x.productName, qty: x.quantity })),
        [slowMovers]
    );

    const compareData = useMemo(() => {
        const ruleCounts: Record<string, number> = {};
        const mlCounts: Record<string, number> = {};
        const conflicts: {
            productId: number;
            productName: string;
            ruleRecommendation: string;
            mlRecommendation: string;
        }[] = [];

        for (const r of ruleRecs) {
            const key = (r.recommendation || "").toUpperCase();
            ruleCounts[key] = (ruleCounts[key] || 0) + 1;
        }

        const mlItems = mlRecs?.items ?? [];
        for (const m of mlItems) {
            const key = (m.recommendation || "").toUpperCase();
            mlCounts[key] = (mlCounts[key] || 0) + 1;
        }

        const ruleById = new Map<number, RecommendationRuleItem>();
        for (const r of ruleRecs) ruleById.set(r.productId, r);

        for (const m of mlItems) {
            const r = ruleById.get(m.productId);
            if (!r) continue;
            const rr = (r.recommendation || "").toUpperCase();
            const mr = (m.recommendation || "").toUpperCase();
            if (rr !== mr) {
                conflicts.push({
                    productId: m.productId,
                    productName: m.productName,
                    ruleRecommendation: rr,
                    mlRecommendation: mr,
                });
            }
        }

        return { ruleCounts, mlCounts, conflicts };
    }, [ruleRecs, mlRecs]);

    const recTypes = ["BUY", "HOLD", "AVOID", "PROMOTE", "TRANSFER_OR_PROMOTE"];

    const appBg = darkMode ? "bg-slate-900" : "bg-slate-50";
    const textColor = darkMode ? "text-slate-100" : "text-slate-900";
    const headerBg = darkMode
        ? "bg-slate-900/90 border-slate-800"
        : "bg-white/90 border-slate-200";

    return (
        <div className={`min-h-screen ${appBg} ${textColor}`}>
            {/* Header */}
            <header
                className={`sticky top-0 z-10 backdrop-blur border-b ${headerBg}`}
            >
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Database className="w-6 h-6 text-slate-300" />
                        <h1 className="text-lg md:text-xl font-semibold">
                            Inventory & Recommendation Dashboard
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-slate-400 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{from}</span>
                            <span>→</span>
                            <span>{to}</span>
                            <Store className="w-4 h-4 ml-3" />
                            <span>{b === null ? "All Branches" : `Branch #${b}`}</span>
                        </div>
                        <button
                            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-500/40 hover:bg-slate-800/50 transition-colors"
                            onClick={() => setDarkMode((x) => !x)}
                            aria-label="Toggle dark mode"
                        >
                            {darkMode ? (
                                <Sun className="w-5 h-5 text-yellow-300" />
                            ) : (
                                <Moon className="w-5 h-5 text-slate-700" />
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-end">
                    <div className="flex flex-col">
                        <label className="text-xs text-slate-400 mb-1">From</label>
                        <input
                            type="date"
                            className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs text-slate-400 mb-1">To</label>
                        <input
                            type="date"
                            className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs text-slate-400 mb-1">
                            Branch (optional)
                        </label>
                        <input
                            type="number"
                            min={0}
                            placeholder="e.g. 1"
                            className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 w-40"
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={loadAll}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between">
                    <Tabs
                        tabs={[
                            "Overview",
                            "Reports",
                            "Recommendations",
                            "Master Data",
                            "Branch View",
                        ]}
                        active={tab}
                        onChange={setTab}
                    />
                </div>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-6 py-6 space-y-8">
                {/* === OVERVIEW === */}
                {tab === "Overview" && (
                    <>
                        {/* KPI Row */}
                        <div className="grid md:grid-cols-5 gap-4">
                            <KpiCard
                                icon={TrendingUp}
                                title="Revenue"
                                value={revenue.toLocaleString()}
                                subtitle="Selected period"
                            />
                            <KpiCard
                                icon={AlertTriangle}
                                title="COGS"
                                value={cogs.toLocaleString()}
                                subtitle="Cost of Goods Sold"
                            />
                            <KpiCard
                                icon={Brain}
                                title="Gross Profit"
                                value={gross.toLocaleString()}
                                subtitle={gross >= 0 ? "Positive" : "Negative"}
                            />
                            <KpiCard
                                icon={Store}
                                title="Inventory Value"
                                value={
                                    typeof invValue === "number"
                                        ? invValue.toLocaleString()
                                        : String(invValue)
                                }
                                subtitle={b === null ? "All branches" : "Selected branch"}
                            />
                            {/* NEW: Expiring soon KPI */}
                            <KpiCard
                                icon={AlertTriangle}
                                title="Expiring Soon"
                                value={expiringSoonCountOverview}
                                subtitle="Within 30 days"
                            />
                        </div>

                        {/* Charts */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-4 bg-white rounded-2xl border border-slate-100">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <ListOrdered className="w-4 h-4 text-slate-500" />
                                        <h3 className="font-semibold text-slate-800">
                                            Top 10 Bestsellers
                                        </h3>
                                    </div>
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        onClick={() =>
                                            downloadCsv(
                                                "bestsellers.csv",
                                                ["productId", "productName", "quantity"],
                                                bestsellers.map((x) => [
                                                    x.productId,
                                                    x.productName,
                                                    x.quantity,
                                                ])
                                            )
                                        }
                                    >
                                        <Download className="w-3 h-3" /> CSV
                                    </button>
                                </div>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={bestChart}
                                            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="name"
                                                interval={0}
                                                angle={-20}
                                                textAnchor="end"
                                                height={60}
                                            />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="qty" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="p-4 bg-white rounded-2xl border border-slate-100">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-slate-500" />
                                        <h3 className="font-semibold text-slate-800">Slow Movers</h3>
                                    </div>
                                </div>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={slowChart}
                                            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="name"
                                                interval={0}
                                                angle={-20}
                                                textAnchor="end"
                                                height={60}
                                            />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="qty" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* === REPORTS === */}
                {tab === "Reports" && (
                    <div className="grid gap-6">
                        {/* Income Statement */}
                        <section className="bg-white rounded-2xl border border-slate-100 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-800">Income Statement</h3>
                                {income && (
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        onClick={() =>
                                            downloadCsv(
                                                "income-statement.csv",
                                                ["from", "to", "branchId", "revenue", "cogs", "grossProfit"],
                                                [
                                                    [
                                                        income.from,
                                                        income.to,
                                                        income.branchId ?? "",
                                                        income.revenue,
                                                        income.cogs,
                                                        income.grossProfit,
                                                    ],
                                                ]
                                            )
                                        }
                                    >
                                        <Download className="w-3 h-3" /> CSV
                                    </button>
                                )}
                            </div>
                            {income ? (
                                <div className="grid md:grid-cols-3 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl">
                                        <div className="text-xs text-slate-500">Revenue</div>
                                        <div className="text-lg font-semibold text-slate-900">
                                            {Number(income.revenue).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl">
                                        <div className="text-xs text-slate-500">COGS</div>
                                        <div className="text-lg font-semibold text-slate-900">
                                            {Number(income.cogs).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl">
                                        <div className="text-xs text-slate-500">Gross Profit</div>
                                        <div
                                            className={`text-lg font-semibold ${gross >= 0 ? "text-emerald-700" : "text-rose-700"
                                                }`}
                                        >
                                            {gross.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-500 text-sm">No data</div>
                            )}
                        </section>

                        {/* Time to Empty */}
                        <section className="bg-white rounded-2xl border border-slate-100 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-800">
                                    Time to Empty (Per Product)
                                </h3>

                                <div className="flex items-end gap-2">
                                    <div className="flex flex-col">
                                        <label className="text-xs text-slate-500 mb-1">
                                            Product ID
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white w-28"
                                            value={tteProductId}
                                            onChange={(e) => setTteProductId(e.target.value)}
                                            placeholder="e.g. 1"
                                        />
                                    </div>

                                    <button
                                        onClick={fetchTte}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-60"
                                        disabled={loadingTte}
                                    >
                                        <RefreshCw
                                            className={`w-3 h-3 ${loadingTte ? "animate-spin" : ""}`}
                                        />
                                        Fetch
                                    </button>

                                    {timeToEmpty.length > 0 && (
                                        <button
                                            onClick={() => setTimeToEmpty([])}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            <SimpleTable<TimeToEmptyItem>
                                keyField="productId"
                                columns={[
                                    { key: "productName", label: "Product" },
                                    { key: "currentStock", label: "Stock" },
                                    {
                                        key: "avgDailySales",
                                        label: "Avg Daily",
                                        render: (v) => (v == null ? "-" : Number(v).toFixed(2)),
                                    },
                                    {
                                        key: "daysToEmpty",
                                        label: "Days to Empty",
                                        render: (v) => (v == null ? "-" : Number(v).toFixed(1)),
                                    },
                                ]}
                                rows={timeToEmpty}
                            />
                        </section>
                    </div>
                )}

                {/* === RECOMMENDATIONS === */}
                {tab === "Recommendations" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <Tabs
                                tabs={["Rule-based", "ML", "Compare"]}
                                active={recTab}
                                onChange={setRecTab}
                            />
                        </div>

                        {recTab === "Rule-based" && (
                            <section className="bg-white rounded-2xl border border-slate-100 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-slate-500" />
                                        <h3 className="font-semibold text-slate-800">
                                            Rule-based Recommendations
                                        </h3>
                                    </div>
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        onClick={() =>
                                            downloadCsv(
                                                "rule-recommendations.csv",
                                                [
                                                    "productId",
                                                    "productName",
                                                    "soldQuantity",
                                                    "currentStock",
                                                    "avgDailySales",
                                                    "daysToEmpty",
                                                    "expiringSoonQuantity",
                                                    "recommendation",
                                                    "explanation",
                                                ],
                                                ruleRecs.map((r) => [
                                                    r.productId,
                                                    r.productName,
                                                    r.soldQuantity,
                                                    r.currentStock,
                                                    r.avgDailySales ?? "",
                                                    r.daysToEmpty ?? "",
                                                    r.expiringSoonQuantity,
                                                    r.recommendation,
                                                    r.explanation,
                                                ])
                                            )
                                        }
                                    >
                                        <Download className="w-3 h-3" /> CSV
                                    </button>
                                </div>
                                <SimpleTable<RecommendationRuleItem>
                                    keyField="productId"
                                    columns={[
                                        { key: "productName", label: "Product" },
                                        { key: "soldQuantity", label: "Sold" },
                                        { key: "currentStock", label: "Stock" },
                                        {
                                            key: "avgDailySales",
                                            label: "Avg Daily",
                                            render: (v) => (v == null ? "-" : Number(v).toFixed(2)),
                                        },
                                        {
                                            key: "daysToEmpty",
                                            label: "TTE",
                                            render: (v) => (v == null ? "-" : Number(v).toFixed(1)),
                                        },
                                        { key: "expiringSoonQuantity", label: "Expiring" },
                                        {
                                            key: "recommendation",
                                            label: "Recommendation",
                                            render: (v) => (
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${recColor(
                                                        String(v)
                                                    )}`}
                                                >
                                                    {String(v)}
                                                </span>
                                            ),
                                        },
                                        { key: "explanation", label: "Why" },
                                    ]}
                                    rows={ruleRecs}
                                />
                            </section>
                        )}

                        {recTab === "ML" && (
                            <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-slate-500" />
                                        <h3 className="font-semibold text-slate-800">
                                            ML Recommendations
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-500">
                                        {mlRecs ? (
                                            <>
                                                <span>
                                                    RMSE:{" "}
                                                    <b>
                                                        {mlRecs.rmse == null
                                                            ? "-"
                                                            : mlRecs.rmse.toFixed(2)}
                                                    </b>
                                                </span>
                                                <span>
                                                    MAPE:{" "}
                                                    <b>
                                                        {mlRecs.mape == null
                                                            ? "-"
                                                            : (mlRecs.mape * 100).toFixed(1)}
                                                        %
                                                    </b>
                                                </span>
                                                <span>
                                                    Samples: <b>{mlRecs.sampleCount}</b>
                                                </span>
                                                <button
                                                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                    onClick={() =>
                                                        downloadCsv(
                                                            "ml-recommendations.csv",
                                                            [
                                                                "productId",
                                                                "productName",
                                                                "currentStock",
                                                                "finalPredictedDaily",
                                                                "finalPredictedDemand",
                                                                "expiringSoonQuantity",
                                                                "recommendation",
                                                                "riskScore",
                                                                "explanation",
                                                            ],
                                                            (mlRecs.items || []).map((m) => [
                                                                m.productId,
                                                                m.productName,
                                                                m.currentStock,
                                                                m.finalPredictedDaily ?? "",
                                                                m.finalPredictedDemand ?? "",
                                                                m.expiringSoonQuantity,
                                                                m.recommendation,
                                                                m.riskScore,
                                                                m.explanation,
                                                            ])
                                                        )
                                                    }
                                                >
                                                    <Download className="w-3 h-3" /> CSV
                                                </button>
                                            </>
                                        ) : (
                                            <span>No ML metrics</span>
                                        )}
                                    </div>
                                </div>
                                <SimpleTable<MlItem>
                                    keyField="productId"
                                    columns={[
                                        { key: "productName", label: "Product" },
                                        { key: "currentStock", label: "Stock" },
                                        {
                                            key: "finalPredictedDaily",
                                            label: "Pred Daily",
                                            render: (v) => (v == null ? "-" : Number(v).toFixed(2)),
                                        },
                                        {
                                            key: "finalPredictedDemand",
                                            label: "Pred Demand (H)",
                                            render: (v) => (v == null ? "-" : Number(v).toFixed(1)),
                                        },
                                        { key: "expiringSoonQuantity", label: "Expiring" },
                                        {
                                            key: "recommendation",
                                            label: "Recommendation",
                                            render: (v) => (
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${recColor(
                                                        String(v)
                                                    )}`}
                                                >
                                                    {String(v)}
                                                </span>
                                            ),
                                        },
                                        {
                                            key: "riskScore",
                                            label: "Risk",
                                            render: (v) => <RiskBadge score={Number(v)} />,
                                        },
                                        { key: "explanation", label: "Why" },
                                    ]}
                                    rows={mlRecs?.items ?? []}
                                />
                            </section>
                        )}

                        {recTab === "Compare" && (
                            <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-slate-500" />
                                        <h3 className="font-semibold text-slate-800">
                                            Rule vs ML Comparison
                                        </h3>
                                    </div>
                                    <p className="text-xs text-slate-500 max-w-xl">
                                        Bu sekme, aynı ürün için rule-based ve ML tabanlı öneriler
                                        farklıysa bunları gösterir. Raporunda &quot;iki sistem
                                        nerede ayrışıyor?&quot; sorusuna cevap vermek için
                                        kullanabilirsin.
                                    </p>
                                </div>

                                {/* Sayım kartları */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-xl">
                                        <div className="text-xs font-semibold text-slate-600 mb-2">
                                            Rule-based Counts
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {recTypes.map((t) => (
                                                <div
                                                    key={t}
                                                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs flex items-center gap-2"
                                                >
                                                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                                                    <span>{t}</span>
                                                    <span className="font-semibold">
                                                        {compareData.ruleCounts[t] || 0}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-3 bg-slate-50 rounded-xl">
                                        <div className="text-xs font-semibold text-slate-600 mb-2">
                                            ML Counts
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {recTypes.map((t) => (
                                                <div
                                                    key={t}
                                                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs flex items-center gap-2"
                                                >
                                                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                                                    <span>{t}</span>
                                                    <span className="font-semibold">
                                                        {compareData.mlCounts[t] || 0}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Çakışma tablosu */}
                                <div className="flex items-center justify-between mt-4">
                                    <h4 className="font-semibold text-slate-800 text-sm">
                                        Conflicting Recommendations (Rule vs ML)
                                    </h4>
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        onClick={() =>
                                            downloadCsv(
                                                "recommendation-conflicts.csv",
                                                [
                                                    "productId",
                                                    "productName",
                                                    "ruleRecommendation",
                                                    "mlRecommendation",
                                                ],
                                                compareData.conflicts.map((c) => [
                                                    c.productId,
                                                    c.productName,
                                                    c.ruleRecommendation,
                                                    c.mlRecommendation,
                                                ])
                                            )
                                        }
                                    >
                                        <Download className="w-3 h-3" /> CSV
                                    </button>
                                </div>

                                <div className="overflow-auto bg-white rounded-2xl border border-slate-100 mt-2">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                                <th className="text-left px-3 py-2">Product</th>
                                                <th className="text-left px-3 py-2">Rule</th>
                                                <th className="text-left px-3 py-2">ML</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {compareData.conflicts.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={3}
                                                        className="px-3 py-3 text-slate-500 text-sm"
                                                    >
                                                        No conflicts for the selected period.
                                                    </td>
                                                </tr>
                                            )}
                                            {compareData.conflicts.map((c) => (
                                                <tr
                                                    key={c.productId}
                                                    className="border-t border-slate-100"
                                                >
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium text-slate-800">
                                                            {c.productName}
                                                        </div>
                                                        <div className="text-xs text-slate-400">
                                                            ID: {c.productId}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs font-medium ${recColor(
                                                                c.ruleRecommendation
                                                            )}`}
                                                        >
                                                            {c.ruleRecommendation}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs font-medium ${recColor(
                                                                c.mlRecommendation
                                                            )}`}
                                                        >
                                                            {c.mlRecommendation}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* === MASTER DATA === */}
                {tab === "Master Data" && (
                    <div className="space-y-6">
                        {/* Branches */}
                        <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800">Branches</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        onClick={loadBranches}
                                    >
                                        <RefreshCw
                                            className={`w-3 h-3 ${loadingBranches ? "animate-spin" : ""
                                                }`}
                                        />
                                        Load
                                    </button>
                                    {branches.length > 0 && (
                                        <button
                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            onClick={() =>
                                                downloadCsv(
                                                    "branches.csv",
                                                    ["id", "name", "code", "address"],
                                                    branches.map((b) => [
                                                        b.id,
                                                        b.name,
                                                        b.code ?? "",
                                                        b.address ?? "",
                                                    ])
                                                )
                                            }
                                        >
                                            <Download className="w-3 h-3" /> CSV
                                        </button>
                                    )}
                                </div>
                            </div>
                            <SimpleTable<BranchResponse>
                                keyField="id"
                                columns={[
                                    { key: "name", label: "Name" },
                                    { key: "code", label: "Code" },
                                    { key: "address", label: "Address" },
                                ]}
                                rows={branches}
                            />
                        </section>

                        {/* Categories */}
                        <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800">Categories</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        onClick={loadCategories}
                                    >
                                        <RefreshCw
                                            className={`w-3 h-3 ${loadingCategories ? "animate-spin" : ""
                                                }`}
                                        />
                                        Load
                                    </button>
                                    {categories.length > 0 && (
                                        <button
                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            onClick={() =>
                                                downloadCsv(
                                                    "categories.csv",
                                                    ["id", "name"],
                                                    categories.map((c) => [c.id, c.name])
                                                )
                                            }
                                        >
                                            <Download className="w-3 h-3" /> CSV
                                        </button>
                                    )}
                                </div>
                            </div>
                            <SimpleTable<CategoryResponse>
                                keyField="id"
                                columns={[{ key: "name", label: "Name" }]}
                                rows={categories}
                            />
                        </section>

                        {/* Products */}
                        <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800">Products</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        onClick={loadProducts}
                                    >
                                        <RefreshCw
                                            className={`w-3 h-3 ${loadingProducts ? "animate-spin" : ""
                                                }`}
                                        />
                                        Load
                                    </button>
                                    {productsTable.length > 0 && (
                                        <button
                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            onClick={() =>
                                                downloadCsv(
                                                    "products.csv",
                                                    ["id", "name", "category", "sku", "stock"],
                                                    productsTable.map((p) => [
                                                        p.id,
                                                        p.name,
                                                        p.categoryName ?? "",
                                                        p.sku ?? "",
                                                        p.stock ?? "",
                                                    ])
                                                )
                                            }
                                        >
                                            <Download className="w-3 h-3" /> CSV
                                        </button>
                                    )}
                                </div>
                            </div>
                            <SimpleTable<ProductResponse>
                                keyField="id"
                                columns={[
                                    { key: "name", label: "Name" },
                                    { key: "categoryName", label: "Category" },
                                    { key: "sku", label: "SKU" },
                                    { key: "stock", label: "Stock" },
                                ]}
                                rows={productsTable}
                            />
                        </section>

                        {/* Purchases + Create Purchase Form */}
                        <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800">Purchases</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        onClick={loadPurchases}
                                    >
                                        <RefreshCw
                                            className={`w-3 h-3 ${loadingPurchases ? "animate-spin" : ""
                                                }`}
                                        />
                                        Load
                                    </button>
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                                        onClick={() => setShowPurchaseForm((v) => !v)}
                                    >
                                        {showPurchaseForm ? "Close" : "New Purchase"}
                                    </button>
                                    {purchases.length > 0 && (
                                        <button
                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            onClick={() =>
                                                downloadCsv(
                                                    "purchases.csv",
                                                    [
                                                        "id",
                                                        "branchName",
                                                        "supplierName",
                                                        "totalCost",
                                                        "createdAt",
                                                    ],
                                                    purchases.map((p) => [
                                                        p.id,
                                                        p.branchName ?? "",
                                                        p.supplierName ?? "",
                                                        p.totalCost ?? "",
                                                        p.createdAt,
                                                    ])
                                                )
                                            }
                                        >
                                            <Download className="w-3 h-3" /> CSV
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* NEW Purchase Form */}
                            {showPurchaseForm && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                                    <div className="grid md:grid-cols-3 gap-3">
                                        <div className="flex flex-col">
                                            <label className="text-xs text-slate-500 mb-1">
                                                Branch ID
                                            </label>
                                            <input
                                                type="number"
                                                className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                                                value={purchaseForm.branchId}
                                                onChange={(e) =>
                                                    setPurchaseForm((f) => ({
                                                        ...f,
                                                        branchId: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="flex flex-col md:col-span-2">
                                            <label className="text-xs text-slate-500 mb-1">
                                                Supplier Name
                                            </label>
                                            <input
                                                type="text"
                                                className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                                                value={purchaseForm.supplierName}
                                                onChange={(e) =>
                                                    setPurchaseForm((f) => ({
                                                        ...f,
                                                        supplierName: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-600">
                                                Items
                                            </span>
                                            <button
                                                className="text-xs text-slate-600 border border-slate-300 rounded-lg px-2 py-1 hover:bg-slate-100"
                                                onClick={() =>
                                                    setPurchaseForm((f) => ({
                                                        ...f,
                                                        items: [
                                                            ...f.items,
                                                            {
                                                                productId: "",
                                                                quantity: "",
                                                                unitCost: "",
                                                                expiryDate: "",
                                                            },
                                                        ],
                                                    }))
                                                }
                                            >
                                                + Add row
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {purchaseForm.items.map((it, idx) => (
                                                <div
                                                    key={idx}
                                                    className="grid md:grid-cols-4 gap-2 items-end"
                                                >
                                                    <div className="flex flex-col">
                                                        <label className="text-xs text-slate-500 mb-1">
                                                            Product ID
                                                        </label>
                                                        <input
                                                            type="number"
                                                            className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                                                            value={it.productId}
                                                            onChange={(e) =>
                                                                setPurchaseForm((f) => {
                                                                    const items = [...f.items];
                                                                    items[idx] = {
                                                                        ...items[idx],
                                                                        productId: e.target.value,
                                                                    };
                                                                    return { ...f, items };
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="text-xs text-slate-500 mb-1">
                                                            Quantity
                                                        </label>
                                                        <input
                                                            type="number"
                                                            className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                                                            value={it.quantity}
                                                            onChange={(e) =>
                                                                setPurchaseForm((f) => {
                                                                    const items = [...f.items];
                                                                    items[idx] = {
                                                                        ...items[idx],
                                                                        quantity: e.target.value,
                                                                    };
                                                                    return { ...f, items };
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="text-xs text-slate-500 mb-1">
                                                            Unit Cost
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                                                            value={it.unitCost}
                                                            onChange={(e) =>
                                                                setPurchaseForm((f) => {
                                                                    const items = [...f.items];
                                                                    items[idx] = {
                                                                        ...items[idx],
                                                                        unitCost: e.target.value,
                                                                    };
                                                                    return { ...f, items };
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex flex-col md:flex-row md:items-end gap-2">
                                                        <div className="flex-1 flex flex-col">
                                                            <label className="text-xs text-slate-500 mb-1">
                                                                Expiry Date (optional)
                                                            </label>
                                                            <input
                                                                type="date"
                                                                className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                                                                value={it.expiryDate}
                                                                onChange={(e) =>
                                                                    setPurchaseForm((f) => {
                                                                        const items = [...f.items];
                                                                        items[idx] = {
                                                                            ...items[idx],
                                                                            expiryDate: e.target.value,
                                                                        };
                                                                        return { ...f, items };
                                                                    })
                                                                }
                                                            />
                                                        </div>
                                                        {purchaseForm.items.length > 1 && (
                                                            <button
                                                                className="text-xs text-rose-600 border border-rose-200 rounded-lg px-2 py-1 hover:bg-rose-50"
                                                                onClick={() =>
                                                                    setPurchaseForm((f) => ({
                                                                        ...f,
                                                                        items: f.items.filter((_, i) => i !== idx),
                                                                    }))
                                                                }
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <button
                                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                                            onClick={() => setShowPurchaseForm(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                                            onClick={submitPurchaseForm}
                                            disabled={submittingPurchase}
                                        >
                                            {submittingPurchase ? "Saving..." : "Save Purchase"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <SimpleTable<PurchaseResponse>
                                keyField="id"
                                columns={[
                                    { key: "branchName", label: "Branch" },
                                    { key: "supplierName", label: "Supplier" },
                                    {
                                        key: "totalCost",
                                        label: "Total Cost",
                                        render: (v) =>
                                            v == null ? "-" : Number(v).toLocaleString(),
                                    },
                                    { key: "createdAt", label: "Date" },
                                ]}
                                rows={purchases}
                            />
                        </section>

                        {/* Sales + Create Sale Form */}
                        <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800">Sales</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        onClick={loadSales}
                                    >
                                        <RefreshCw
                                            className={`w-3 h-3 ${loadingSales ? "animate-spin" : ""
                                                }`}
                                        />
                                        Load
                                    </button>
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                                        onClick={() => setShowSaleForm((v) => !v)}
                                    >
                                        {showSaleForm ? "Close" : "New Sale"}
                                    </button>
                                    {sales.length > 0 && (
                                        <button
                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            onClick={() =>
                                                downloadCsv(
                                                    "sales.csv",
                                                    ["id", "branchName", "totalAmount", "createdAt"],
                                                    sales.map((s) => [
                                                        s.id,
                                                        s.branchName ?? "",
                                                        s.totalAmount ?? "",
                                                        s.createdAt,
                                                    ])
                                                )
                                            }
                                        >
                                            <Download className="w-3 h-3" /> CSV
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* NEW Sale Form */}
                            {showSaleForm && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                                    <div className="grid md:grid-cols-3 gap-3">
                                        <div className="flex flex-col">
                                            <label className="text-xs text-slate-500 mb-1">
                                                Branch ID
                                            </label>
                                            <input
                                                type="number"
                                                className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                                                value={saleForm.branchId}
                                                onChange={(e) =>
                                                    setSaleForm((f) => ({
                                                        ...f,
                                                        branchId: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-600">
                                                Items
                                            </span>
                                            <button
                                                className="text-xs text-slate-600 border border-slate-300 rounded-lg px-2 py-1 hover:bg-slate-100"
                                                onClick={() =>
                                                    setSaleForm((f) => ({
                                                        ...f,
                                                        items: [
                                                            ...f.items,
                                                            { productId: "", quantity: "", unitPrice: "" },
                                                        ],
                                                    }))
                                                }
                                            >
                                                + Add row
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {saleForm.items.map((it, idx) => (
                                                <div
                                                    key={idx}
                                                    className="grid md:grid-cols-4 gap-2 items-end"
                                                >
                                                    <div className="flex flex-col">
                                                        <label className="text-xs text-slate-500 mb-1">
                                                            Product ID
                                                        </label>
                                                        <input
                                                            type="number"
                                                            className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                                                            value={it.productId}
                                                            onChange={(e) =>
                                                                setSaleForm((f) => {
                                                                    const items = [...f.items];
                                                                    items[idx] = {
                                                                        ...items[idx],
                                                                        productId: e.target.value,
                                                                    };
                                                                    return { ...f, items };
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="text-xs text-slate-500 mb-1">
                                                            Quantity
                                                        </label>
                                                        <input
                                                            type="number"
                                                            className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                                                            value={it.quantity}
                                                            onChange={(e) =>
                                                                setSaleForm((f) => {
                                                                    const items = [...f.items];
                                                                    items[idx] = {
                                                                        ...items[idx],
                                                                        quantity: e.target.value,
                                                                    };
                                                                    return { ...f, items };
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="text-xs text-slate-500 mb-1">
                                                            Unit Price
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                                                            value={it.unitPrice}
                                                            onChange={(e) =>
                                                                setSaleForm((f) => {
                                                                    const items = [...f.items];
                                                                    items[idx] = {
                                                                        ...items[idx],
                                                                        unitPrice: e.target.value,
                                                                    };
                                                                    return { ...f, items };
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex flex-col md:flex-row md:items-end gap-2">
                                                        <div className="flex-1" />
                                                        {saleForm.items.length > 1 && (
                                                            <button
                                                                className="text-xs text-rose-600 border border-rose-200 rounded-lg px-2 py-1 hover:bg-rose-50"
                                                                onClick={() =>
                                                                    setSaleForm((f) => ({
                                                                        ...f,
                                                                        items: f.items.filter((_, i) => i !== idx),
                                                                    }))
                                                                }
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <button
                                            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                                            onClick={() => setShowSaleForm(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                                            onClick={submitSaleForm}
                                            disabled={submittingSale}
                                        >
                                            {submittingSale ? "Saving..." : "Save Sale"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <SimpleTable<SaleResponse>
                                keyField="id"
                                columns={[
                                    { key: "branchName", label: "Branch" },
                                    {
                                        key: "totalAmount",
                                        label: "Total Amount",
                                        render: (v) =>
                                            v == null ? "-" : Number(v).toLocaleString(),
                                    },
                                    { key: "createdAt", label: "Date" },
                                ]}
                                rows={sales}
                            />
                        </section>

                        {/* Expiring Batches */}
                        <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800">
                                    Expiring Batches (within 30 days)
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        onClick={() => loadExpiringBatches(b)}
                                    >
                                        <RefreshCw
                                            className={`w-3 h-3 ${loadingExpiring ? "animate-spin" : ""
                                                }`}
                                        />
                                        Load
                                    </button>
                                    {expiringBatches.length > 0 && (
                                        <button
                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            onClick={() =>
                                                downloadCsv(
                                                    "expiring-batches.csv",
                                                    [
                                                        "batchId",
                                                        "productName",
                                                        "branchName",
                                                        "expiryDate",
                                                        "quantity",
                                                        "daysLeft",
                                                    ],
                                                    expiringBatches.map((e) => [
                                                        e.batchId,
                                                        e.productName,
                                                        e.branchName ?? "",
                                                        e.expiryDate,
                                                        e.quantity,
                                                        e.daysLeft,
                                                    ])
                                                )
                                            }
                                        >
                                            <Download className="w-3 h-3" /> CSV
                                        </button>
                                    )}
                                </div>
                            </div>
                            <SimpleTable<ExpiringBatchResponse>
                                keyField="batchId"
                                columns={[
                                    { key: "productName", label: "Product" },
                                    { key: "branchName", label: "Branch" },
                                    { key: "expiryDate", label: "Expiry Date" },
                                    { key: "quantity", label: "Qty" },
                                    {
                                        key: "daysLeft",
                                        label: "Days Left",
                                        render: (v) => `${v} days`,
                                    },
                                ]}
                                rows={expiringBatches}
                            />
                        </section>
                    </div>
                )}

                {/* === BRANCH VIEW === */}
                {tab === "Branch View" && (
                    <div className="space-y-6">
                        <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-slate-800">
                                        Branch Product Overview
                                    </h3>
                                    <p className="text-xs text-slate-500 max-w-xl">
                                        Belirli bir şube için en çok satanlar, yavaş ürünler,
                                        envanter değeri ve SKT yaklaşan stokları görürsün. Bu sayfa
                                        tam olarak &quot;her şube için ürün fotoğrafı&quot;
                                        (overview) vermek için tasarlandı.
                                    </p>
                                </div>

                                <div className="flex items-end gap-2">
                                    <div className="flex flex-col">
                                        <label className="text-xs text-slate-500 mb-1">
                                            Branch ID
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min={1}
                                                className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white w-24"
                                                value={branchOverviewId}
                                                onChange={(e) => setBranchOverviewId(e.target.value)}
                                                placeholder="e.g. 1"
                                            />
                                            {branches.length > 0 && (
                                                <select
                                                    className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                                                    value={branchOverviewId}
                                                    onChange={(e) => setBranchOverviewId(e.target.value)}
                                                >
                                                    <option value="">Select branch...</option>
                                                    {branches.map((br) => (
                                                        <option key={br.id} value={br.id}>
                                                            #{br.id} - {br.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={loadBranchView}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-60"
                                        disabled={loadingBranchView || !branchOverviewId.trim()}
                                    >
                                        <RefreshCw
                                            className={`w-3 h-3 ${loadingBranchView ? "animate-spin" : ""
                                                }`}
                                        />
                                        Load
                                    </button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mt-4">
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <div className="text-xs text-slate-500">Branch</div>
                                    <div className="text-lg font-semibold text-slate-900">
                                        {branchViewName || "—"}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <div className="text-xs text-slate-500">Inventory Value</div>
                                    <div className="text-lg font-semibold text-slate-900">
                                        {typeof branchInvValue === "number"
                                            ? branchInvValue.toLocaleString()
                                            : String(branchInvValue)}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <div className="text-xs text-slate-500">
                                        Expiring Batches (30 days)
                                    </div>
                                    <div className="text-lg font-semibold text-slate-900">
                                        {branchExpiring.length}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="grid md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-slate-800">
                                        Branch Bestsellers
                                    </h4>
                                    {branchBest.length > 0 && (
                                        <button
                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            onClick={() =>
                                                downloadCsv(
                                                    "branch-bestsellers.csv",
                                                    ["productId", "productName", "quantity"],
                                                    branchBest.map((x) => [
                                                        x.productId,
                                                        x.productName,
                                                        x.quantity,
                                                    ])
                                                )
                                            }
                                        >
                                            <Download className="w-3 h-3" /> CSV
                                        </button>
                                    )}
                                </div>
                                <SimpleTable<BestSellerItem>
                                    keyField="productId"
                                    columns={[
                                        { key: "productName", label: "Product" },
                                        { key: "quantity", label: "Qty" },
                                    ]}
                                    rows={branchBest}
                                />
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-slate-800">
                                        Branch Slow Movers
                                    </h4>
                                    {branchSlow.length > 0 && (
                                        <button
                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                            onClick={() =>
                                                downloadCsv(
                                                    "branch-slow-movers.csv",
                                                    ["productId", "productName", "quantity"],
                                                    branchSlow.map((x) => [
                                                        x.productId,
                                                        x.productName,
                                                        x.quantity,
                                                    ])
                                                )
                                            }
                                        >
                                            <Download className="w-3 h-3" /> CSV
                                        </button>
                                    )}
                                </div>
                                <SimpleTable<SlowMoverItem>
                                    keyField="productId"
                                    columns={[
                                        { key: "productName", label: "Product" },
                                        { key: "quantity", label: "Qty" },
                                    ]}
                                    rows={branchSlow}
                                />
                            </div>
                        </section>

                        <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-slate-800">
                                    Branch Expiring Batches (30 days)
                                </h4>
                                {branchExpiring.length > 0 && (
                                    <button
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        onClick={() =>
                                            downloadCsv(
                                                "branch-expiring-batches.csv",
                                                [
                                                    "batchId",
                                                    "productName",
                                                    "branchName",
                                                    "expiryDate",
                                                    "quantity",
                                                    "daysLeft",
                                                ],
                                                branchExpiring.map((e) => [
                                                    e.batchId,
                                                    e.productName,
                                                    e.branchName ?? "",
                                                    e.expiryDate,
                                                    e.quantity,
                                                    e.daysLeft,
                                                ])
                                            )
                                        }
                                    >
                                        <Download className="w-3 h-3" /> CSV
                                    </button>
                                )}
                            </div>
                            <SimpleTable<ExpiringBatchResponse>
                                keyField="batchId"
                                columns={[
                                    { key: "productName", label: "Product" },
                                    { key: "branchName", label: "Branch" },
                                    { key: "expiryDate", label: "Expiry Date" },
                                    { key: "quantity", label: "Qty" },
                                    {
                                        key: "daysLeft",
                                        label: "Days Left",
                                        render: (v) => `${v} days`,
                                    },
                                ]}


                                rows={branchExpiring}
                            />
                        </section>
                    </div>
                )}
            </main>

            <footer className="max-w-7xl mx-auto px-6 py-8 text-xs text-slate-500">
                v1 • Data source: {BASE_URL}
            </footer>
        </div>
    );
}
