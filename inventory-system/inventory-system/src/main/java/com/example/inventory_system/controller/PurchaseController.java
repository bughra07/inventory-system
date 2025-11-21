package com.example.inventory_system.controller;

import com.example.inventory_system.dto.PurchaseRequest;
import com.example.inventory_system.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/purchases")
public class PurchaseController {

    private final InventoryService inventoryService;

    public PurchaseController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping(consumes = "application/json")
    public ResponseEntity<Void> receive(@Valid @RequestBody PurchaseRequest req) {
        inventoryService.receiveBatch(req);
        return ResponseEntity.noContent().build();
    }
}
