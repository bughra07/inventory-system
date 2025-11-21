package com.example.inventory_system.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductResponse(
        Long id,
        String name,
        String sku,
        BigDecimal price,
        Integer stock,
        Long branchId,
        String branchName,
        LocalDateTime createdAt,
        Long categoryId,
        String categoryName
) {}
