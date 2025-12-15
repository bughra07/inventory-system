import { useState } from "react";
import { RoleCard } from "./components/RoleCard";
import { ChevronDown, Package } from "lucide-react";
import AdminDashboard from "./pages/AdminDashboard";
import BranchDetailPage from "./pages/BranchDetailPage";
import ReportsPage from "./pages/ReportsPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import TransferPage from "./pages/TransferPage";
import ProductsPage from "./pages/ProductsPage";
import BranchesPage from "./pages/BranchesPage";
import TransactionsPage from "./pages/TransactionsPage";

type Role = "admin" | "branch" | null;
type Page =
  | "home"
  | "admin-dashboard"
  | "branch-detail"
  | "reports"
  | "recommendations"
  | "transfer"
  | "products"
  | "branches"
  | "transactions";

const branches = [
  "Kadıköy",
  "Beşiktaş",
  "Ankara",
  "İzmir",
  "Bursa",
  "Antalya",
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleContinue = () => {
    if (selectedRole === "admin") {
      setCurrentPage("admin-dashboard");
    } else if (selectedRole === "branch" && selectedBranch) {
      const branchId = selectedBranch
        .toLowerCase()
        .replace(/ı/g, "i")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c");
      console.log(`Branch dashboard: ${branchId}`);
    }
  };

  const handleBranchDetailNavigation = (branchId: string) => {
    setSelectedBranchId(branchId);
    setCurrentPage("branch-detail");
  };

  const handleReportsNavigation = () => {
    setCurrentPage("reports");
  };

  const handleRecommendationsNavigation = () => {
    setCurrentPage("recommendations");
  };

  const handleTransferNavigation = () => {
    setCurrentPage("transfer");
  };

  const handleProductsNavigation = () => {
    setCurrentPage("products");
  };

  const handleBranchesNavigation = () => {
    setCurrentPage("branches");
  };

  const handleTransactionsNavigation = () => {
    setCurrentPage("transactions");
  };

  const canContinue =
    selectedRole === "admin" ||
    (selectedRole === "branch" && selectedBranch);

  if (currentPage === "admin-dashboard") {
    return (
      <AdminDashboard
        onNavigateToBranch={handleBranchDetailNavigation}
        onNavigateToReports={handleReportsNavigation}
        onNavigateToRecommendations={handleRecommendationsNavigation}
        onNavigateToTransfer={handleTransferNavigation}
        onNavigateToProducts={handleProductsNavigation}
        onNavigateToBranches={handleBranchesNavigation}
        onNavigateToTransactions={handleTransactionsNavigation}
      />
    );
  }

  if (currentPage === "branch-detail") {
    return <BranchDetailPage branchId={selectedBranchId} />;
  }

  if (currentPage === "reports") {
    return <ReportsPage />;
  }

  if (currentPage === "recommendations") {
    return <RecommendationsPage />;
  }

  if (currentPage === "transfer") {
    return <TransferPage />;
  }

  if (currentPage === "products") {
    return <ProductsPage />;
  }

  if (currentPage === "branches") {
    return (
      <BranchesPage onNavigateToBranch={handleBranchDetailNavigation} />
    );
  }

  if (currentPage === "transactions") {
    return <TransactionsPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pistachio-100 via-white to-pistachio-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="bg-pistachio-500 p-4 rounded-2xl shadow-lg">
              <Package className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-pistachio-700 text-2xl font-bold">KAMAŞ</h1>
            </div>
          </div>
          <h2 className="text-gray-700 mb-3 text-xl font-semibold">Envanter Sistemi</h2>
          <p className="text-gray-500 text-base">
            Şube bazlı stok, satış ve öneri yönetimi
          </p>
        </div>

        {/* Role Selection Title */}
        <h3 className="text-gray-800 mb-8 text-center text-xl font-semibold">Rolünüzü Seçin</h3>

        {/* Role Selection */}
        <div className="mb-8">
          <div className="space-y-6 mb-10">
            <RoleCard
              role="admin"
              title="Yönetici"
              description="Tüm şubeleri, raporları ve öneri modülünü görür."
              isSelected={selectedRole === "admin"}
              onClick={() => setSelectedRole("admin")}
            />

            <RoleCard
              role="branch"
              title="Şube Çalışanı"
              description="Sadece kendi şubesinin stok & satış verilerini görür."
              isSelected={selectedRole === "branch"}
              onClick={() => setSelectedRole("branch")}
            />
          </div>

          {/* Branch Selection - Only show if Branch Employee is selected */}
          {selectedRole === "branch" && (
            <div className="animate-fadeIn">
              <label className="block mb-3 text-gray-700">
                Şube Seçimi
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl bg-white hover:border-pistachio-400 focus:outline-none focus:border-pistachio-500 transition-all flex items-center justify-between shadow-lg hover:shadow-xl"
                >
                  <span
                    className={
                      selectedBranch ? "text-gray-800" : "text-gray-400"
                    }
                  >
                    {selectedBranch || "Şube seçiniz..."}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                    <div className="max-h-60 overflow-auto">
                      {branches.map((branch, index) => (
                        <button
                          key={branch}
                          onClick={() => {
                            setSelectedBranch(branch);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-5 py-4 text-left hover:bg-pistachio-50 transition-colors ${
                            index === 0 ? "rounded-t-2xl" : ""
                          } ${
                            index === branches.length - 1
                              ? "rounded-b-2xl"
                              : ""
                          } ${
                            selectedBranch === branch
                              ? "bg-pistachio-100 text-pistachio-700"
                              : "text-gray-700"
                          }`}
                        >
                          {branch}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            style={{ fontWeight: 800 }}
            className={`w-full mt-10 px-8 py-5 rounded-2xl transition-all duration-300 text-lg ${
              canContinue
                ? "bg-pistachio-500 hover:bg-pistachio-600 text-white shadow-lg hover:shadow-2xl transform hover:-translate-y-1"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Devam Et
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center px-4">
          <p className="text-gray-400">
            Gerçek login/JWT backend tarafına eklenebilir, şu an demo
            navigasyon.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
