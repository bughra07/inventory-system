package com.example.inventory_system.dto;

import java.math.BigDecimal;

public record ProductMarginResponse(
        Long productId,
        String productName,
        String sku,
        BigDecimal revenue,      // ürün bazlı toplam satış geliri
        BigDecimal cogs,         // toplam maliyet
        BigDecimal profit,       // revenue - cogs
        Double marginPercent     // (profit / revenue) * 100, revenue 0 ise null
) {}
