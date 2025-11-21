package com.example.inventory_system.controller;

import com.example.inventory_system.dto.RecommendationItemResponse;
import com.example.inventory_system.service.RecommendationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/recommendations")
public class RecommendationController {

    private final RecommendationService service;

    public RecommendationController(RecommendationService service) {
        this.service = service;
    }

    /**
     * Örnek istek:
     * GET /api/v1/recommendations?from=2025-01-01&to=2025-12-31&branchId=1&tteWindowDays=30&expiryWindowDays=30
     */
    @GetMapping
    public List<RecommendationItemResponse> getRecommendations(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to")   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId,
            @RequestParam(name = "tteWindowDays", defaultValue = "30") int tteWindowDays,
            @RequestParam(name = "expiryWindowDays", defaultValue = "30") int expiryWindowDays
    ) {
        return service.generate(from, to, branchId, tteWindowDays, expiryWindowDays);
    }
}
    