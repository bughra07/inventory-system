package com.example.inventory_system.dto;

public record BranchTransferResponse(
        Long id,
        String createdAt,
        Long productId,
        String productName,
        Long sourceBranchId,
        String sourceBranchName,
        Long targetBranchId,
        String targetBranchName,
        Integer quantity,
        String status
) {}
