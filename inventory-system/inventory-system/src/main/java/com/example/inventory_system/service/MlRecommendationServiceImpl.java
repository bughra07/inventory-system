package com.example.inventory_system.service;

import com.example.inventory_system.domain.Product;
import com.example.inventory_system.dto.MlRecommendationItemResponse;
import com.example.inventory_system.dto.MlRecommendationResponse;
import com.example.inventory_system.repository.ProductBatchRepository;
import com.example.inventory_system.repository.ProductRepository;
import com.example.inventory_system.repository.SaleItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MlRecommendationServiceImpl implements MlRecommendationService {

    private final ProductRepository products;
    private final SaleItemRepository saleItems;
    private final ProductBatchRepository batches;

    @Override
    public MlRecommendationResponse generate(LocalDate from, LocalDate to, Long branchId, int horizonDays) {
        if (horizonDays <= 0) horizonDays = 30;

        LocalDateTime fromTs = from.atStartOfDay();
        LocalDateTime toTs = to.plusDays(1).atStartOfDay();

        // === 1) Günlük satış serisi ===
        List<Object[]> rows = saleItems.dailySalesByProduct(fromTs, toTs, branchId);

        // productId -> (date -> qty)
        Map<Long, NavigableMap<LocalDate, Long>> seriesByProduct = new HashMap<>();
        for (Object[] r : rows) {
            Long pid = (Long) r[0];
            LocalDate day;
            Object raw = r[1];
            if (raw instanceof java.sql.Date d) day = d.toLocalDate();
            else if (raw instanceof java.sql.Timestamp ts) day = ts.toLocalDateTime().toLocalDate();
            else if (raw instanceof LocalDate ld) day = ld;
            else if (raw instanceof LocalDateTime ldt) day = ldt.toLocalDate();
            else throw new IllegalStateException("Unsupported date type: " + raw.getClass());

            Long qty = (Long) r[2];

            seriesByProduct
                    .computeIfAbsent(pid, k -> new TreeMap<>())
                    .merge(day, qty != null ? qty : 0L, Long::sum);
        }

        long totalDays = Math.max(1, ChronoUnit.DAYS.between(from, to) + 1);

        // === 2) Stok & SKT ===
        Map<Long, Long> stockByProduct = new HashMap<>();
        for (Object[] r : batches.stockByProduct(branchId)) {
            Long pid = (Long) r[0];
            Long qty = (Long) r[1];
            stockByProduct.put(pid, qty != null ? qty : 0L);
        }

        LocalDate expiryLimit = LocalDate.now().plusDays(30);
        Map<Long, Long> expiringByProduct = new HashMap<>();
        for (Object[] r : batches.expiringStockByProduct(expiryLimit, branchId)) {
            Long pid = (Long) r[0];
            Long qty = (Long) r[1];
            expiringByProduct.put(pid, qty != null ? qty : 0L);
        }

        // Şube bazlı stok (branchId null ise transfer önerileri için)
        Map<Long, Map<Long, Long>> stockByProdBranch = new HashMap<>();
        Map<Long, Map<Long, Long>> expiringByProdBranch = new HashMap<>();
        if (branchId == null) {
            for (Object[] r : batches.stockByProductAndBranch()) {
                Long pid = (Long) r[0];
                Long bid = (Long) r[1];
                Long qty = (Long) r[2];
                stockByProdBranch
                        .computeIfAbsent(pid, k -> new HashMap<>())
                        .put(bid, qty != null ? qty : 0L);
            }
            for (Object[] r : batches.expiringStockByProductAndBranch(expiryLimit)) {
                Long pid = (Long) r[0];
                Long bid = (Long) r[1];
                Long qty = (Long) r[2];
                expiringByProdBranch
                        .computeIfAbsent(pid, k -> new HashMap<>())
                        .put(bid, qty != null ? qty : 0L);
            }
        }

        // === 3) Model performansı için global hata metrikleri (BACKTEST) ===
        double sumSqErr = 0.0;
        double sumApe = 0.0;
        int perfCount = 0;  // RMSE için test nokta sayısı
        int apeCount = 0;   // MAPE için sadece actual>0 gün sayısı

        List<MlRecommendationItemResponse> items = new ArrayList<>();

        for (Product p : products.findAll()) {
            Long pid = p.getId();
            String name = p.getName();

            NavigableMap<LocalDate, Long> series = seriesByProduct.get(pid);
            long currentStock = stockByProduct.getOrDefault(pid, 0L);
            long expSoon = expiringByProduct.getOrDefault(pid, 0L);

            // === 3.1 Baseline: ortalama günlük satış ===
            double baselineDaily = 0.0;
            if (series != null && !series.isEmpty()) {
                long totalQty = series.values().stream().mapToLong(Long::longValue).sum();
                baselineDaily = (double) totalQty / totalDays;
            }

            // === 3.2 Trend (lineer regresyon) + BACKTEST (train/test) ===
            Double trendDaily = null;

            // tutarlılık için: seri değerlerini tarih sırasıyla list'e alıyoruz
            List<Long> yAll = (series != null) ? new ArrayList<>(series.values()) : Collections.emptyList();

            if (series != null && series.size() >= 2) {
                int n = yAll.size();

                // Train/Test split: son %20 test (en az 1), geri kalanı train (en az 2)
                int testSize = Math.max(1, (int) Math.round(n * 0.2));
                int trainSize = n - testSize;
                if (trainSize < 2) {
                    // çok kısa seride backtest anlamlı olmayabilir → test'i kapat
                    trainSize = n;
                    testSize = 0;
                }

                // Train üzerinde simple linear regression fit et: y = a + b*x
                double sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
                for (int i = 0; i < trainSize; i++) {
                    double x = i;
                    double y = yAll.get(i);
                    sumX += x;
                    sumY += y;
                    sumXX += x * x;
                    sumXY += x * y;
                }

                double denom = (trainSize * sumXX - sumX * sumX);
                double b = (denom == 0) ? 0 : (trainSize * sumXY - sumX * sumY) / denom;
                double a = (sumY - b * sumX) / trainSize;

                // Bir sonraki gün için trend tahmini (t = n)
                double next = a + b * n;
                if (next < 0) next = 0;
                trendDaily = next;

                // BACKTEST: RMSE/MAPE'yi SADECE test üzerinde ölç
                if (testSize > 0) {
                    for (int i = trainSize; i < n; i++) {
                        double x = i;
                        double actual = yAll.get(i);
                        double pred = Math.max(0, a + b * x);

                        double err = pred - actual;
                        sumSqErr += err * err;
                        perfCount++;

                        if (actual > 0) {
                            sumApe += Math.abs(err) / actual;
                            apeCount++;
                        }
                    }
                }
            }

            // === 3.3 Sezonsallık faktörü (weekday/weekend + month + season + fixed holidays) ===
            Double seasonalFactor = null;
            if (series != null && series.size() >= 14 && baselineDaily > 0) { // 14 gün daha stabil
                Map<Integer, Long> dowSum = new HashMap<>();
                Map<Integer, Integer> dowCount = new HashMap<>();

                Map<Integer, Long> monthSum = new HashMap<>();
                Map<Integer, Integer> monthCount = new HashMap<>();

                Map<Integer, Long> seasonSum = new HashMap<>();
                Map<Integer, Integer> seasonCount = new HashMap<>();

                long holidaySum = 0;
                int holidayCount = 0;

                for (Map.Entry<LocalDate, Long> e : series.entrySet()) {
                    LocalDate dt = e.getKey();
                    long qty = e.getValue();

                    int dow = dt.getDayOfWeek().getValue(); // 1..7
                    dowSum.merge(dow, qty, Long::sum);
                    dowCount.merge(dow, 1, Integer::sum);

                    int m = dt.getMonthValue(); // 1..12
                    monthSum.merge(m, qty, Long::sum);
                    monthCount.merge(m, 1, Integer::sum);

                    int s = seasonOfMonth(m); // 1..4
                    seasonSum.merge(s, qty, Long::sum);
                    seasonCount.merge(s, 1, Integer::sum);

                    if (isFixedHolidayTR(dt)) {
                        holidaySum += qty;
                        holidayCount++;
                    }
                }

                double globalAvg = baselineDaily;

                // 1) Weekend/Weekday factor
                double weekdayAvg = avgForDow(dowSum, dowCount, 1, 5);
                double weekendAvg = avgForDow(dowSum, dowCount, 6, 7);
                double dowFactor = 1.0;
                if (weekdayAvg > 0 && weekendAvg > 0) {
                    dowFactor = ((weekdayAvg + weekendAvg) / 2.0) / globalAvg;
                }

                // 2) Month factor (tahmin aralığının son gününün ayı)
                int currentMonth = to.getMonthValue();
                double mAvg = avgForMonth(monthSum, monthCount, currentMonth);
                double monthFactor = (mAvg > 0) ? (mAvg / globalAvg) : 1.0;

                // 3) Season factor
                int currentSeason = seasonOfMonth(currentMonth);
                double sAvg = avgForMonth(seasonSum, seasonCount, currentSeason);
                double seasonFactor = (sAvg > 0) ? (sAvg / globalAvg) : 1.0;

                // 4) Holiday factor (MVP): sabit günler için yumuşak düzeltme
                double holidayFactor = 1.0;
                if (holidayCount >= 1) {
                    double hAvg = (double) holidaySum / holidayCount;
                    holidayFactor = (hAvg > 0) ? (hAvg / globalAvg) : 1.0;
                }

                // uçmasın diye clamp
                dowFactor = clampFactor(dowFactor, 0.7, 1.3);
                monthFactor = clampFactor(monthFactor, 0.7, 1.3);
                seasonFactor = clampFactor(seasonFactor, 0.8, 1.2);
                holidayFactor = clampFactor(holidayFactor, 0.85, 1.15);

                // ağırlıklı birleşim (agresif değil)
                seasonalFactor = 0.45 * dowFactor + 0.25 * monthFactor + 0.20 * seasonFactor + 0.10 * holidayFactor;
            }

            // === 3.4 Final günlük tahmin (velocity-aware blending) ===
            Double finalDaily = null;

            boolean fast = baselineDaily >= 1.0;                 // hızlı dönen
            boolean medium = baselineDaily >= 0.2 && baselineDaily < 1.0;
            boolean slow = baselineDaily < 0.2;                  // yavaş dönen
            String velocityClass = fast ? "FAST" : (medium ? "MEDIUM" : "SLOW");


            if (trendDaily != null && baselineDaily > 0) {
                if (fast) {
                    finalDaily = 0.35 * baselineDaily + 0.65 * trendDaily;
                } else if (medium) {
                    finalDaily = 0.50 * baselineDaily + 0.50 * trendDaily;
                } else {
                    finalDaily = 0.80 * baselineDaily + 0.20 * trendDaily;
                }
            } else if (trendDaily != null) {
                finalDaily = trendDaily;
            } else if (baselineDaily > 0) {
                finalDaily = baselineDaily;
            }

            if (finalDaily != null && seasonalFactor != null && seasonalFactor > 0) {
                finalDaily = finalDaily * seasonalFactor;
            }

            Double finalDemand = (finalDaily != null) ? finalDaily * horizonDays : null;

            // === 3.5 Öneri + risk skoru ===
            String rec;
            String reason;
            double risk;

            if (finalDemand == null || finalDemand == 0) {
                if (currentStock > 0) {
                    rec = "AVOID";
                    reason = "Model anlamlı talep öngörmüyor, elde stok var. Yeni sipariş riskli.";
                    risk = 0.7;
                } else {
                    rec = "HOLD";
                    reason = "Talep ve stok düşük, karar için daha fazla veri beklenebilir.";
                    risk = 0.3;
                }
            } else {
                if (currentStock == 0 && finalDemand > 0) {
                    rec = "BUY";
                    reason = String.format("Tahmini talep %.1f, stok 0. Kritik stok açığı.", finalDemand);
                    risk = 0.9;
                } else if (currentStock < finalDemand * 0.8) {
                    rec = "BUY";
                    reason = String.format("Stok (%.0f) tahmini talebin (%.1f) altında. Sipariş önerilir.",
                            (double) currentStock, finalDemand);
                    risk = 0.8;
                } else if (currentStock > finalDemand * 1.5) {
                    rec = "AVOID";
                    reason = String.format("Stok (%.0f) tahmini talebi (%.1f) ciddi şekilde aşıyor. Fazla stok riski.",
                            (double) currentStock, finalDemand);
                    risk = 0.8;
                } else {
                    rec = "HOLD";
                    reason = String.format("Stok (%.0f) ile tahmini talep (%.1f) uyumlu görünüyor.",
                            (double) currentStock, finalDemand);
                    risk = 0.4;
                }
            }

            // SKT etkisi
            if (expSoon > 0) {
                if (finalDemand == null || finalDemand == 0 || expSoon > (finalDemand * 0.5)) {
                    rec = (branchId == null) ? "TRANSFER_OR_PROMOTE" : "PROMOTE";
                    reason = reason + " SKT yaklaşan " + expSoon +
                            " adet var, talep bunu eritemeyebilir. Promosyon / transfer değerlendirilmeli.";
                    risk = Math.max(risk, 0.9);
                }
            }

            // Şube dengesi (branchId null ise)
            if (branchId == null && stockByProdBranch.containsKey(pid)) {
                Map<Long, Long> sb = stockByProdBranch.get(pid);
                if (sb.size() > 1) {
                    long max = sb.values().stream().mapToLong(Long::longValue).max().orElse(0);
                    long min = sb.values().stream().mapToLong(Long::longValue).min().orElse(0);
                    if (max > min * 3 && max > 0) {
                        rec = "TRANSFER_OR_PROMOTE";
                        reason = reason + " Şubeler arası stok dengesiz. Fazla stoktan eksik olana transfer önerilir.";
                        risk = Math.max(risk, 0.85);
                    }
                }
            }

            // Ürün tamamen ölü (stok yok, veri yok) → düşük riskli HOLD
            if (series == null && currentStock == 0) {
                rec = "HOLD";
                reason = "Veri yok veya çok az. Agresif bir karar almak için yetersiz bilgi.";
                risk = 0.2;
            }

            items.add(new MlRecommendationItemResponse(
                    pid,
                    name,
                    branchId,
                    currentStock,
                    baselineDaily,
                    trendDaily,
                    seasonalFactor,
                    finalDaily,
                    finalDemand,
                    expSoon,
                    rec,
                    clamp(risk),
                    reason,
                    velocityClass
            ));

        }

        Double rmse = null;
        Double mape = null;

        if (perfCount > 0) {
            rmse = Math.sqrt(sumSqErr / perfCount);
        }
        if (apeCount > 0) {
            mape = sumApe / apeCount;
        }

        return new MlRecommendationResponse(
                from,
                to,
                branchId,
                horizonDays,
                rmse,
                mape,
                perfCount,
                items
        );
    }

    private static double avgForDow(Map<Integer, Long> sum, Map<Integer, Integer> cnt, int from, int to) {
        long s = 0;
        int c = 0;
        for (int d = from; d <= to; d++) {
            s += sum.getOrDefault(d, 0L);
            c += cnt.getOrDefault(d, 0);
        }
        return c == 0 ? 0.0 : (double) s / c;
    }

    private static double avgForMonth(Map<Integer, Long> sum, Map<Integer, Integer> cnt, int key) {
        long s = sum.getOrDefault(key, 0L);
        int c = cnt.getOrDefault(key, 0);
        return c == 0 ? 0.0 : (double) s / c;
    }

    private static int seasonOfMonth(int m) {
        // 12,1,2 = winter; 3,4,5 = spring; 6,7,8 = summer; 9,10,11 = fall
        if (m == 12 || m == 1 || m == 2) return 1;   // WINTER
        if (m >= 3 && m <= 5) return 2;              // SPRING
        if (m >= 6 && m <= 8) return 3;              // SUMMER
        return 4;                                    // FALL
    }

    private static boolean isFixedHolidayTR(LocalDate d) {
        // MVP: sabit resmi günler (dini bayramlar her yıl kaydığı için ayrı takvim gerekir)
        int day = d.getDayOfMonth();
        int month = d.getMonthValue();
        return (day == 1 && month == 1)     // New Year
                || (day == 23 && month == 4) // 23 Nisan
                || (day == 19 && month == 5) // 19 Mayıs
                || (day == 30 && month == 8) // 30 Ağustos
                || (day == 29 && month == 10); // 29 Ekim
    }

    private static double clampFactor(double v, double lo, double hi) {
        if (Double.isNaN(v) || Double.isInfinite(v)) return 1.0;
        return Math.max(lo, Math.min(hi, v));
    }

    private static double clamp(double v) {
        if (v < 0) return 0.0;
        if (v > 1) return 1.0;
        return v;
    }
}
