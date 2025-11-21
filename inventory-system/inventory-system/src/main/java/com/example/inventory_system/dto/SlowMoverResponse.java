package com.example.inventory_system.dto;

public record SlowMoverResponse(
        Long productId,
        String productName,
        Long totalQuantity
) {}
