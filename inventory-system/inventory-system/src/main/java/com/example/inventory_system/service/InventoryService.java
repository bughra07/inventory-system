package com.example.inventory_system.service;

import com.example.inventory_system.dto.PurchaseRequest;
import com.example.inventory_system.dto.SaleCreateRequest;
import com.example.inventory_system.dto.SaleResponse;

public interface InventoryService {

    /**
     * Satış oluşturur, FIFO'ya göre batch tüketir, COGS hesaplar ve detaylı SaleResponse döner.
     */
    SaleResponse createSale(SaleCreateRequest request);

    /**
     * Tek ürünlük purchase isteğine göre batch ekler ve stokları günceller.
     */
    void receiveBatch(PurchaseRequest request);
}
