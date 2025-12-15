package com.example.inventory_system.dto;

public record BranchTransferCreateRequest(
        Long productId,
        Long sourceBranchId,
        Long targetBranchId,
        Integer quantity
) {}
