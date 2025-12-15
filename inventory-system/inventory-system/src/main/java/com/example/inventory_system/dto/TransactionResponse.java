package com.example.inventory_system.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class TransactionResponse {

    private Long id;             // transaction id (purchase = batch id, sale = saleItem id)
    private String type;         // "purchase" | "sale"
    private Long productId;
    private String productName;
    private Long branchId;
    private String branchName;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    private LocalDateTime date;
    private LocalDate expiryDate; // sadece satın almalar için dolu olacak

    public TransactionResponse() {
    }

    public TransactionResponse(Long id,
                               String type,
                               Long productId,
                               String productName,
                               Long branchId,
                               String branchName,
                               Integer quantity,
                               BigDecimal unitPrice,
                               BigDecimal totalPrice,
                               LocalDateTime date,
                               LocalDate expiryDate) {
        this.id = id;
        this.type = type;
        this.productId = productId;
        this.productName = productName;
        this.branchId = branchId;
        this.branchName = branchName;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.totalPrice = totalPrice;
        this.date = date;
        this.expiryDate = expiryDate;
    }

    public Long getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public Long getProductId() {
        return productId;
    }

    public String getProductName() {
        return productName;
    }

    public Long getBranchId() {
        return branchId;
    }

    public String getBranchName() {
        return branchName;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    public LocalDateTime getDate() {
        return date;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }
}
