package com.example.inventory_system.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record PurchaseRequest(
        @NotNull Long productId,
        @NotNull Long branchId,
        @NotNull @Positive Integer quantity,
        @NotNull @DecimalMin("0.00") BigDecimal unitCost,
        LocalDate expiryDate
) {}
