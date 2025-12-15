package com.example.inventory_system.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class BranchTransfer {

    public enum Status {
        COMPLETED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Product product;

    @ManyToOne(optional = false)
    @JoinColumn(name = "source_branch_id")
    private Branch sourceBranch;

    @ManyToOne(optional = false)
    @JoinColumn(name = "target_branch_id")
    private Branch targetBranch;

    @Column(nullable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Status status = Status.COMPLETED;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public BranchTransfer() {
    }

    public BranchTransfer(Product product,
                          Branch sourceBranch,
                          Branch targetBranch,
                          Integer quantity,
                          Status status) {
        this.product = product;
        this.sourceBranch = sourceBranch;
        this.targetBranch = targetBranch;
        this.quantity = quantity;
        this.status = status != null ? status : Status.COMPLETED;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = Status.COMPLETED;
        }
    }

    // --- GETTER / SETTER'lar ---

    public Long getId() {
        return id;
    }

    public Product getProduct() {
        return product;
    }

    public Branch getSourceBranch() {
        return sourceBranch;
    }

    public Branch getTargetBranch() {
        return targetBranch;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public Status getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public void setSourceBranch(Branch sourceBranch) {
        this.sourceBranch = sourceBranch;
    }

    public void setTargetBranch(Branch targetBranch) {
        this.targetBranch = targetBranch;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
