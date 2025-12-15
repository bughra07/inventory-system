import { useEffect, useState } from "react";
import { AdminHeader } from "../components/AdminHeader";
import { BranchInfoCard } from "../components/BranchInfoCard";
import {
  Building2,
  Package,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8080/api/v1";

interface BranchDetailPageProps {
  branchId: string;
}

interface BranchFromApi {
  id: number;
  name: string;
  address?: string;
  phone?: string;
}

// En çok satanlar
interface ProductStats {
  productName: string;
  totalSales: number;
  totalValue: number | null;
}

// Yavaş gidenler
interface SlowMoverProduct {
  productId?: number;
  productName: string;
  lastSaleDaysAgo: number | null;
}



// KPI kartları için özet stok
interface InventoryStats {
  totalValue: number;
  totalItems?: number;
  productCount?: number;
}

// Şubedeki ürün listesi
// Şubedeki ürün listesi
interface BranchProduct {
  id: number;
  name: string;
  sku: string;
  stock: number;
  price: number;
  categoryName?: string; // ✅ yeni alan
}


// SKT yaklaşan batch'ler
interface ExpiringBatch {
  id: number;
  productId: number;
  productName: string;
  productSku?: string; // barkod/SKU
  branchId: number;
  branchName: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
}

export default function BranchDetailPage({ branchId }: BranchDetailPageProps) {
  const [branch, setBranch] = useState<BranchFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
  const [slowProducts, setSlowProducts] = useState<SlowMoverProduct[]>([]);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(
    null
  );

  const [branchProducts, setBranchProducts] = useState<BranchProduct[]>([]);
  const [branchProductsLoading, setBranchProductsLoading] = useState(false);
  const [branchProductsError, setBranchProductsError] = useState<
    string | null
  >(null);

  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
  const [expiringLoading, setExpiringLoading] = useState(false);
  const [expiringError, setExpiringError] = useState<string | null>(null);

  // ==== Şube bilgisi ====
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/branches/${branchId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Branch fetch failed");
        return res.json();
      })
      .then((data: BranchFromApi) => setBranch(data))
      .catch(() => setError("Şube bilgisi yüklenemedi"))
      .finally(() => setLoading(false));
  }, [branchId]);

  // ==== Raporlar: en çok satanlar, yavaş gidenler, stok değeri ====
  useEffect(() => {
    // En çok satanlar
    fetch(
      `${API_BASE_URL}/reports/bestsellers?from=2025-01-01&to=2025-12-31&limit=10&branchId=${branchId}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("bestsellers failed");
        return res.json();
      })
      .then((data: any) => {
        let raw = data;
        if (Array.isArray(raw) && Array.isArray(raw[0])) {
          raw = raw[0];
        }

        const mapped: ProductStats[] = (raw as any[]).map((item: any) => ({
          productName: item.productName ?? "Bilinmeyen Ürün",
          totalSales: item.totalQuantity ?? item.totalSales ?? 0,
          totalValue: item.totalValue ?? null,
        }));

        setTopProducts(mapped);
      })
      .catch(() => setTopProducts([]));

    // Yavaş gidenler
    // TÜM YILI KAPSASIN (demo için ideal)
      // Yavaş giden ürünler
      fetch(
        `${API_BASE_URL}/reports/slow-movers?from=2025-01-01&to=2025-12-31&threshold=60&branchId=${branchId}`
      )
        .then((res) => {
          if (!res.ok) throw new Error("slow-movers failed");
          return res.json();
        })
        .then((data: any) => {
          let raw = data;
          if (Array.isArray(raw) && Array.isArray(raw[0])) {
            raw = raw[0];
          }

          const mapped: SlowMoverProduct[] = raw.map((item: any) => ({
              productId: item.productId,
              productName: item.productName ?? "Bilinmeyen Ürün",
              lastSaleDaysAgo: item.daysSinceLastSale ?? null,
            }));



          setSlowProducts(mapped);
        })
        .catch(() => {
          setSlowProducts([]);
        });
    
      const getStockForSlowProduct = (p: SlowMoverProduct) => {
        const found = branchProducts.find(
          (bp) => bp.id === p.productId || bp.name === p.productName
        );
        return found?.stock ?? null;
      };

      
    

    const getDaysAgoLabel = (days: number | null | undefined) => {
      if (days === null || days === undefined) return "Satış yok";
      if (days === 0) return "Bugün";
      return `${days} gün önce`;
    };
    

    // Sadece stok değeri (totalValue) – diğerleri ürün listesinden
    fetch(`${API_BASE_URL}/reports/inventory-valuation?branchId=${branchId}`)
      .then((res) => {
        if (!res.ok) throw new Error("valuation failed");
        return res.json();
      })
      .then((data: any) => {
        const value = Array.isArray(data) ? data[0] : data;
        setInventoryStats((prev) => ({
          totalValue: typeof value === "number" ? value : 0,
          totalItems: prev?.totalItems ?? 0,
          productCount: prev?.productCount ?? 0,
        }));
      })
      .catch(() => {
        setInventoryStats((prev) =>
          prev ?? { totalValue: 0, totalItems: 0, productCount: 0 }
        );
      });
  }, [branchId]);

  // ==== Şubedeki ürünler (tablo + ürün sayısı + toplam stok) ====
  useEffect(() => {
    const fetchBranchProducts = async () => {
      try {
        setBranchProductsLoading(true);
        setBranchProductsError(null);

        const res = await fetch(
          `${API_BASE_URL}/products?branchId=${branchId}&page=0&size=200&sort=name,asc`
        );

        if (!res.ok) {
          throw new Error(`Ürünler yüklenemedi (HTTP ${res.status})`);
        }

        const raw = await res.json();

        const items: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any).content)
          ? (raw as any).content
          : [];

        const mapped: BranchProduct[] = items.map((item: any) => ({
          id: item.id,
          name: item.name ?? "İsimsiz Ürün",
          sku: item.sku ?? "-",
          stock: item.stock ?? 0,
          price: item.price ?? 0,
          categoryName: item.categoryName ?? "-",   // ✅ kategori
        }));


        setBranchProducts(mapped);

        const totalItems = mapped.reduce((sum, p) => sum + (p.stock ?? 0), 0);
        const productCount = mapped.length;

        setInventoryStats((prev) =>
          prev
            ? { ...prev, totalItems, productCount }
            : { totalValue: 0, totalItems, productCount }
        );
      } catch (err: any) {
        console.error("Branch products fetch error:", err);
        setBranchProductsError(
          err?.message || "Şube ürünleri yüklenirken hata oluştu"
        );
        setBranchProducts([]);
      } finally {
        setBranchProductsLoading(false);
      }
    };

    fetchBranchProducts();
  }, [branchId]);

  // ==== SKT yaklaşan ürünler (alerts/expiring + barkod için ürün detayı) ====
  useEffect(() => {
    const fetchExpiring = async () => {
      try {
        setExpiringLoading(true);
        setExpiringError(null);

        const res = await fetch(
          `${API_BASE_URL}/alerts/expiring?withinDays=30&branchId=${branchId}`
        );

        if (!res.ok) {
          throw new Error(`SKT uyarıları yüklenemedi (HTTP ${res.status})`);
        }

        const raw = await res.json();
        const items: any[] = Array.isArray(raw) ? raw : [];

        const baseBatches: ExpiringBatch[] = items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          branchId: item.branchId,
          branchName: item.branchName,
          expiryDate: item.expiryDate,
          quantity: item.quantity ?? 0,
          unitCost: item.unitCost ?? 0,
        }));

        // SKU / barkod bilgisini ürün detayından çek
        const enriched = await Promise.all(
          baseBatches.map(async (b) => {
            try {
              const pRes = await fetch(
                `${API_BASE_URL}/products/${b.productId}`
              );
              if (!pRes.ok) return b;
              const product = await pRes.json();
              return {
                ...b,
                productSku:
                  product.sku ??
                  product.barcode ??
                  product.code ??
                  undefined,
              };
            } catch {
              return b;
            }
          })
        );

        setExpiringBatches(enriched);
      } catch (err: any) {
        console.error("Expiring batches fetch error:", err);
        setExpiringError(
          err?.message || "SKT yaklaşan ürünler yüklenirken hata oluştu"
        );
        setExpiringBatches([]);
      } finally {
        setExpiringLoading(false);
      }
    };

    fetchExpiring();
  }, [branchId]);
   
  const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "-";
  return `₺${value.toLocaleString("tr-TR")}`;
};


  const getDaysAgoLabel = (days: number | null) => {
  if (days === null || days === undefined) return "Satış yok";
  return `${days} gün önce`;
};

  const getStockForSlowProduct = (p: SlowMoverProduct) => {
  const found = branchProducts.find(
    (bp) => bp.id === p.productId || bp.name === p.productName
  );
  return found?.stock ?? 0;
};



  const formatDate = (isoDate: string | null | undefined) => {
    if (!isoDate) return "-";
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("tr-TR");
  };

  const calculateDaysLeft = (isoDate: string | null | undefined): number | null => {
    if (!isoDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return null;
    const diffMs = d.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const getDaysLeftClass = (days: number | null) => {
    if (days == null) return "text-gray-700";
    if (days <= 5) return "text-red-600 font-semibold";
    if (days <= 10) return "text-amber-500 font-semibold";
    return "text-green-600 font-semibold";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pistachio-50 via-white to-gray-50">
        <AdminHeader title="Şube Detayı" />
        <div className="container mx-auto px-6 py-8">
          <p className="text-gray-500">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pistachio-50 via-white to-gray-50">
        <AdminHeader title="Şube Detayı" />
        <div className="container mx-auto px-6 py-8">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pistachio-50 via-white to-gray-50">
      <AdminHeader title="Şube Detayı" />

      <div className="container mx-auto px-6 py-8">
        {/* Şube Kartı */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border-2 border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="text-pistachio-600" size={32} />
            <div>
              <h2 className="text-pistachio-700">
                {branch?.name || "Şube Detayı"}
              </h2>
              <p className="text-gray-500 text-sm">
                Şube ID: {branch?.id || branchId}
              </p>
              {(branch?.address || branch?.phone) && (
                <p className="text-gray-400 text-sm mt-1">
                  {branch?.address && <span>{branch.address}</span>}
                  {branch?.address && branch?.phone && <span> • </span>}
                  {branch?.phone && <span>{branch.phone}</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Üst KPI kartları – Kadıköy tasarımı */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <BranchInfoCard
            title="Stok Değeri"
            value={
              inventoryStats?.totalValue != null
                ? `₺${inventoryStats.totalValue.toLocaleString("tr-TR")}`
                : "-"
            }
            icon={Package}
            color="pistachio"
          />
          <BranchInfoCard
            title="Ürün Çeşidi"
            value={
              inventoryStats?.productCount != null
                ? `${inventoryStats.productCount} Adet`
                : "0 Adet"
            }
            icon={ShoppingBag}
            color="blue"
          />
          <BranchInfoCard
            title="SKT Uyarısı"
            value={
              expiringBatches.length > 0
                ? `${expiringBatches.length} Parti`
                : "0 Parti"
            }
            icon={AlertTriangle}
            color="orange"
          />
          <BranchInfoCard
            title="Aktif Stok"
            value={
              inventoryStats?.totalItems != null
                ? `${inventoryStats.totalItems} Adet`
                : "0 Adet"
            }
            icon={Package}
            color="pistachio"
          />
        </div>

        {/* En çok satanlar & Yavaş gidenler */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* En Çok Satan Ürünler */}
          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="text-green-600" size={24} />
              <h3 className="text-gray-800 text-xl font-semibold">En Çok Satan Ürünler</h3>
            </div>
            {topProducts.length === 0 ? (
              <p className="text-gray-400 text-sm">
                Bu dönem için en çok satan ürün verisi bulunamadı.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">#</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">
                      Ürün Adı
                    </th>
                    <th className="text-right py-4 px-4 text-gray-600 font-semibold">
                      Satış (Adet)
                    </th>
                    <th className="text-right py-4 px-4 text-gray-600 font-semibold">
                      Değer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-50 hover:bg-green-50"
                    >
                      <td className="py-5 px-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-medium">
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-gray-800 font-medium">
                        {p.productName}
                      </td>
                      <td className="py-5 px-4 text-right text-gray-700 font-medium">
                        {p.totalSales}
                      </td>
                      <td className="py-5 px-4 text-right text-gray-700 font-medium">
                         {formatCurrency(p.totalValue)}
                      
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Yavaş Giden Ürünler */}
          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <TrendingDown className="text-red-600" size={24} />
              <h3 className="text-gray-800 text-xl font-semibold">Yavaş Giden Ürünler</h3>
            </div>
                      {slowProducts.length === 0 ? (
            <p className="text-gray-400 text-sm">
              Belirtilen tarih aralığında yavaş giden ürün bulunamadı.
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">#</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Ürün Adı</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Son Satış</th>
                  <th className="text-right py-4 px-4 text-gray-600 font-semibold">Stok</th>
                </tr>
              </thead>
              <tbody>
                    {slowProducts.map((p, i) => (
                      <tr
                        key={p.productId ?? i}
                        className="border-b border-gray-50 hover:bg-red-50"
                      >
                        {/* Sıra numarası */}
                        <td className="py-5 px-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-medium">
                            {i + 1}
                          </span>
                        </td>

                        {/* Ürün adı */}
                        <td className="py-5 px-4 text-gray-800 font-medium">
                          {p.productName}
                        </td>

                        {/* Son satış */}
                        <td className="py-5 px-4 text-gray-700">
                          {getDaysAgoLabel(p.lastSaleDaysAgo)}
                        </td>

                        {/* Stok */}
                        <td className="py-5 px-4 text-right text-gray-700 font-medium">
                          {getStockForSlowProduct(p) ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>


            </table>
          )}

          </div>
        </div>

        {/* SKT Yaklaşan Ürünler – detaylı tablo */}
        <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle style={{ color: "#ff6600" }} size={24} />
            <h3 className="text-gray-800 text-xl font-semibold">SKT Yaklaşan Ürünler</h3>
          </div>

          {expiringLoading && (
            <p className="text-gray-500 text-sm">SKT uyarıları yükleniyor...</p>
          )}

          {expiringError && (
            <p className="text-red-500 text-sm mb-2">{expiringError}</p>
          )}

          {!expiringLoading && !expiringError && (
            <>
              {expiringBatches.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  Seçilen süre içinde SKT tarihi yaklaşan ürün bulunmuyor.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-100">
                        <th className="text-left py-4 px-4 text-gray-600 font-semibold">
                          Ürün Adı
                        </th>
                        <th className="text-left py-4 px-4 text-gray-600 font-semibold">
                          Barkod Numarası
                        </th>
                        <th className="text-left py-4 px-4 text-gray-600 font-semibold">
                          SKT Tarihi
                        </th>
                        <th className="text-center py-4 px-4 text-gray-600 font-semibold">
                          Kalan Gün
                        </th>
                        <th className="text-right py-4 px-4 text-gray-600 font-semibold">
                          Miktar
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringBatches.map((b) => {
                        const daysLeft = calculateDaysLeft(b.expiryDate);
                        return (
                          <tr
                            key={b.id}
                            className="border-b border-gray-50 hover:bg-amber-50"
                          >
                            <td className="py-5 px-4 text-gray-800 font-medium">
                              {b.productName}
                            </td>
                            <td className="py-5 px-4 text-gray-700">
                              {b.productSku ?? "-"}
                            </td>
                            <td className="py-5 px-4 text-gray-700">
                              {formatDate(b.expiryDate)}
                            </td>
                            <td className="py-5 px-4 text-center">
                              <span className={getDaysLeftClass(daysLeft)}>
                                {daysLeft != null ? `${daysLeft} gün` : "-"}
                              </span>
                            </td>
                            <td className="py-5 px-4 text-right text-gray-700 font-medium">
                              {b.quantity}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Şubedeki Ürünler Listesi */}
        <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Package className="text-pistachio-600" size={24} />
            <h3 className="text-gray-800 text-xl font-semibold">Şubedeki Ürünler</h3>
          </div>

          {branchProductsLoading && (
            <p className="text-gray-500 text-sm">Ürünler yükleniyor...</p>
          )}

          {branchProductsError && (
            <p className="text-red-500 text-sm mb-2">{branchProductsError}</p>
          )}

          {!branchProductsLoading && !branchProductsError && (
            <>
              {branchProducts.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  Bu şubeye ait kayıtlı ürün bulunamadı.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-100">
                        <th className="text-left py-4 px-4 text-gray-600 font-semibold">Ürün Adı</th>
                        <th className="text-left py-4 px-4 text-gray-600 font-semibold">Kategori</th>
                        <th className="text-left py-4 px-4 text-gray-600 font-semibold">SKU</th>
                        <th className="text-right py-4 px-4 text-gray-600 font-semibold">Stok</th>
                        <th className="text-right py-4 px-4 text-gray-600 font-semibold">Değer</th>
                        <th className="text-center py-4 px-4 text-gray-600 font-semibold">İşlem</th>
                      </tr>
                    </thead>

                    <tbody>
                      {branchProducts.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-gray-50 hover:bg-gray-50"
                        >
                          {/* Ürün Adı */}
                          <td className="py-5 px-4 text-gray-800 font-medium">
                            {p.name}
                          </td>

                          {/* Kategori (sadece mavi link gibi dursun) */}
                          <td className="py-5 px-4">
                            <span className="text-blue-600 hover:underline cursor-default font-medium">
                              {p.categoryName ?? "-"}
                            </span>
                          </td>

                          {/* SKU */}
                          <td className="py-5 px-4 text-gray-700 font-mono">
                            {p.sku}
                          </td>

                          {/* Stok */}
                          <td className="py-5 px-4 text-right text-gray-800 font-medium">
                            {p.stock}
                          </td>

                          {/* Değer = stok * fiyat */}
                          <td className="py-5 px-4 text-right text-gray-800 font-semibold">
                            ₺{(p.price * p.stock).toLocaleString("tr-TR")}
                          </td>

                          {/* İşlem - Transfer butonu */}
                          <td className="py-5 px-4 text-center">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-lime-600 text-white text-sm font-semibold hover:bg-lime-700 transition-colors"
                            >
                              ↗ Transfer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}


        </div>
      </div>
    </div>
  );
}
