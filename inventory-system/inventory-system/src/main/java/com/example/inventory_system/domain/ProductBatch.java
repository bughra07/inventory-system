package com.example.inventory_system.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_batches")
public class ProductBatch {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(optional = false) @JoinColumn(name = "branch_id")
    private Branch branch;

    private LocalDate expiryDate;

    @Column(nullable = false)
    private java.math.BigDecimal unitCost;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public ProductBatch() {}
    public ProductBatch(Product product, Branch branch, LocalDate expiryDate,
                        java.math.BigDecimal unitCost, Integer quantity) {
        this.product = product;
        this.branch = branch;
        this.expiryDate = expiryDate;
        this.unitCost = unitCost;
        this.quantity = quantity;
    }

    // getters/setters
    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public Branch getBranch() { return branch; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public java.math.BigDecimal getUnitCost() { return unitCost; }
    public Integer getQuantity() { return quantity; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
