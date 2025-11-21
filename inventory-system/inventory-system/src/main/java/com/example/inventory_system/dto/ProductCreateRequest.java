package com.example.inventory_system.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class ProductCreateRequest {

    private Long categoryId;


    @NotBlank @Size(min = 2, max = 96)
    private String name;

    @NotBlank @Size(min = 2, max = 64)
    private String sku;

    @NotNull @DecimalMin("0.00")
    private BigDecimal price;

    @NotNull @Min(0)
    private Integer stock;

    @NotNull
    private Long branchId;

    public ProductCreateRequest() {}

    public ProductCreateRequest(String name, String sku, BigDecimal price, Integer stock, Long branchId) {
        this.name = name; this.sku = sku; this.price = price; this.stock = stock; this.branchId = branchId;
    }

    public String getName() { return name; }
    public String getSku() { return sku; }
    public BigDecimal getPrice() { return price; }
    public Integer getStock() { return stock; }
    public Long getBranchId() { return branchId; }
    public Long getCategoryId() { return categoryId; }


    public void setName(String name) { this.name = name; }
    public void setSku(String sku) { this.sku = sku; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public void setStock(Integer stock) { this.stock = stock; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

}
