package com.example.inventory_system.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "categories", uniqueConstraints = {
        @UniqueConstraint(name = "uk_categories_name", columnNames = "name")
})
public class Category {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 96, unique = true)
    private String name;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Category() {}

    public Category(String name) { this.name = name; }

    // getters & setters
    public Long getId() { return id; }
    public String getName() { return name; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setName(String name) { this.name = name; }
}
