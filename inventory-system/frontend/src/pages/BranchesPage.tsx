import React, { useState, useEffect } from "react";
import { AdminHeader } from "../components/AdminHeader";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  X,
  MapPin,
  Phone,
  Mail,
  User,
  ExternalLink,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8080/api/v1";

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  isActive: boolean;
  openingDate: string;
}

// Backend patlarsa fallback olarak kullanmak için mock data kalsın
const initialBranches: Branch[] = [
  {
    id: "kadikoy",
    name: "Kadıköy Şubesi",
    address: "Caferağa Mah. Moda Cad. No:45 Kadıköy/İstanbul",
    phone: "+90 (216) 555-0101",
    email: "kadikoy@kamas.com.tr",
    manager: "Ahmet Yılmaz",
    isActive: true,
    openingDate: "2020-03-15",
  },
  {
    id: "besiktas",
    name: "Beşiktaş Şubesi",
    address: "Barbaros Bulvarı No:78 Beşiktaş/İstanbul",
    phone: "+90 (212) 555-0202",
    email: "besiktas@kamas.com.tr",
    manager: "Ayşe Demir",
    isActive: true,
    openingDate: "2019-11-20",
  },
  {
    id: "ankara",
    name: "Ankara Şubesi",
    address: "Atatürk Bulvarı No:120 Çankaya/Ankara",
    phone: "+90 (312) 555-0303",
    email: "ankara@kamas.com.tr",
    manager: "Mehmet Kaya",
    isActive: true,
    openingDate: "2021-01-10",
  },
  {
    id: "izmir",
    name: "İzmir Şubesi",
    address: "Cumhuriyet Bulvarı No:234 Konak/İzmir",
    phone: "+90 (232) 555-0404",
    email: "izmir@kamas.com.tr",
    manager: "Fatma Şahin",
    isActive: true,
    openingDate: "2021-06-05",
  },
  {
    id: "bursa",
    name: "Bursa Şubesi",
    address: "Atatürk Cad. No:56 Osmangazi/Bursa",
    phone: "+90 (224) 555-0505",
    email: "bursa@kamas.com.tr",
    manager: "Ali Öztürk",
    isActive: true,
    openingDate: "2022-02-14",
  },
  {
    id: "antalya",
    name: "Antalya Şubesi",
    address: "Atatürk Cad. No:89 Muratpaşa/Antalya",
    phone: "+90 (242) 555-0606",
    email: "antalya@kamas.com.tr",
    manager: "Zeynep Arslan",
    isActive: false,
    openingDate: "2022-09-01",
  },
];

interface BranchesPageProps {
  onNavigateToBranch?: (branchId: string) => void;
}

export default function BranchesPage({ onNavigateToBranch }: BranchesPageProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] =
    useState<"Tümü" | "Aktif" | "Pasif">("Tümü");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    manager: "",
    isActive: true,
    openingDate: "",
  });

  // --- Şubeleri backend'den çek ---
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE_URL}/branches?page=0&size=100&sort=id,asc`
        );

        if (!response.ok) {
          throw new Error(`Şubeler yüklenemedi (HTTP ${response.status})`);
        }

        const raw = await response.json();

        // Backend array veya Spring Page dönebilir, ikisine de uyumlu:
        const items: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any).content)
          ? (raw as any).content
          : [];

        const mapped: Branch[] = items.map((item: any) => ({
          id: String(item.id ?? item.branchId ?? item.code ?? Math.random()),
          name: item.name ?? "İsimsiz Şube",
          address: item.address ?? "",
          phone: item.phone ?? "",
          email: item.email ?? "",
          manager: item.manager ?? item.managerName ?? "",
          isActive: item.isActive ?? item.active ?? true,
          openingDate:
            item.openingDate ??
            item.openedAt ??
            new Date().toISOString().slice(0, 10),
        }));

        if (mapped.length === 0) {
          // Boş geldiyse en azından mock data göster
          setBranches(initialBranches);
        } else {
          setBranches(mapped);
        }
      } catch (err: any) {
        console.error("Şubeler yüklenirken hata:", err);
        setError(
          err?.message || "Şubeler yüklenirken bir hata oluştu. (BranchesPage)"
        );
        // Backend çökerse mock dataya düş
        setBranches(initialBranches);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);

  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
      manager: "",
      isActive: true,
      openingDate: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      manager: branch.manager,
      isActive: branch.isActive,
      openingDate: branch.openingDate,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    setFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
      manager: "",
      isActive: true,
      openingDate: "",
    });
  };

  // --- Ekle / Güncelle (POST / PUT) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
      manager: formData.manager, // backend'de managerName ise orayı güncelle
      isActive: formData.isActive,
      openingDate: formData.openingDate || null,
    };

    try {
      setError(null);

      if (editingBranch) {
        // UPDATE
        const response = await fetch(
          `${API_BASE_URL}/branches/${editingBranch.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          throw new Error(
            `Şube güncellenemedi (HTTP ${response.status})`
          );
        }

        const updated = await response.json().catch(() => null);

        setBranches((prev) =>
          prev.map((b) =>
            b.id === editingBranch.id
              ? {
                  ...b,
                  ...payload,
                  ...(updated
                    ? {
                        id: String(updated.id ?? b.id),
                        name: updated.name ?? payload.name,
                        address: updated.address ?? payload.address,
                        phone: updated.phone ?? payload.phone,
                        email: updated.email ?? payload.email,
                        manager:
                          updated.manager ??
                          updated.managerName ??
                          payload.manager,
                        isActive:
                          updated.isActive ?? updated.active ?? payload.isActive,
                        openingDate:
                          updated.openingDate ??
                          updated.openedAt ??
                          payload.openingDate,
                      }
                    : {}),
                }
              : b
          )
        );
      } else {
        // CREATE
        const response = await fetch(`${API_BASE_URL}/branches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(
            `Şube oluşturulamadı (HTTP ${response.status})`
          );
        }

        const created = await response.json().catch(() => null);

        const newBranch: Branch = {
          id: String(created?.id ?? Date.now()),
          name: created?.name ?? payload.name,
          address: created?.address ?? payload.address,
          phone: created?.phone ?? payload.phone,
          email: created?.email ?? payload.email,
          manager:
            created?.manager ?? created?.managerName ?? payload.manager,
          isActive:
            created?.isActive ?? created?.active ?? payload.isActive,
          openingDate:
            created?.openingDate ??
            created?.openedAt ??
            (payload.openingDate || new Date().toISOString().slice(0, 10)),
        };

        setBranches((prev) => [...prev, newBranch]);
      }

      closeModal();
    } catch (err: any) {
      console.error("Şube kaydedilirken hata:", err);
      setError(err?.message || "Şube kaydedilirken bir hata oluştu.");
    }
  };

  // --- Silme (DELETE) ---
  const handleDelete = async (branchId: string) => {
    if (!window.confirm("Bu şubeyi silmek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/branches/${branchId}`,
        { method: "DELETE" }
      );

      if (!response.ok && response.status !== 204) {
        console.warn(
          "Backend silme isteği başarısız oldu:",
          response.status
        );
      }

      setBranches((prev) => prev.filter((b) => b.id !== branchId));
    } catch (err: any) {
      console.error("Şube silinirken hata:", err);
      setError(err?.message || "Şube silinirken bir hata oluştu.");
    }
  };

  // --- Aktif/Pasif toggle (şimdilik sadece UI'da) ---
  const toggleStatus = (branchId: string) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === branchId ? { ...b, isActive: !b.isActive } : b
      )
    );
  };

  // --- Detay sayfasına git ---
  const handleViewDetails = (branchId: string) => {
    if (onNavigateToBranch) {
      onNavigateToBranch(branchId); // App.tsx -> BranchDetailPage
    }
  };

  // Filter branches
  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.manager.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "Tümü" ||
      (filterStatus === "Aktif" && b.isActive) ||
      (filterStatus === "Pasif" && !b.isActive);
    return matchesSearch && matchesStatus;
  });

  const activeCount = branches.filter((b) => b.isActive).length;
  const passiveCount = branches.filter((b) => !b.isActive).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pistachio-50 via-white to-gray-50">
      <AdminHeader title="Şube Yönetimi" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl px-5 py-4">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Toplam Şube</p>
                <p className="text-gray-900">{branches.length}</p>
              </div>
              <div className="bg-pistachio-100 p-3 rounded-xl">
                <Building2 className="text-pistachio-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Aktif Şube</p>
                <p className="text-gray-900">{activeCount}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <Building2 className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 mb-1">Pasif Şube</p>
                <p className="text-gray-900">{passiveCount}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-xl">
                <Building2 className="text-gray-600" size={24} />
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
                placeholder="Şube adı, adres veya müdür ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors w-full sm:w-80"
              />

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
              Yeni Şube Ekle
            </button>
          </div>
        </div>

        {/* Branches Grid */}
        {loading && branches.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md border-2 border-gray-100">
            <Building2 className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">Şubeler yükleniyor...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredBranches.map((branch) => (
                <div
                  key={branch.id}
                  className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-3 rounded-xl ${
                            branch.isActive ? "bg-pistachio-100" : "bg-gray-100"
                          }`}
                        >
                          <Building2
                            className={
                              branch.isActive
                                ? "text-pistachio-600"
                                : "text-gray-600"
                            }
                            size={24}
                          />
                        </div>
                        <div>
                          <h3 className="text-gray-800">{branch.name}</h3>
                          <button
                            onClick={() => toggleStatus(branch.id)}
                            className={`mt-1 px-2 py-1 text-sm rounded-lg transition-colors ${
                              branch.isActive
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {branch.isActive ? "Aktif" : "Pasif"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-4 mb-6">
                      <div className="flex items-start gap-3">
                        <MapPin
                          className="text-gray-400 mt-1 flex-shrink-0"
                          size={18}
                        />
                        <p className="text-gray-600">{branch.address}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Phone
                          className="text-gray-400 flex-shrink-0"
                          size={18}
                        />
                        <p className="text-gray-600">{branch.phone}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Mail
                          className="text-gray-400 flex-shrink-0"
                          size={18}
                        />
                        <p className="text-gray-600">{branch.email}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <User
                          className="text-gray-400 flex-shrink-0"
                          size={18}
                        />
                        <p className="text-gray-600">
                          <span className="text-gray-500">Müdür: </span>
                          {branch.manager}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-gray-500">
                          Açılış Tarihi:{" "}
                          {new Date(
                            branch.openingDate
                          ).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleViewDetails(branch.id)}
                        className="flex-1 px-5 py-3 bg-pistachio-500 hover:bg-pistachio-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                      >
                        <ExternalLink size={18} />
                        Detayını Gör
                      </button>
                      <button
                        onClick={() => openEditModal(branch)}
                        className="p-3 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors"
                        title="Düzenle"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(branch.id)}
                        className="p-3 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredBranches.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center shadow-md border-2 border-gray-100 mt-6">
                <Building2 className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500">Şube bulunamadı</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b-2 border-gray-100 p-6 flex items-center justify-between">
              <h3 className="text-gray-800">
                {editingBranch ? "Şube Düzenle" : "Yeni Şube Ekle"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Form fields already have proper spacing, but let's ensure labels have more space */}
              {/* Branch Name */}
              <div>
                <label className="block text-gray-700 mb-3 font-medium">Şube Adı *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  placeholder="Kadıköy Şubesi"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-gray-700 mb-3 font-medium">Adres *</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  placeholder="Tam adres"
                  rows={3}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-gray-700 mb-3 font-medium">Telefon *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  placeholder="+90 (216) 555-0101"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 mb-3 font-medium">E-posta *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  placeholder="sube@kamas.com.tr"
                />
              </div>

              {/* Manager */}
              <div>
                <label className="block text-gray-700 mb-3 font-medium">
                  Şube Müdürü *
                </label>
                <input
                  type="text"
                  required
                  value={formData.manager}
                  onChange={(e) =>
                    setFormData({ ...formData, manager: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                  placeholder="Ahmet Yılmaz"
                />
              </div>

              {/* Opening Date */}
              <div>
                <label className="block text-gray-700 mb-3 font-medium">
                  Açılış Tarihi *
                </label>
                <input
                  type="date"
                  required
                  value={formData.openingDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      openingDate: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pistachio-500 transition-colors"
                />
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
                  Şube aktif
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
                  {editingBranch ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
