import React, { useState, useEffect } from "react";

import { AdminHeader } from "../components/AdminHeader";
import { Package, Plus, Edit, Trash2, X, Tag, DollarSign } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  unitPrice: number;
  isActive: boolean;
  branchId?: number;
  categoryId?: number;
}

interface Category {
  id: number;
  name: string;
  createdAt?: string;
}

const API_BASE_URL = "http://localhost:8080/api/v1";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("Tümü");
  const [filterStatus, setFilterStatus] =
    useState<"Tümü" | "Aktif" | "Pasif">("Tümü");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    sku: "",
    unitPrice: "",
    isActive: true,
  });

  // === KATEGORİLERİ ÇEK ===
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        setCategoriesError(null);

        const res = await fetch(`${API_BASE_URL}/categories`);

        if (!res.ok) {
          throw new Error(`Kategoriler yüklenemedi (status: ${res.status})`);
        }

        const raw = await res.json();
        console.log("Categories raw:", raw);

        const items: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.content)
          ? raw.content
          : [];

        const list: Category[] = items.map((item: any) => ({
          id: item.id,
          name: item.name,
          createdAt: item.createdAt,
        }));

        setCategories(list);
      } catch (err: any) {
        console.error("Kategoriler getirilirken hata:", err);
        setCategoriesError(
          err.message || "Kategoriler getirilirken hata oluştu"
        );
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // === ÜRÜNLERİ ÇEK ===
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Yeni ürünler üstte gözüksün diye createdAt desc + büyük page size
        const res = await fetch(
          `${API_BASE_URL}/products?page=0&size=100&sort=createdAt,desc`
        );

        if (!res.ok) {
          throw new Error(`Ürünler yüklenemedi (status: ${res.status})`);
        }

        const raw = await res.json();
        console.log("Backend raw:", raw);

        const items: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.content)
          ? raw.content
          : [];

        const list: Product[] = items.map((item: any) => ({
          id: String(item.id),
          name: item.name ?? item.productName ?? "İsimsiz ürün",
          category: item.categoryName ?? item.category ?? "Diğer",
          sku: item.sku ?? item.code ?? "",
          unitPrice: item.unitPrice ?? item.price ?? 0,
          isActive: true, // backend'te aktif/pasif yoksa şimdilik hep true
          branchId: item.branchId,
          categoryId: item.categoryId,
        }));

        setProducts(list);
      } catch (err: any) {
        console.error("Ürünler getirilirken hata:", err);
        setError(err.message || "Ürünler getirilirken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "",
      sku: "",
      unitPrice: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      sku: product.sku,
      unitPrice: product.unitPrice.toString(),
      isActive: product.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "",
      sku: "",
      unitPrice: "",
      isActive: true,
    });
  };

  // === CREATE + UPDATE ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Seçilen kategoriyi bul
    const selectedCategory = categories.find(
      (c) => c.name === formData.category
    );

    if (!selectedCategory) {
      alert("Lütfen bir kategori seçin.");
      return;
    }

    const payload = {
      name: formData.name,
      sku: formData.sku,
      price: parseFloat(formData.unitPrice),
      stock: 0,
      branchId: 74, // şimdilik sabit
      categoryId: selectedCategory.id,
    };

    try {
      if (editingProduct) {
        // === UPDATE (PUT) ===
        const res = await fetch(
          `${API_BASE_URL}/products/${editingProduct.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        console.log("PUT /products status:", res.status);

        if (!res.ok) {
          const text = await res.text();
          console.error("Update error body:", text);
          throw new Error(`Ürün güncellenemedi (status: ${res.status})`);
        }

        const saved = await res.json();
        console.log("Updated product:", saved);

        const updatedProduct: Product = {
          id: String(saved.id ?? editingProduct.id),
          name: saved.name ?? formData.name,
          category: saved.categoryName ?? formData.category,
          sku: saved.sku ?? formData.sku,
          unitPrice:
            saved.price ??
            payload.price ??
            Number(formData.unitPrice) ??
            0,
          isActive: formData.isActive,
          branchId: saved.branchId ?? editingProduct.branchId,
          categoryId: saved.categoryId ?? selectedCategory.id,
        };

        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id ? updatedProduct : p
          )
        );
      } else {
        // === CREATE (POST) ===
        const res = await fetch(`${API_BASE_URL}/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        console.log("POST /products status:", res.status);

        if (!res.ok) {
          const text = await res.text();
          console.error("Create error body:", text);
          throw new Error(`Ürün eklenemedi (status: ${res.status})`);
        }

        const saved = await res.json();
        console.log("Created product:", saved);

       const newProduct: Product = {
          id: String(saved.id ?? Date.now()),
          name: saved.name ?? formData.name,
          category:
            saved.categoryName ??
            (formData.category && formData.category.trim().length > 0
              ? formData.category
              : "Diğer"),
          sku: saved.sku ?? formData.sku,
          unitPrice:
            saved.price ??
            payload.price ??
            Number(formData.unitPrice) ??
            0,
          isActive: formData.isActive,
          branchId: saved.branchId ?? 74,
          categoryId: saved.categoryId ?? selectedCategory.id,
        };


        setProducts((prev) => [newProduct, ...prev]);
      }

      closeModal();
    } catch (err) {
      console.error("Ürün kaydedilirken hata:", err);
      alert("Ürün kaydedilirken bir hata oluştu.");
    }
  };

  // === DELETE ===
  const handleDelete = async (productId: string) => {
    if (!window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: "DELETE",
      });

      console.log("DELETE /products status:", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("Delete error body:", text);
        throw new Error(`Ürün silinemedi (status: ${res.status})`);
      }

      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      console.error("Ürün silinirken hata:", err);
      alert("Ürün silinirken bir hata oluştu.");
    }
  };

  // Şimdilik aktif/pasif sadece frontend state’i
  const toggleStatus = (productId: string) => {
    setProducts((products) =>
      products.map((p) =>
        p.id === productId ? { ...p, isActive: !p.isActive } : p
      )
    );
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "Tümü" || p.category === filterCategory;
    const matchesStatus =
      filterStatus === "Tümü" ||
      (filterStatus === "Aktif" && p.isActive) ||
      (filterStatus === "Pasif" && !p.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeCount = products.filter((p) => p.isActive).length;
  const passiveCount = products.filter((p) => !p.isActive).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pistachio-50 via-white to-gray-50">
      <AdminHeader title="Ürün Yönetimi" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Toplam Ürün</p>
                <p className="text-gray-900">{products.length}</p>
              </div>
              <div className="bg-pistachio-100 p-3 rounded-xl">
                <Package className="text-pistachio-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Aktif Ürün</p>
                <p className="text-gray-900">{activeCount}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <Tag className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Pasif Ürün</p>
                <p className="text-gray-900">{passiveCount}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-xl">
                <Package className="text-gray-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100 mb-8">
          <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full lg:w-auto">
              {/* Search */}
              <input
                type="text"
                placeholder="Ürün adı veya SKU ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors w-full sm:w-64"
              />

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
              >
                <option value="Tümü">Tüm Kategoriler</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as typeof filterStatus)
                }
                className="px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
              >
                <option value="Tümü">Tüm Durumlar</option>
                <option value="Aktif">Aktif</option>
                <option value="Pasif">Pasif</option>
              </select>
            </div>

            {/* Add Button */}
            <button
              onClick={openAddModal}
              className="bg-pistachio-500 hover:bg-pistachio-600 text-white px-6 py-3 rounded-xl transition-colors flex items-center gap-2 w-full sm:w-auto justify-center font-medium"
            >
              <Plus size={20} />
              Yeni Ürün Ekle
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-100">
                <tr>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">Ürün Adı</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">Kategori</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">SKU</th>
                  <th className="text-right py-4 px-6 text-gray-600 font-semibold">
                    Birim Fiyat
                  </th>
                  <th className="text-center py-4 px-6 text-gray-600 font-semibold">Durum</th>
                  <th className="text-center py-4 px-6 text-gray-600 font-semibold">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-5 px-6 text-gray-800">
                      {product.name}
                    </td>
                    <td className="py-5 px-6">
                      <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-medium">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-gray-600 font-mono">
                      {product.sku}
                    </td>
                    <td className="py-5 px-6 text-right text-gray-700 font-medium">
                      ₺{Number(product.unitPrice ?? 0).toFixed(2)}
                    </td>

                    <td className="py-5 px-6 text-center">
                      <button
                        onClick={() => toggleStatus(product.id)}
                        className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                          product.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {product.isActive ? "Aktif" : "Pasif"}
                      </button>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProducts.length === 0 && !loading && (
              <div className="text-center py-12">
                <Package className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500">Ürün bulunamadı</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-500">
            Hata: {error}
          </p>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b-2 border-gray-100 p-6 flex items-center justify-between">
              <h3 className="text-gray-800">
                {editingProduct ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-gray-700 mb-3 font-medium">
                  Ürün Adı *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  placeholder="Ürün adını girin"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-gray-700 mb-3 font-medium">
                  Kategori *
                </label>

                <select
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                >
                  <option value="">Kategori seçin</option>

                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                {categoriesLoading && (
                  <p className="text-xs text-gray-400 mt-1">
                    Kategoriler yükleniyor...
                  </p>
                )}

                {categoriesError && (
                  <p className="text-xs text-red-500 mt-1">
                    Kategori yüklenemedi: {categoriesError}
                  </p>
                )}
              </div>

              {/* SKU */}
              <div>
                <label className="block text-gray-700 mb-3 font-medium">
                  SKU (Stok Kodu) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sku: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors font-mono"
                  placeholder="NB-A4-100"
                />
              </div>

              {/* Unit Price */}
              <div>
                <label className="block text-gray-700 mb-3 font-medium">
                  Birim Fiyat (₺) *
                </label>
                <div className="relative">
                  <DollarSign
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unitPrice: e.target.value,
                      })
                    }
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isActive: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-pistachio-500 rounded border-gray-300 focus:ring-pistachio-500"
                />
                <label htmlFor="isActive" className="text-gray-700">
                  Ürün aktif
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-pistachio-500 hover:bg-pistachio-600 text-white rounded-xl transition-colors"
                >
                  {editingProduct ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
