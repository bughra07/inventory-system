package com.example.inventory_system.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SalesTrendPointResponse(
        LocalDate date,
        BigDecimal revenue,     // o günün toplam satış geliri
        BigDecimal cogs,        // o günün toplam maliyeti
        BigDecimal grossProfit  // revenue - cogs
) {}
