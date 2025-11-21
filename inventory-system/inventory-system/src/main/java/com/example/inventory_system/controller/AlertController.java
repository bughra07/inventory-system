package com.example.inventory_system.controller;

import com.example.inventory_system.dto.ExpiringBatchResponse;
import com.example.inventory_system.repository.ProductBatchRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/alerts")
public class AlertController {

    private final ProductBatchRepository batches;

    public AlertController(ProductBatchRepository batches) {
        this.batches = batches;
    }

    @GetMapping("/expiring")
    public List<ExpiringBatchResponse> expiring(
            @RequestParam(name = "withinDays", defaultValue = "30") int withinDays,
            @RequestParam(name = "branchId", required = false) Long branchId
    ) {
        LocalDate until = LocalDate.now().plusDays(withinDays);
        return batches.expiringUntil(until, branchId).stream()
                .map(b -> new ExpiringBatchResponse(
                        b.getId(),
                        b.getProduct().getId(),
                        b.getProduct().getName(),
                        b.getBranch().getId(),
                        b.getBranch().getName(),
                        b.getExpiryDate(),
                        b.getQuantity(),
                        b.getUnitCost()
                ))
                .toList();
    }
}
