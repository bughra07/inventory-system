package com.example.inventory_system.dto;

public record BestSellerResponse(
        Long productId,
        String productName,
        Long totalQuantity
) {}
