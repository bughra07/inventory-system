package com.example.inventory_system.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CategoryCreateRequest {
    @NotBlank @Size(min=2, max=96)
    private String name;

    public CategoryCreateRequest() {}
    public CategoryCreateRequest(String name) { this.name = name; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
