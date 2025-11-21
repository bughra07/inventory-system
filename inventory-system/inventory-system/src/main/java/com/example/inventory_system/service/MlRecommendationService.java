package com.example.inventory_system.service;

import com.example.inventory_system.dto.MlRecommendationResponse;

import java.time.LocalDate;

public interface MlRecommendationService {

    MlRecommendationResponse generate(
            LocalDate from,
            LocalDate to,
            Long branchId,
            int horizonDays
    );
}
