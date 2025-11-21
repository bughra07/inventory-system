package com.example.inventory_system.service;

import com.example.inventory_system.dto.RecommendationItemResponse;

import java.time.LocalDate;
import java.util.List;

public interface RecommendationService {

    /**
     * Belirli tarih aralığı ve şube için ürün bazlı stok & satış verilerini analiz eder,
     * her ürün için aksiyon önerir.
     *
     * @param from             satış analiz başlangıç tarihi (dahil)
     * @param to               satış analiz bitiş tarihi (dahil)
     * @param branchId         opsiyonel şube (null = tüm şubeler)
     * @param tteWindowDays    Time-to-Empty hesaplama penceresi (örn: 30)
     * @param expiryWindowDays SKT yaklaşma eşiği (örn: 30)
     */
    List<RecommendationItemResponse> generate(
            LocalDate from,
            LocalDate to,
            Long branchId,
            int tteWindowDays,
            int expiryWindowDays
    );
}
