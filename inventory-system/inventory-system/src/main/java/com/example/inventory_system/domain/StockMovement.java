package com.example.inventory_system.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_movements",
        indexes = @Index(name="idx_stock_movements_product_id", columnList = "product_id"))
public class StockMovement {

    public enum Type { IN, OUT }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Type type;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public StockMovement() {}
    public StockMovement(Product product, Type type, Integer quantity) {
        this.product = product; this.type = type; this.quantity = quantity;
    }

    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public Type getType() { return type; }
    public Integer getQuantity() { return quantity; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
