package com.example.inventory_system.dto;

public record SlowMoverResponse(
        Long productId,
        String productName,
        String sku,
        Long totalQuantity,
        Long daysSinceLastSale   // bugün - son satış günü (null olabilir)
) {}
