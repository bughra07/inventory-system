package com.example.inventory_system.dto;

import java.time.LocalDate;
import java.util.List;

public record MlRecommendationResponse(
        LocalDate from,
        LocalDate to,
        Long branchId,
        int horizonDays,
        Double rmse,          // model performansı: root mean squared error (eğitim dönemi)
        Double mape,          // model performansı: mean absolute percentage error
        int sampleCount,      // kaç günlük veriyle hesaplandı
        List<MlRecommendationItemResponse> items
) {}
