import { useEffect, useState } from "react";
import { AdminHeader } from "../components/AdminHeader";
import { TransferStatusBadge } from "../components/TransferStatusBadge";
import {
  ArrowRightLeft,
  Package,
  Building2,
  Search,
  Info,
  CheckCircle,
  Clock,
  X,
  Filter,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8080/api/v1";

type UiStatus = "Bekliyor" | "Tamamlandı" | "İptal";

interface BranchOption {
  id: number;
  name: string;
}

interface ProductOption {
  id: number;
  name: string;
  stock: number;
  branchId: number | null;
  branchName: string | null;
  sku: string;
}

interface TransferRow {
  id: string;
  date: string;
  product: string;
  source: string;
  target: string;
  quantity: number;
  status: UiStatus;
}

export default function TransferPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);

  const [selectedProduct, setSelectedProduct] = useState("");
  const [sourceBranch, setSourceBranch] = useState(""); // id (string)
  const [targetBranch, setTargetBranch] = useState(""); // id (string)
  const [quantity, setQuantity] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "Tümü" | "Bekliyor" | "Tamamlandı" | "İptal"
  >("Tümü");

  // ---------- Backend'den veri çek ----------
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [branchRes, productRes, transferRes] = await Promise.all([
          fetch(`${API_BASE_URL}/branches`),
          fetch(
            `${API_BASE_URL}/products?page=0&size=200&sort=name,asc`
          ),
          fetch(`${API_BASE_URL}/branch-transfers`),
        ]);

        // Branches
        if (branchRes.ok) {
          const rawBranches = await branchRes.json();
          const items: any[] = Array.isArray(rawBranches)
            ? rawBranches
            : [];
          setBranches(
            items.map((b: any) => ({
              id: b.id,
              name: b.name ?? "Şube",
            }))
          );
        } else {
          console.error("Şubeler yüklenemedi:", branchRes.status);
        }

        // Products
        if (productRes.ok) {
          const rawProducts = await productRes.json();
          const items: any[] = Array.isArray(rawProducts)
            ? rawProducts
            : Array.isArray((rawProducts as any).content)
            ? (rawProducts as any).content
            : [];

          setProducts(
            items.map((p: any) => ({
              id: p.id,
              name: p.name ?? "İsimsiz ürün",
              stock: p.stock ?? 0,
              branchId: p.branchId ?? null,
              branchName: p.branchName ?? null,
              sku: p.sku ?? "",
            }))
          );
        } else {
          console.error("Ürünler yüklenemedi:", productRes.status);
        }

        // Transfers
        if (transferRes.ok) {
          const rawTransfers = await transferRes.json();
          const items: any[] = Array.isArray(rawTransfers)
            ? rawTransfers
            : [];
          const mapped: TransferRow[] = items.map((t: any) => ({
            id: String(t.id),
            date: t.createdAt ?? "",
            product: t.productName ?? "",
            source: t.sourceBranchName ?? "",
            target: t.targetBranchName ?? "",
            quantity: t.quantity ?? 0,
            // backend şu an sadece COMPLETED döndürüyor
            status: "Tamamlandı",
          }));
          setTransfers(mapped);
        } else {
          console.error(
            "Transfer kayıtları yüklenemedi:",
            transferRes.status
          );
        }
      } catch (err) {
        console.error("Transfer sayfası verileri yüklenirken hata:", err);
      }
    };

    fetchInitialData();
  }, []);

  // Ürün seçildiğinde kaynak şubeyi otomatik doldur
  useEffect(() => {
    if (!selectedProduct) {
      setSourceBranch("");
      return;
    }
    const product = products.find(
      (p) => p.id === Number(selectedProduct)
    );
    if (product?.branchId != null) {
      setSourceBranch(String(product.branchId));
    } else {
      setSourceBranch("");
    }
  }, [selectedProduct, products]);

  // Aramaya göre ürün filtrele
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statü filtresi
  const filteredTransfers = transfers.filter(
    (t) => statusFilter === "Tümü" || t.status === statusFilter
  );

  // Seçili ürünün stok bilgisi
  const getAvailableStock = () => {
    if (!selectedProduct) return null;
    const product = products.find(
      (p) => p.id === Number(selectedProduct)
    );
    return product?.stock ?? null;
  };

  const availableStock = getAvailableStock();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !sourceBranch || !targetBranch || !quantity) {
      alert("Lütfen tüm alanları doldurun");
      return;
    }

    if (sourceBranch === targetBranch) {
      alert("Kaynak ve hedef şube aynı olamaz");
      return;
    }

    const quantityNum = parseInt(quantity, 10);
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      alert("Lütfen geçerli bir miktar girin");
      return;
    }

    // (Opsiyonel) frontend stok kontrolü — asıl kontrol backend'de
    if (availableStock !== null && quantityNum > availableStock) {
      alert(
        `Kaynak şubede yeterli stok yok (Mevcut: ${availableStock})`
      );
      return;
    }

    const payload = {
      productId: Number(selectedProduct),
      sourceBranchId: Number(sourceBranch),
      targetBranchId: Number(targetBranch),
      quantity: quantityNum,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/branch-transfers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(
          "Transfer oluşturulamadı:",
          res.status,
          text
        );
        alert(
          "Transfer oluşturulurken bir hata oluştu.\n" +
            (text || "Lütfen loglara bak.")
        );
        return;
      }

      const data = await res.json();

      const newRow: TransferRow = {
        id: String(data.id),
        date: data.createdAt ?? "",
        product: data.productName ?? "",
        source: data.sourceBranchName ?? "",
        target: data.targetBranchName ?? "",
        quantity: data.quantity ?? quantityNum,
        status: "Tamamlandı",
      };

      setTransfers((prev) => [newRow, ...prev]);

      // Form reset
      setSelectedProduct("");
      setSourceBranch("");
      setTargetBranch("");
      setQuantity("");
      setSearchTerm("");

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Transfer isteği gönderilirken hata:", err);
      alert("Transfer isteği gönderilirken bir hata oluştu.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pistachio-50 via-white to-gray-50">
      <AdminHeader />

      <div className="container mx-auto px-6 py-8">
        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="text-green-600" size={24} />
            <p className="text-green-800">
              Transfer başarıyla oluşturuldu!
            </p>
          </div>
        )}

        {/* Page Header */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6 border-2 border-gray-100">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="text-pistachio-600" size={32} />
            <div>
              <h2 className="text-pistachio-700">
                Şubeler Arası Transfer
              </h2>
              <p className="text-gray-500">
                Şubeler arasında stok aktarımı yapın
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transfer Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100 sticky top-6">
              <h3 className="text-gray-800 mb-6">Transfer Formu</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Selection with Search */}
                <div>
                  <label className="block text-gray-700 mb-3 font-medium">Ürün</label>
                  <div className="relative mb-2">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <input
                      type="text"
                      placeholder="Ürün ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                    />
                  </div>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                    required
                  >
                    <option value="">Ürün Seçin</option>
                    {filteredProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Branch (product'tan otomatik gelir) */}
                <div>
                  <label className="block text-gray-700 mb-3 font-medium">
                    Kaynak Şube
                  </label>
                  <div className="relative">
                    <Building2
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <select
                      value={sourceBranch}
                      onChange={(e) => setSourceBranch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                      disabled // kaynağı kullanıcı değiştirmesin
                      required
                    >
                      <option value="">
                        {selectedProduct
                          ? "Ürün bağlı olduğu şubeden çıkacak"
                          : "Önce ürün seçin"}
                      </option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Target Branch */}
                <div>
                  <label className="block text-gray-700 mb-3 font-medium">
                    Hedef Şube
                  </label>
                  <div className="relative">
                    <Building2
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <select
                      value={targetBranch}
                      onChange={(e) => setTargetBranch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                      required
                    >
                      <option value="">Şube Seçin</option>
                      {branches
                        .filter(
                          (b) => String(b.id) !== sourceBranch
                        )
                        .map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-gray-700 mb-3 font-medium">
                    Miktar
                  </label>
                  <div className="relative">
                    <Package
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Adet girin"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                      required
                    />
                  </div>

                  {availableStock !== null && (
                    <div className="mt-2 p-3 bg-blue-50 border-2 border-blue-100 rounded-xl flex items-start gap-2">
                      <Info
                        className="text-blue-600 flex-shrink-0 mt-0.5"
                        size={18}
                      />
                      <p className="text-blue-700">
                        Kaynakta mevcut:{" "}
                        <span className="font-semibold">
                          {availableStock} adet
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-pistachio-500 hover:bg-pistachio-600 text-white rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft size={20} />
                  Transferi Başlat
                </button>
              </form>
            </div>
          </div>

          {/* Transfer History Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="text-gray-700" size={24} />
                  <h3 className="text-gray-800">Transfer Kayıtları</h3>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="text-gray-500" size={20} />
                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as typeof statusFilter
                      )
                    }
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  >
                    <option value="Tümü">Tümü</option>
                    <option value="Bekliyor">Bekliyor</option>
                    <option value="Tamamlandı">Tamamlandı</option>
                    <option value="İptal">İptal</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="text-left py-4 px-5 text-gray-600 font-semibold">
                        Tarih
                      </th>
                      <th className="text-left py-4 px-5 text-gray-600 font-semibold">
                        Ürün
                      </th>
                      <th className="text-left py-4 px-5 text-gray-600 font-semibold">
                        Kaynak
                      </th>
                      <th className="text-center py-4 px-5 text-gray-600 font-semibold">
                        →
                      </th>
                      <th className="text-left py-4 px-5 text-gray-600 font-semibold">
                        Hedef
                      </th>
                      <th className="text-right py-4 px-5 text-gray-600 font-semibold">
                        Miktar
                      </th>
                      <th className="text-center py-4 px-5 text-gray-600 font-semibold">
                        Durum
                      </th>
                      <th className="text-center py-4 px-5 text-gray-600 font-semibold">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransfers.map((transfer) => (
                      <tr
                        key={transfer.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-5 px-5 text-gray-600">
                          {transfer.date}
                        </td>
                        <td className="py-5 px-5 text-gray-800 font-medium">
                          {transfer.product}
                        </td>
                        <td className="py-5 px-5">
                          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-medium">
                            {transfer.source}
                          </span>
                        </td>
                        <td className="py-5 px-5 text-center">
                          <ArrowRightLeft
                            className="text-gray-400 mx-auto"
                            size={18}
                          />
                        </td>
                        <td className="py-5 px-5">
                          <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg font-medium">
                            {transfer.target}
                          </span>
                        </td>
                        <td className="py-5 px-5 text-right text-gray-700 font-medium">
                          {transfer.quantity} adet
                        </td>
                        <td className="py-5 px-5 text-center">
                          <TransferStatusBadge status={transfer.status} />
                        </td>
                        <td className="py-5 px-5">
                          {/* Basit versiyon: hepsi backend'de direkt Tamamlandı.
                              O yüzden aksiyon yok, sadece tire gösteriyoruz. */}
                          <div className="text-center text-gray-400">-</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Stats */}
              <div className="mt-6 pt-6 border-t-2 border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 border-2 border-green-100 rounded-xl">
                    <p className="text-gray-600 mb-1">Tamamlanan</p>
                    <h4 className="text-green-700">
                      {
                        transfers.filter(
                          (t) => t.status === "Tamamlandı"
                        ).length
                      }
                    </h4>
                  </div>
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-100 rounded-xl">
                    <p className="text-gray-600 mb-1">Bekleyen</p>
                    <h4 className="text-yellow-700">
                      {
                        transfers.filter(
                          (t) => t.status === "Bekliyor"
                        ).length
                      }
                    </h4>
                  </div>
                  <div className="p-4 bg-gray-50 border-2 border-gray-100 rounded-xl">
                    <p className="text-gray-600 mb-1">Toplam</p>
                    <h4 className="text-gray-700">
                      {transfers.length}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
