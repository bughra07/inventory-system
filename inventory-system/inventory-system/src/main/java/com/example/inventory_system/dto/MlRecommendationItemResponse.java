package com.example.inventory_system.dto;

public record MlRecommendationItemResponse(
        Long productId,
        String productName,
        Long branchId,
        long currentStock,
        double baselineDailySales,       // basit ortalama
        Double trendDailySales,          // lineer regresyon trend tahmini (null olabilir)
        Double seasonalFactor,           // 1.0 üstü = yüksek sezon, altı = düşük sezon (null olabilir)
        Double finalPredictedDaily,      // trend + sezonsallık ile nihai günlük tahmin
        Double finalPredictedDemand,     // horizonDays boyunca beklenen talep
        long expiringSoonQuantity,       // SKT yaklaşan stok (branch veya tüm şubeler)
        String recommendation,           // BUY / HOLD / AVOID / PROMOTE / TRANSFER_OR_PROMOTE
        double riskScore,                // 0.0 (rahat) - 1.0 (yüksek risk)
        String explanation,               // okunabilir açıklama
        String velocityClass

) {}
