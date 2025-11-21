package com.example.inventory_system.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sale_items")
public class SaleItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) @JoinColumn(name = "sale_id")
    private Sale sale;

    @ManyToOne(optional = false) @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private BigDecimal unitPrice;

    private BigDecimal cogsAmount; // hesaplanıp yazılacak

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public SaleItem() {}
    public SaleItem(Sale sale, Product product, Integer quantity,
                    BigDecimal unitPrice, BigDecimal cogsAmount) {
        this.sale = sale;
        this.product = product;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.cogsAmount = cogsAmount;
    }

    public Long getId() { return id; }
    public Sale getSale() { return sale; }
    public Product getProduct() { return product; }
    public Integer getQuantity() { return quantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public BigDecimal getCogsAmount() { return cogsAmount; }
}
