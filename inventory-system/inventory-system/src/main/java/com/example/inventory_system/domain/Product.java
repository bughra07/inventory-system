package com.example.inventory_system.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.example.inventory_system.domain.Category;

@JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
@Entity
@Table(name = "products",
        indexes = {
                @Index(name = "idx_products_sku", columnList = "sku", unique = true),
                @Index(name = "idx_products_branch_id", columnList = "branch_id")
        })



public class Product {

 /*   @Version
    private Long version;
    public Long getVersion() { return version; }
*/

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;


    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false, length=96)
    private String name;

    @Column(nullable=false, length=64, unique = true)
    private String sku;

    @Column(nullable=false, precision = 14, scale = 2)
    private BigDecimal price;

    @Column(nullable=false)
    private Integer stock;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @Column(nullable=false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Product() {}

    public Product(String name, String sku, BigDecimal price, Integer stock, Branch branch) {
        this.name = name;
        this.sku = sku;
        this.price = price;
        this.stock = stock;
        this.branch = branch;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getSku() { return sku; }
    public BigDecimal getPrice() { return price; }
    public Integer getStock() { return stock; }
    public Branch getBranch() { return branch; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setName(String name) { this.name = name; }
    public void setSku(String sku) { this.sku = sku; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public void setStock(Integer stock) { this.stock = stock; }
    public void setBranch(Branch branch) { this.branch = branch; }

    // getter & setter
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
}
