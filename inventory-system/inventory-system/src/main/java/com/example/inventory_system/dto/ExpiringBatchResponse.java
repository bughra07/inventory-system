package com.example.inventory_system.dto;

import java.time.LocalDate;
import java.math.BigDecimal;

public record ExpiringBatchResponse(
        Long batchId,
        Long productId,
        String productName,
        Long branchId,
        String branchName,
        LocalDate expiryDate,
        Integer quantity,
        BigDecimal unitCost
) {}
