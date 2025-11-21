package com.example.inventory_system.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface SalesService {
    Long createSale(Long branchId, List<SaleLine> lines, LocalDateTime createdAt);

    record SaleLine(Long productId, int quantity, BigDecimal unitPrice) {}
}
