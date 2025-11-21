package com.example.inventory_system.dto;

import java.math.BigDecimal;

public record RecommendationItemResponse(
        Long productId,
        String productName,
        Long branchId,
        long soldQuantity,          // seçilen dönemde toplam satış (adet)
        long currentStock,          // ilgili şubede (veya tüm şubelerde) mevcut stok
        Double avgDailySales,       // pencere bazlı ortalama günlük satış
        Double daysToEmpty,         // tahmini tükenme süresi (gün) - null olabilir
        long expiringSoonQuantity,  // expiryWindow içinde bitecek adet
        String recommendation,      // BUY / HOLD / AVOID / PROMOTE / TRANSFER / WATCH
        String explanation          // insanlar için okunabilir açıklama
) {}
