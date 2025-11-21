package com.example.inventory_system.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface PurchaseService {
    void createPurchase(Long branchId, List<PurchaseLine> lines);

    record PurchaseLine(Long productId, int quantity, BigDecimal unitCost, LocalDate expiry) {}
}
