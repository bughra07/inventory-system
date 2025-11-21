package com.example.inventory_system.dto;

import java.math.BigDecimal;

public record IncomeStatementResponse(
        String from,
        String to,
        Long branchId,
        BigDecimal revenue,
        BigDecimal cogs,
        BigDecimal grossProfit
) {}
