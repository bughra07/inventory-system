package com.example.inventory_system.dto;

import java.math.BigDecimal;

public record BestSellerResponse(
        Long productId,
        String productName,
        Long totalQuantity,
        BigDecimal totalValue   // ✅ yeni alan
) {}
