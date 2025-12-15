package com.example.inventory_system.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class

AdjustStockRequest {
    public enum Type { IN, OUT }

    @NotNull
    private Type type;

    @NotNull @Min(1)
    private Integer quantity;

    public AdjustStockRequest() {}

    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
