package com.example.inventory_system.dto;

import java.time.LocalDateTime;

public record CategoryResponse(Long id, String name, LocalDateTime createdAt) {}
