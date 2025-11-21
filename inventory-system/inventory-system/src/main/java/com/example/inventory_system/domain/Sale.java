package com.example.inventory_system.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sales")
public class Sale {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Sale() {}
    public Sale(Branch branch, BigDecimal totalAmount) {
        this.branch = branch;
        this.totalAmount = totalAmount;
    }

    public Long getId() { return id; }
    public Branch getBranch() { return branch; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
}
