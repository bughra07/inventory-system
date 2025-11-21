package com.example.inventory_system.controller;

import com.example.inventory_system.dto.SaleCreateRequest;
import com.example.inventory_system.dto.SaleResponse;
import com.example.inventory_system.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sales")
public class SalesController {

    private final InventoryService inventoryService;

    public SalesController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping(consumes = "application/json", produces = "application/json")
    public SaleResponse create(@Valid @RequestBody SaleCreateRequest req) {
        return inventoryService.createSale(req);
    }
}
