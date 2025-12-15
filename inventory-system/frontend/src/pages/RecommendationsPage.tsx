import { useEffect, useMemo, useState } from "react";
import { AdminHeader } from "../components/AdminHeader";
import { RecommendationBadge } from "../components/RecommendationBadge";
import {
  Lightbulb,
  TrendingUp,
  Brain,
  GitCompare,
  AlertCircle,
  CheckCircle,
  Info,
  Building2,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8080/api/v1";

type BadgeType = "BUY" | "PROMOTE" | "HOLD" | "AVOID";
type TabType = "rule-based" | "ml-based" | "comparison";

interface Branch {
  id: number;
  name: string;
  city?: string;
}

interface RuleBasedRec {
  productId: number;
  productName: string;
  branchId: number | null;
  soldQuantity: number;            // Son 30 gün satış
  currentStock: number;            // Mevcut stok
  avgDailySales: number | null;    // Ortalama günlük satış
  daysToEmpty: number | null;      // Tahmini tükenme (gün)
  expiringSoonQuantity: number;    // SKT penceresindeki adet
  recommendation: BadgeType;       // Badge için
  rawRecommendation: string | null;
  explanation: string;
}

interface MlRecommendationItem {
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
  recommendation: BadgeType;
  rawRecommendation: string | null;
  riskScore: number;
  explanation: string;
}

interface MlRecommendationResponse {
  from: string;
  to: string;
  branchId: number | null;
  horizonDays: number;
  rmse: number | null;
  mape: number | null;
  sampleCount: number;
  items: any[];
}

interface MlMetrics {
  rmse: number | null;
  mape: number | null;
  sampleCount: number;
  horizonDays: number;
}

/** Backend string kodunu badge tipine map’liyoruz (TRANSFER, WATCH vs. için) */
function mapToBadgeType(code: string | null | undefined): BadgeType {
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

export default function RecommendationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("rule-based");

  // Şube seçimi
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | "all">(
    "all"
  );

  // Kural tabanlı state
  const [ruleBasedRecs, setRuleBasedRecs] = useState<RuleBasedRec[]>([]);
  const [ruleLoading, setRuleLoading] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);

  // ML state
  const [mlRecs, setMlRecs] = useState<MlRecommendationItem[]>([]);
  const [mlMetrics, setMlMetrics] = useState<MlMetrics | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);

  // Karşılaştırma için seçilen ürün
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Son 30 gün tarih aralığı
  const { from, to } = useMemo(() => {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - 30);
    const fromStr = fromDate.toISOString().slice(0, 10);
    return { from: fromStr, to: toStr };
  }, []);

  /** === ŞUBELERİ ÇEK === */
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranchesLoading(true);
        setBranchesError(null);

        const res = await fetch(
          `${API_BASE_URL}/branches?page=0&size=100&sort=name,asc`
        );

        if (!res.ok) {
          const body = await res.text();
          console.error("Branches error:", body);
          throw new Error(`Şubeler yüklenemedi (HTTP ${res.status})`);
        }

        const raw = await res.json();
        const items: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.content)
          ? raw.content
          : [];

        const mapped: Branch[] = items.map((b: any) => ({
          id: b.id,
          name: b.name ?? b.branchName ?? `Şube #${b.id}`,
          city: b.city,
        }));

        setBranches(mapped);
      } catch (err: any) {
        console.error("Branches fetch hata:", err);
        setBranchesError(
          err?.message || "Şubeler yüklenirken bir hata oluştu."
        );
      } finally {
        setBranchesLoading(false);
      }
    };

    fetchBranches();
  }, []);

  /** === KURAL TABANLI ÖNERİLERİ ÇEK === */
  useEffect(() => {
    const fetchRuleBased = async () => {
      try {
        setRuleLoading(true);
        setRuleError(null);

        const params = new URLSearchParams({
          from,
          to,
          tteWindowDays: "30",
          expiryWindowDays: "30",
        });

        if (selectedBranchId !== "all") {
          params.append("branchId", String(selectedBranchId));
        }

        const res = await fetch(
          `${API_BASE_URL}/recommendations?${params.toString()}`
        );

        if (!res.ok) {
          const body = await res.text();
          console.error("Rule-based error:", body);
          throw new Error(
            `Kural tabanlı öneriler yüklenemedi (HTTP ${res.status})`
          );
        }

        const raw = await res.json();
        const items: any[] = Array.isArray(raw) ? raw : raw.items ?? [];

        const mapped: RuleBasedRec[] = items.map((it: any) => {
          const rawCode: string | null = it.recommendation ?? null;
          return {
            productId: it.productId,
            productName: it.productName ?? "Bilinmeyen Ürün",
            branchId: it.branchId ?? null,
            soldQuantity: it.soldQuantity ?? 0,
            currentStock: it.currentStock ?? 0,
            avgDailySales:
              typeof it.avgDailySales === "number" ? it.avgDailySales : null,
            daysToEmpty:
              typeof it.daysToEmpty === "number" ? it.daysToEmpty : null,
            expiringSoonQuantity: it.expiringSoonQuantity ?? 0,
            recommendation: mapToBadgeType(rawCode),
            rawRecommendation: rawCode,
            explanation: it.explanation ?? "",
          };
        });

        setRuleBasedRecs(mapped);

        if (!selectedProduct && mapped.length > 0) {
          setSelectedProduct(mapped[0].productName);
        }
      } catch (err: any) {
        console.error("Rule-based fetch hata:", err);
        setRuleError(
          err?.message || "Kural tabanlı öneriler yüklenirken hata oluştu."
        );
      } finally {
        setRuleLoading(false);
      }
    };

    fetchRuleBased();
  }, [from, to, selectedBranchId]);

  /** === ML ÖNERİLERİ ÇEK === */
  useEffect(() => {
    const fetchMl = async () => {
      try {
        setMlLoading(true);
        setMlError(null);

        const params = new URLSearchParams({
          from,
          to,
          horizonDays: "30",
        });

        if (selectedBranchId !== "all") {
          params.append("branchId", String(selectedBranchId));
        }

        const res = await fetch(
          `${API_BASE_URL}/recommendations/ml?${params.toString()}`
        );

        if (!res.ok) {
          const body = await res.text();
          console.error("ML error:", body);
          throw new Error(
            `ML tabanlı öneriler yüklenemedi (HTTP ${res.status})`
          );
        }

        const raw: MlRecommendationResponse = await res.json();

        setMlMetrics({
          rmse: raw.rmse ?? null,
          mape: raw.mape ?? null,
          sampleCount: raw.sampleCount ?? 0,
          horizonDays: raw.horizonDays ?? 30,
        });

        const items: any[] = Array.isArray(raw.items) ? raw.items : [];

        const mapped: MlRecommendationItem[] = items.map((it: any) => {
          const rawCode: string | null = it.recommendation ?? null;
          return {
            productId: it.productId,
            productName: it.productName ?? "Bilinmeyen Ürün",
            branchId: it.branchId ?? null,
            currentStock: it.currentStock ?? 0,
            baselineDailySales: it.baselineDailySales ?? 0,
            trendDailySales:
              typeof it.trendDailySales === "number"
                ? it.trendDailySales
                : null,
            seasonalFactor:
              typeof it.seasonalFactor === "number" ? it.seasonalFactor : null,
            finalPredictedDaily:
              typeof it.finalPredictedDaily === "number"
                ? it.finalPredictedDaily
                : null,
            finalPredictedDemand:
              typeof it.finalPredictedDemand === "number"
                ? it.finalPredictedDemand
                : null,
            expiringSoonQuantity: it.expiringSoonQuantity ?? 0,
            recommendation: mapToBadgeType(rawCode),
            rawRecommendation: rawCode,
            riskScore: it.riskScore ?? 0,
            explanation: it.explanation ?? "",
          };
        });

        setMlRecs(mapped);

        if (!selectedProduct && mapped.length > 0) {
          setSelectedProduct(mapped[0].productName);
        }
      } catch (err: any) {
        console.error("ML fetch hata:", err);
        setMlError(
          err?.message || "ML tabanlı öneriler yüklenirken hata oluştu."
        );
      } finally {
        setMlLoading(false);
      }
    };

    fetchMl();
  }, [from, to, selectedBranchId, selectedProduct]);

  const effectiveSelectedProduct =
    selectedProduct ??
    ruleBasedRecs[0]?.productName ??
    mlRecs[0]?.productName ??
    "";

  const selectedRuleRec = ruleBasedRecs.find(
    (r) => r.productName === effectiveSelectedProduct
  );
  const selectedMLRec = mlRecs.find(
    (r) => r.productName === effectiveSelectedProduct
  );

  const selectedBranchLabel =
    selectedBranchId === "all"
      ? "Tüm Şubeler"
      : branches.find((b) => b.id === selectedBranchId)?.name ??
        `Şube #${selectedBranchId}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pistachio-50 via-white to-gray-50">
      <AdminHeader />

      <div className="container mx-auto px-6 py-8">
        {/* Header + Branch selector */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border-2 border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Lightbulb className="text-pistachio-600" size={32} />
              <div>
                <h2 className="text-pistachio-700">Öneri Modülü</h2>
                <p className="text-gray-500">
                  Kural Tabanlı vs ML Tabanlı Stok Önerileri
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Dönem: {from} → {to}
                </p>
              </div>
            </div>

            <div className="w-full lg:w-80">
              <label className="block text-gray-600 mb-1 text-sm flex items-center gap-2">
                <Building2 size={16} className="text-pistachio-600" />
                Şube Seçimi
              </label>
              <select
                value={
                  selectedBranchId === "all"
                    ? "all"
                    : String(selectedBranchId)
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "all") setSelectedBranchId("all");
                  else setSelectedBranchId(Number(v));
                }}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 bg-white text-sm"
              >
                <option value="all">Tüm Şubeler</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.city ? ` (${b.city})` : ""}
                  </option>
                ))}
              </select>
              {branchesLoading && (
                <p className="text-xs text-gray-400 mt-1">
                  Şubeler yükleniyor...
                </p>
              )}
              {branchesError && (
                <p className="text-xs text-red-500 mt-1">{branchesError}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                Şu an: <span className="font-medium">{selectedBranchLabel}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl p-2 shadow-md mb-6 border-2 border-gray-100">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("rule-based")}
              className={`flex-1 min-w-[200px] px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === "rule-based"
                  ? "bg-pistachio-500 text-white shadow-lg"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <TrendingUp size={20} />
              <span>Kural Tabanlı</span>
            </button>
            <button
              onClick={() => setActiveTab("ml-based")}
              className={`flex-1 min-w-[200px] px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === "ml-based"
                  ? "bg-pistachio-500 text-white shadow-lg"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Brain size={20} />
              <span>ML Tabanlı</span>
            </button>
            <button
              onClick={() => setActiveTab("comparison")}
              className={`flex-1 min-w-[200px] px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === "comparison"
                  ? "bg-pistachio-500 text-white shadow-lg"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <GitCompare size={20} />
              <span>Karşılaştırma</span>
            </button>
          </div>
        </div>

        {/* === KURAL TABANI === */}
        {activeTab === "rule-based" && (
          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="text-pistachio-600" size={24} />
              <h3 className="text-gray-800">
                Kural Tabanlı Öneriler ({selectedBranchLabel})
              </h3>
            </div>

            {ruleError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-700">
                {ruleError}
              </div>
            )}

            <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info
                  className="text-blue-600 flex-shrink-0 mt-1"
                  size={20}
                />
                <div>
                  <h4 className="text-blue-800 mb-1">Kural Tabanlı Yaklaşım</h4>
                  <p className="text-blue-700">
                    Stok seviyesi, son 30 gün satış hızı ve SKT pencerelerine
                    göre deterministik kurallarla öneriler üretilir.
                  </p>
                </div>
              </div>
            </div>

            {ruleLoading && ruleBasedRecs.length === 0 ? (
              <p className="text-gray-500">Öneriler yükleniyor...</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-100">
                        <th className="text-left py-4 px-5 text-gray-600 font-semibold">
                          Ürün Adı
                        </th>
                        <th className="text-right py-4 px-5 text-gray-600 font-semibold">
                          Mevcut Stok
                        </th>
                        <th className="text-right py-4 px-5 text-gray-600 font-semibold">
                          Son 30 Gün Satış
                        </th>
                        <th className="text-right py-4 px-5 text-gray-600 font-semibold">
                          Tahmini Tükenme (gün)
                        </th>
                        <th className="text-right py-4 px-5 text-gray-600 font-semibold">
                          SKT Penceresi (adet)
                        </th>
                        <th className="text-center py-4 px-5 text-gray-600 font-semibold">
                          Öneri
                        </th>
                        <th className="text-left py-4 px-5 text-gray-600 font-semibold">
                          Gerekçe
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ruleBasedRecs.map((rec, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedProduct(rec.productName)}
                        >
                          <td className="py-5 px-5 text-gray-800 font-medium">
                            {rec.productName}
                          </td>
                          <td className="py-5 px-5 text-right text-gray-700 font-medium">
                            {rec.currentStock}
                          </td>
                          <td className="py-5 px-5 text-right text-gray-700 font-medium">
                            {rec.soldQuantity}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {rec.daysToEmpty != null ? (
                              <span
                                className={`px-3 py-1 rounded-full ${
                                  rec.daysToEmpty <= 7
                                    ? "bg-red-100 text-red-700"
                                    : rec.daysToEmpty <= 14
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {rec.daysToEmpty.toFixed(1)} gün
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right text-gray-700">
                            {rec.expiringSoonQuantity}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <RecommendationBadge type={rec.recommendation} />
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            {rec.explanation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ruleBasedRecs.length === 0 && !ruleLoading && !ruleError && (
                    <p className="py-6 text-center text-gray-500">
                      Gösterilecek öneri bulunamadı.
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t-2 border-gray-100">
                  <h4 className="text-gray-700 mb-3">Öneri Açıklamaları:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="flex items-center gap-2">
                      <RecommendationBadge type="BUY" size="sm" />
                      <span className="text-gray-600">
                        Sipariş ver (stok kritik)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RecommendationBadge type="PROMOTE" size="sm" />
                      <span className="text-gray-600">
                        Promosyon yap (SKT/Stok fazla)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RecommendationBadge type="HOLD" size="sm" />
                      <span className="text-gray-600">
                        İzle (dengeli durum)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RecommendationBadge type="AVOID" size="sm" />
                      <span className="text-gray-600">
                        Alım yapma (fire riski)
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* === ML TABANI === */}
        {activeTab === "ml-based" && (
          <div>
            {/* Metrikler */}
            <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border-2 border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="text-purple-600" size={24} />
                <h3 className="text-gray-800">
                  Model Performans Metrikleri ({selectedBranchLabel})
                </h3>
              </div>

              {mlError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-700">
                  {mlError}
                </div>
              )}

              {mlMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-purple-50 border-2 border-purple-100 rounded-xl text-center">
                    <p className="text-gray-600 mb-1">RMSE</p>
                    <h4 className="text-purple-700">
                      {mlMetrics.rmse ?? "-"}
                    </h4>
                  </div>
                  <div className="p-4 bg-purple-50 border-2 border-purple-100 rounded-xl text-center">
                    <p className="text-gray-600 mb-1">MAPE</p>
                    <h4 className="text-purple-700">
                      {mlMetrics.mape != null ? `${mlMetrics.mape}%` : "-"}
                    </h4>
                  </div>
                  <div className="p-4 bg-purple-50 border-2 border-purple-100 rounded-xl text-center">
                    <p className="text-gray-600 mb-1">Örnek Sayısı</p>
                    <h4 className="text-purple-700">
                      {mlMetrics.sampleCount.toLocaleString()}
                    </h4>
                  </div>
                  <div className="p-4 bg-purple-50 border-2 border-purple-100 rounded-xl text-center">
                    <p className="text-gray-600 mb-1">Horizon</p>
                    <h4 className="text-purple-700">
                      {mlMetrics.horizonDays} gün
                    </h4>
                  </div>
                </div>
              ) : mlLoading ? (
                <p className="text-gray-500">ML metrikleri yükleniyor...</p>
              ) : (
                <p className="text-gray-500">
                  ML metrikleri bulunamadı (response boş geldi).
                </p>
              )}
            </div>

            {/* ML öneriler tablosu */}
            <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Brain className="text-purple-600" size={24} />
                <h3 className="text-gray-800">
                  ML Tabanlı Öneriler ({selectedBranchLabel})
                </h3>
              </div>

              {mlLoading && mlRecs.length === 0 ? (
                <p className="text-gray-500">ML önerileri yükleniyor...</p>
              ) : (
                <>
                  <div className="bg-purple-50 border-2 border-purple-100 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Info
                        className="text-purple-600 flex-shrink-0 mt-1"
                        size={20}
                      />
                      <div>
                        <h4 className="text-purple-800 mb-1">
                          Makine Öğrenmesi Yaklaşımı
                        </h4>
                        <p className="text-purple-700">
                          LSTM ve benzeri zaman serisi modelleriyle 30 günlük
                          talep tahmini yapılır. Risk skoru, tahmin belirsizliği
                          ve stok seviyesi kombinasyonu ile öneriler üretilir.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-100">
                          <th className="text-left py-4 px-5 text-gray-600 font-semibold">
                            Ürün Adı
                          </th>
                          <th className="text-right py-4 px-5 text-gray-600 font-semibold">
                            Mevcut Stok
                          </th>
                          <th className="text-right py-4 px-5 text-gray-600 font-semibold">
                            Tahmin Günlük Satış
                          </th>
                          <th className="text-right py-4 px-5 text-gray-600 font-semibold">
                            Toplam Talep (30g)
                          </th>
                          <th className="text-center py-4 px-5 text-gray-600 font-semibold">
                            Risk Skoru
                          </th>
                          <th className="text-center py-4 px-5 text-gray-600 font-semibold">
                            Öneri
                          </th>
                          <th className="text-left py-4 px-5 text-gray-600 font-semibold">
                            ML Açıklama
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mlRecs.map((rec, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => setSelectedProduct(rec.productName)}
                          >
                            <td className="py-5 px-5 text-gray-800 font-medium">
                              {rec.productName}
                            </td>
                            <td className="py-5 px-5 text-right text-gray-700 font-medium">
                              {rec.currentStock}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-700">
                              {rec.finalPredictedDaily != null
                                ? rec.finalPredictedDaily.toFixed(1)
                                : "-"}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-700">
                              {rec.finalPredictedDemand != null
                                ? rec.finalPredictedDemand.toFixed(0)
                                : "-"}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span
                                className={`px-3 py-1 rounded-full ${
                                  rec.riskScore >= 0.7
                                    ? "bg-red-100 text-red-700"
                                    : rec.riskScore >= 0.4
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {rec.riskScore.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <RecommendationBadge
                                type={rec.recommendation}
                              />
                            </td>
                            <td className="py-4 px-4 text-gray-600">
                              {rec.explanation}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {mlRecs.length === 0 && !mlLoading && !mlError && (
                      <p className="py-6 text-center text-gray-500">
                        Gösterilecek ML önerisi bulunamadı.
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t-2 border-gray-100">
                    <h4 className="text-gray-700 mb-3">
                      Risk Skoru Açıklaması:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                          0.0 - 0.4
                        </span>
                        <span className="text-gray-600">
                          Düşük Risk (Stok yeterli)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
                          0.4 - 0.7
                        </span>
                        <span className="text-gray-600">
                          Orta Risk (İzleme gerekli)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full">
                          0.7 - 1.0
                        </span>
                        <span className="text-gray-600">
                          Yüksek Risk (Acil aksiyon)
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* === KARŞILAŞTIRMA === */}
        {activeTab === "comparison" && ruleBasedRecs.length > 0 && (
          <div>
            {/* Ürün seçici */}
            <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border-2 border-gray-100">
              <label className="block text-gray-700 mb-3 font-medium">
                Karşılaştırılacak Ürünü Seçin:
              </label>
              <select
                value={effectiveSelectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
              >
                {ruleBasedRecs.map((rec) => (
                  <option key={rec.productId} value={rec.productName}>
                    {rec.productName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kural tabanlı kart */}
              <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-pistachio-200">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="text-pistachio-600" size={24} />
                  <h3 className="text-gray-800">
                    Kural Tabanlı Yaklaşım ({selectedBranchLabel})
                  </h3>
                </div>

                {selectedRuleRec ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-pistachio-50 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-gray-800">Öneri:</h4>
                        <RecommendationBadge
                          type={selectedRuleRec.recommendation}
                          size="lg"
                        />
                      </div>
                      <p className="text-gray-700 mb-4">
                        {selectedRuleRec.explanation}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 mb-1">Mevcut Stok</p>
                        <p className="text-gray-800">
                          {selectedRuleRec.currentStock} adet
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 mb-1">Son 30g Satış</p>
                        <p className="text-gray-800">
                          {selectedRuleRec.soldQuantity} adet
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 mb-1">Tahmini Tükenme</p>
                        <p className="text-gray-800">
                          {selectedRuleRec.daysToEmpty != null
                            ? `${selectedRuleRec.daysToEmpty.toFixed(1)} gün`
                            : "-"}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 mb-1">
                          SKT Penceresi (adet)
                        </p>
                        <p className="text-gray-800">
                          {selectedRuleRec.expiringSoonQuantity}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertCircle
                          className="text-blue-600 flex-shrink-0 mt-1"
                          size={18}
                        />
                        <div>
                          <h5 className="text-blue-800 mb-1">Metodoloji</h5>
                          <p className="text-blue-700">
                            Ortalama satış hızı, stok seviyesi ve SKT
                            pencereleri kullanılarak deterministik kurallarla
                            karar üretilir.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    Bu ürün için kural tabanlı kayıt bulunamadı.
                  </p>
                )}
              </div>

              {/* ML kartı */}
              <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-6">
                  <Brain className="text-purple-600" size={24} />
                  <h3 className="text-gray-800">
                    ML Tabanlı Yaklaşım ({selectedBranchLabel})
                  </h3>
                </div>

                {selectedMLRec ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-gray-800">Öneri:</h4>
                        <RecommendationBadge
                          type={selectedMLRec.recommendation}
                          size="lg"
                        />
                      </div>
                      <p className="text-gray-700 mb-4">
                        {selectedMLRec.explanation}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 mb-1">Mevcut Stok</p>
                        <p className="text-gray-800">
                          {selectedMLRec.currentStock} adet
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 mb-1">Tahmin Günlük</p>
                        <p className="text-gray-800">
                          {selectedMLRec.finalPredictedDaily != null
                            ? `${selectedMLRec.finalPredictedDaily.toFixed(
                                1
                              )} adet`
                            : "-"}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 mb-1">
                          Toplam Talep (30g)
                        </p>
                        <p className="text-gray-800">
                          {selectedMLRec.finalPredictedDemand != null
                            ? `${selectedMLRec.finalPredictedDemand.toFixed(
                                0
                              )} adet`
                            : "-"}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 mb-1">Risk Skoru</p>
                        <p className="text-gray-800">
                          {selectedMLRec.riskScore.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50 border-2 border-purple-100 rounded-xl">
                      <div className="flex items-start gap-2">
                        <CheckCircle
                          className="text-purple-600 flex-shrink-0 mt-1"
                          size={18}
                        />
                        <div>
                          <h5 className="text-purple-800 mb-1">Metodoloji</h5>
                          <p className="text-purple-700">
                            Geçmiş satış verileriyle zaman serisi analizi,
                            trend ve sezonsallık kullanılarak risk skorları
                            hesaplanır.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    Bu ürün için ML tabanlı kayıt bulunamadı.
                  </p>
                )}
              </div>
            </div>

            {/* Öneri Uyumu */}
            {selectedRuleRec && selectedMLRec && (
              <div className="bg-white rounded-2xl p-6 shadow-md mt-6 border-2 border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <GitCompare className="text-gray-700" size={24} />
                  <h3 className="text-gray-800">Karşılaştırma Analizi</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-gray-700 mb-3">Öneri Uyumu</h4>
                    {selectedRuleRec.recommendation ===
                    selectedMLRec.recommendation ? (
                      <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-start gap-3">
                        <CheckCircle
                          className="text-green-600 flex-shrink-0 mt-1"
                          size={20}
                        />
                        <div>
                          <h5 className="text-green-800 mb-1">
                            Öneriler Uyumlu ✓
                          </h5>
                          <p className="text-green-700">
                            Her iki yaklaşım da{" "}
                            <strong>
                              {selectedRuleRec.recommendation}
                            </strong>{" "}
                            öneriyor. Güçlü sinyal.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-start gap-3">
                        <AlertCircle
                          className="text-orange-600 flex-shrink-0 mt-1"
                          size={20}
                        />
                        <div>
                          <h5 className="text-orange-800 mb-1">
                            Öneriler Farklı ⚠️
                          </h5>
                          <p className="text-orange-700">
                            Kural tabanlı:{" "}
                            <strong>
                              {selectedRuleRec.recommendation}
                            </strong>{" "}
                            | ML tabanlı:{" "}
                            <strong>{selectedMLRec.recommendation}</strong>
                            <br />
                            ML modeli daha karmaşık pattern’leri dikkate alıyor
                            olabilir.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-gray-700 mb-3">
                      Yaklaşım Farklılıkları
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h5 className="text-gray-800 mb-1">Kural Tabanlı</h5>
                        <p className="text-gray-600">
                          ✓ Şeffaf ve açıklanabilir
                          <br />
                          ✓ Hızlı hesaplama
                          <br />
                          ✗ Trend ve sezonsallığı sınırlı kullanır
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h5 className="text-gray-800 mb-1">ML Tabanlı</h5>
                        <p className="text-gray-600">
                          ✓ Tarihsel pattern analizi
                          <br />
                          ✓ Mevsimsellik & belirsizlik
                          <br />
                          ✗ Black-box, açıklaması daha zordur
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
