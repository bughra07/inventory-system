import React, { useEffect, useState } from "react";
import { AdminHeader } from "../components/AdminHeader";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  Tag,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8080/api/v1";

type TransactionType = "purchase" | "sale";

interface Transaction {
  id: string;
  type: TransactionType;
  product: string;
  quantity: number;
  price: number;
  branch: string;
  date: string;
  expiryDate?: string;
}

interface ProductOption {
  id: number;
  name: string;
}

interface BranchOption {
  id: number;
  name: string;
}

// İstersen burada demo data tutabilirsin, şimdilik boş başlatıyorum
const initialTransactions: Transaction[] = [];

export default function TransactionsPage() {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [activeTab, setActiveTab] =
    useState<TransactionType>("purchase");
  const [filterBranch, setFilterBranch] = useState<string>("Tümü");
  const [showSuccess, setShowSuccess] = useState(false);

  const [productOptions, setProductOptions] = useState<ProductOption[]>(
    []
  );
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>(
    []
  );

  // Purchase form state (PurchaseRequest ile uyumlu)
  const [purchaseForm, setPurchaseForm] = useState({
    productId: "",
    branchId: "",
    quantity: "",
    price: "",
    expiryDate: "",
  });

  // Sale form state (SaleCreateRequest ile uyumlu)
  const [saleForm, setSaleForm] = useState({
    productId: "",
    branchId: "",
    quantity: "",
    price: "",
  });

  // Ürün ve şube seçeneklerini backend'den çek
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [prodRes, branchRes] = await Promise.all([
          // Tüm ürünleri çekiyoruz (sayfalı endpoint)
          fetch(
            `${API_BASE_URL}/products?page=0&size=200&sort=name,asc`
          ),
          fetch(`${API_BASE_URL}/branches`),
        ]);

        if (prodRes.ok) {
          const raw = await prodRes.json();
          const items: any[] = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as any).content)
            ? (raw as any).content
            : [];

          setProductOptions(
            items.map((p: any) => ({
              id: p.id,
              name: p.name ?? "İsimsiz ürün",
            }))
          );
        } else {
          console.error("Ürünler yüklenemedi:", prodRes.status);
        }

        if (branchRes.ok) {
          const rawBranches = await branchRes.json();
          const items: any[] = Array.isArray(rawBranches)
            ? rawBranches
            : [];
          setBranchOptions(
            items.map((b: any) => ({
              id: b.id,
              name: b.name ?? "Şube",
            }))
          );
        } else {
          console.error("Şubeler yüklenemedi:", branchRes.status);
        }
      } catch (err) {
        console.error("Seçenekler yüklenirken hata:", err);
      }
    };

    fetchOptions();
  }, []);

useEffect(() => {
  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/transactions`);
      if (!res.ok) {
        console.error("İşlemler yüklenemedi:", res.status);
        return;
      }

      const data = await res.json();

      const mapped = data.map((t: any) => ({
        id: String(t.id),
        type: t.type, // "purchase" | "sale"
        product: t.productName,
        branch: t.branchName,
        quantity: t.quantity,
        price: Number(t.unitPrice),
        date: t.date, // ISO string geliyor
        expiryDate: t.expiryDate ?? undefined,
      }));

      setTransactions(mapped);
    } catch (err) {
      console.error("İşlemler yüklenirken hata:", err);
    }
  };

  fetchTransactions();
}, []);

  
  // Satın alma gönder (PurchaseRequest -> /api/v1/purchases)
  const handlePurchaseSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!purchaseForm.productId || !purchaseForm.branchId) {
      alert("Lütfen ürün ve şube seçin.");
      return;
    }

    const productId = Number(purchaseForm.productId);
    const branchId = Number(purchaseForm.branchId);
    const quantity = parseInt(purchaseForm.quantity, 10);
    const unitCost = parseFloat(purchaseForm.price);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert("Lütfen geçerli bir miktar girin.");
      return;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      alert("Lütfen geçerli bir birim maliyet girin.");
      return;
    }

    const selectedProduct = productOptions.find(
      (p) => p.id === productId
    );
    const selectedBranch = branchOptions.find(
      (b) => b.id === branchId
    );

    // PurchaseRequest ile bire bir uyumlu payload
    const payload: any = {
      productId,
      branchId,
      quantity,
      unitCost,
    };

    if (purchaseForm.expiryDate) {
      payload.expiryDate = purchaseForm.expiryDate; // LocalDate string (YYYY-MM-DD)
    }

    try {
      const res = await fetch(`${API_BASE_URL}/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok && res.status !== 204) {
        console.error(
          "Satın alma kaydedilemedi. Status:",
          res.status
        );
        alert("Satın alma kaydedilirken bir hata oluştu.");
      }

      const newTransaction: Transaction = {
        id: Date.now().toString(),
        type: "purchase",
        product: selectedProduct?.name ?? "Bilinmeyen ürün",
        quantity,
        price: unitCost,
        branch: selectedBranch?.name ?? "Bilinmeyen şube",
        date: new Date().toLocaleString("tr-TR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        expiryDate: purchaseForm.expiryDate || undefined,
      };

      setTransactions((prev) => [newTransaction, ...prev]);

      setPurchaseForm({
        productId: "",
        branchId: "",
        quantity: "",
        price: "",
        expiryDate: "",
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Satın alma isteği gönderilirken hata:", err);
      alert("Satın alma isteği gönderilirken bir hata oluştu.");
    }
  };

  // Satış gönder (SaleCreateRequest -> /api/v1/sales)
  const handleSaleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!saleForm.productId || !saleForm.branchId) {
      alert("Lütfen ürün ve şube seçin.");
      return;
    }

    const productId = Number(saleForm.productId);
    const branchId = Number(saleForm.branchId);
    const quantity = parseInt(saleForm.quantity, 10);
    const unitPrice = parseFloat(saleForm.price);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert("Lütfen geçerli bir miktar girin.");
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      alert("Lütfen geçerli bir birim fiyat girin.");
      return;
    }

    const selectedProduct = productOptions.find(
      (p) => p.id === productId
    );
    const selectedBranch = branchOptions.find(
      (b) => b.id === branchId
    );

    // SaleCreateRequest ile bire bir uyumlu payload
    const payload = {
      branchId,
      items: [
        {
          productId,
          quantity,
          unitPrice,
        },
      ],
    };

    try {
      const res = await fetch(`${API_BASE_URL}/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Satış kaydedilemedi. Status:", res.status);
        alert("Satış kaydedilirken bir hata oluştu.");
      } else {
        // SaleResponse dönüyorsa konsola yaz
        try {
          const data = await res.json();
          console.log("Satış oluşturuldu:", data);
        } catch {
          // Body yoksa sorun değil
        }
      }

      const newTransaction: Transaction = {
        id: Date.now().toString(),
        type: "sale",
        product: selectedProduct?.name ?? "Bilinmeyen ürün",
        quantity,
        price: unitPrice,
        branch: selectedBranch?.name ?? "Bilinmeyen şube",
        date: new Date().toLocaleString("tr-TR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setTransactions((prev) => [newTransaction, ...prev]);

      setSaleForm({
        productId: "",
        branchId: "",
        quantity: "",
        price: "",
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Satış isteği gönderilirken hata:", err);
      alert("Satış isteği gönderilirken bir hata oluştu.");
    }
  };

  // Filtrelenmiş işlemler
  const filteredTransactions = transactions.filter(
    (t) => filterBranch === "Tümü" || t.branch === filterBranch
  );

  // İstatistikler
  const totalPurchases = transactions.filter(
    (t) => t.type === "purchase"
  ).length;
  const totalSales = transactions.filter(
    (t) => t.type === "sale"
  ).length;
  const totalPurchaseAmount = transactions
    .filter((t) => t.type === "purchase")
    .reduce((sum, t) => sum + t.price * t.quantity, 0);
  const totalSaleAmount = transactions
    .filter((t) => t.type === "sale")
    .reduce((sum, t) => sum + t.price * t.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pistachio-50 via-white to-gray-50">
      <AdminHeader title="İşlem Yönetimi" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 bg-green-100 border-2 border-green-300 text-green-900 px-6 py-4 rounded-2xl flex items-center gap-3 animate-slideDown">
            <div className="bg-green-500 text-white p-2 rounded-lg">
              ✓
            </div>
            <span>İşlem başarıyla kaydedildi!</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Toplam Satın Alma</p>
                <p className="text-gray-900">{totalPurchases}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <TrendingDown className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Toplam Satış</p>
                <p className="text-gray-900">{totalSales}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <TrendingUp className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Satın Alma Tutarı</p>
                <p className="text-gray-900">
                  ₺
                  {totalPurchaseAmount.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Package className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Satış Tutarı</p>
                <p className="text-gray-900">
                  ₺
                  {totalSaleAmount.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <Tag className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 mb-8 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b-2 border-gray-100">
            <button
              onClick={() => setActiveTab("purchase")}
              className={`flex-1 px-6 py-4 transition-colors flex items-center justify-center gap-2 ${
                activeTab === "purchase"
                  ? "bg-blue-50 text-blue-700 border-b-4 border-blue-500"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <ShoppingCart size={20} />
              <span>Satın Alma</span>
            </button>
            <button
              onClick={() => setActiveTab("sale")}
              className={`flex-1 px-6 py-4 transition-colors flex items-center justify-center gap-2 ${
                activeTab === "sale"
                  ? "bg-green-50 text-green-700 border-b-4 border-green-500"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <TrendingUp size={20} />
              <span>Satış</span>
            </button>
          </div>

          {/* Purchase Form */}
          {activeTab === "purchase" && (
            <form onSubmit={handlePurchaseSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form fields already have proper spacing, but let's ensure labels have more space */}
                {/* Product */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Ürün *
                  </label>
                  <select
                    required
                    value={purchaseForm.productId}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        productId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  >
                    <option value="">Ürün seçin</option>
                    {productOptions.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Şube *
                  </label>
                  <select
                    required
                    value={purchaseForm.branchId}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        branchId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  >
                    <option value="">Şube seçin</option>
                    {branchOptions.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Miktar *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={purchaseForm.quantity}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        quantity: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                    placeholder="0"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-gray-700 mb-3 font-medium">
                    Birim Maliyet (₺) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={purchaseForm.price}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        price: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>

                {/* Expiry Date */}
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-3 font-medium">
                    Son Kullanma Tarihi (Opsiyonel)
                  </label>
                  <input
                    type="date"
                    value={purchaseForm.expiryDate}
                    onChange={(e) =>
                      setPurchaseForm({
                        ...purchaseForm,
                        expiryDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={20} />
                  Satın Alma Kaydı Ekle
                </button>
              </div>
            </form>
          )}

          {/* Sale Form */}
          {activeTab === "sale" && (
            <form onSubmit={handleSaleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Ürün *
                  </label>
                  <select
                    required
                    value={saleForm.productId}
                    onChange={(e) =>
                      setSaleForm({
                        ...saleForm,
                        productId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  >
                    <option value="">Ürün seçin</option>
                    {productOptions.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Şube *
                  </label>
                  <select
                    required
                    value={saleForm.branchId}
                    onChange={(e) =>
                      setSaleForm({
                        ...saleForm,
                        branchId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  >
                    <option value="">Şube seçin</option>
                    {branchOptions.map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Miktar *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={saleForm.quantity}
                    onChange={(e) =>
                      setSaleForm({
                        ...saleForm,
                        quantity: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                    placeholder="0"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-gray-700 mb-3 font-medium">
                    Birim Fiyat (₺) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={saleForm.price}
                    onChange={(e) =>
                      setSaleForm({
                        ...saleForm,
                        price: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <TrendingUp size={20} />
                  Satış Kaydı Ekle
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Transactions History */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100">
          <div className="p-6 border-b-2 border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-gray-800">Son İşlemler</h3>

              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
              >
                <option value="Tümü">Tüm Şubeler</option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">

            <thead className="bg-gray-50 border-b-2 border-gray-100">
              <tr>
                <th className="text-left  py-4 px-6 text-gray-600 font-semibold">Tarih</th>
                <th className="text-left  py-4 px-6 text-gray-600 font-semibold">Tür</th>
                <th className="text-left  py-4 px-6 text-gray-600 font-semibold">Ürün</th>
                <th className="text-left  py-4 px-6 text-gray-600 font-semibold">Şube</th>
                <th className="text-right py-4 px-6 text-gray-600 font-semibold">Miktar</th>
                <th className="text-right py-4 px-6 text-gray-600 font-semibold">Birim Fiyat</th>
                <th className="text-right py-4 px-6 text-gray-600 font-semibold">Toplam</th>
                <th className="text-left  py-4 px-6 text-gray-600 font-semibold">SKT</th>
              </tr>
            </thead>



              <tbody>
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-6 px-6 text-center text-gray-400"
                    >
                      Henüz kayıtlı işlem yok.
                    </td>
                  </tr>
                )}

                {filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    {/* T A R İ H */}
                    <td className="py-5 px-6 text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        {t.date}
                      </div>
                    </td>

                    {/* T Ü R */}
                    <td className="py-5 px-6 ">
                      {t.type === "sale" ? (
                        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg flex items-center gap-1 w-fit font-medium">
                          <TrendingUp size={16} />
                          Satış
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg flex items-center gap-1 w-fit font-medium">
                          <TrendingDown size={16} />
                          Satın Alma
                        </span>
                      )}
                    </td>

                    {/* Ü R Ü N */}
                    <td className="py-5 px-6 text-gray-800 font-medium">{t.product}</td>

                    {/* Ş U B E */}
                    <td className="py-5 px-6 ">
                      <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg flex items-center gap-1 w-fit font-medium">
                        <Building2 size={16} />
                        {t.branch}
                      </span>
                    </td>

                    {/* M İ K T A R */}
                    <td className="py-5 px-6 text-right text-gray-700 font-medium">
                      {t.quantity} adet
                    </td>

                    {/* F İ Y A T */}
                    <td className="py-5 px-6 text-right text-gray-700 font-medium">
                      ₺
                      {t.price.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* T O P L A M */}
                    <td className="py-5 px-6 text-right font-semibold text-gray-900">
                      ₺
                      {(t.quantity * t.price).toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* S K T */}
                    <td className="py-5 px-6 text-gray-700">
                      {t.expiryDate ? (
                        t.expiryDate
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Küçük animasyon için style */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
