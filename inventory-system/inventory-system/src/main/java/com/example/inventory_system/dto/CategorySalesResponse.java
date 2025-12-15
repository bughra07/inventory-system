package com.example.inventory_system.dto;

import java.math.BigDecimal;

public record CategorySalesResponse(
        Long categoryId,
        String categoryName,
        BigDecimal revenue,      // kategori toplam satış geliri
        BigDecimal cogs,         // kategori toplam maliyeti
        BigDecimal grossProfit,  // revenue - cogs
        Double marginPercent     // (gross / revenue) * 100, revenue 0 ise null
) {}
