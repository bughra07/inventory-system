package com.example.inventory_system.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SaleResponse(
        Long id,
        Long branchId,
        BigDecimal totalAmount,
        LocalDateTime createdAt,
        List<Line> lines
) {
    public record Line(
            Long productId,
            Integer quantity,
            java.math.BigDecimal unitPrice,
            java.math.BigDecimal cogsAmount
    ) {}
}
