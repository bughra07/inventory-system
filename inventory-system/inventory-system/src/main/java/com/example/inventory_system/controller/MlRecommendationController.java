package com.example.inventory_system.controller;

import com.example.inventory_system.dto.MlRecommendationResponse;
import com.example.inventory_system.service.MlRecommendationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/recommendations/ml")
public class MlRecommendationController {

    private final MlRecommendationService service;

    public MlRecommendationController(MlRecommendationService service) {
        this.service = service;
    }

    @GetMapping
    public MlRecommendationResponse getMlRecommendations(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to")   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId,
            @RequestParam(name = "horizonDays", defaultValue = "30") int horizonDays
    ) {
        return service.generate(from, to, branchId, horizonDays);
    }
}
