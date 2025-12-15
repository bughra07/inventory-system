import { Package, ChevronLeft } from "lucide-react";

export function AdminHeader() {
  return (
    <div className="bg-white border-b-2 border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-4">
              <div className="bg-pistachio-500 p-3 rounded-xl">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-pistachio-700 text-xl font-bold mb-1">KAMAŞ</h2>
                <p className="text-gray-500 text-sm">Yönetici Paneli</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
