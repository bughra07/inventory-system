package com.example.inventory_system.dto;

public record TimeToEmptyResponse(
        Long productId,
        String productName,
        Integer currentStock,
        double avgDailySales,
        Double estimatedDaysToEmpty // null = satış yok
) {}
