package com.example.inventory_system.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "branches")
public class Branch {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false, length=64, unique=true)
    private String name;

    @Column(nullable=false, length=128)
    private String address;

    @Column(nullable=false, length=16)
    private String phone;

    @Column(nullable=false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Branch() {}

    public Branch(String name, String address, String phone) {
        this.name = name;
        this.address = address;
        this.phone = phone;
    }

    // getters & setters
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getAddress() { return address; }
    public String getPhone() { return phone; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setName(String name) { this.name = name; }
    public void setAddress(String address) { this.address = address; }
    public void setPhone(String phone) { this.phone = phone; }
}
