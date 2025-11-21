package com.example.inventory_system.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record SaleCreateRequest(
        @NotNull Long branchId,
        @NotNull @Size(min = 1) List<Item> items
) {
    public record Item(
            @NotNull Long productId,
            @NotNull @Positive Integer quantity,
            @NotNull @DecimalMin("0.00") BigDecimal unitPrice
    ) {}
}
