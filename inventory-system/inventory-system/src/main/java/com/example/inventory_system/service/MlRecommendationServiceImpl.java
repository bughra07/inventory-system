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
            LocalDate day = (r[1] instanceof java.sql.Date d) ? d.toLocalDate() : (LocalDate) r[1];
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

        // === 3) Model performansı için global hata metrikleri ===
        double sumSqErr = 0.0;
        double sumApe = 0.0;
        int perfCount = 0;

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

            // === 3.2 Trend (lineer regresyon) ===
            Double trendDaily = null;
            if (series != null && series.size() >= 2) {
                int n = series.size();
                double sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
                int i = 0;
                for (Long qty : series.values()) {
                    double x = i;
                    double y = qty;
                    sumX += x;
                    sumY += y;
                    sumXX += x * x;
                    sumXY += x * y;
                    i++;
                }
                double denom = (n * sumXX - sumX * sumX);
                double b = (denom == 0) ? 0 : (n * sumXY - sumX * sumY) / denom;
                double a = (sumY - b * sumX) / n;
                double next = a + b * n;
                if (next < 0) next = 0;
                trendDaily = next;

                // performans için: her nokta için tahmin vs gerçek (in-sample)
                i = 0;
                for (Long qty : series.values()) {
                    double x = i;
                    double pred = Math.max(0, a + b * x);
                    double err = pred - qty;
                    sumSqErr += err * err;
                    if (qty > 0) {
                        sumApe += Math.abs(err) / qty;
                    }
                    perfCount++;
                    i++;
                }
            }

            // === 3.3 Sezonsallık faktörü ===
            Double seasonalFactor = null;
            if (series != null && series.size() >= 7) {
                Map<Integer, Long> dowSum = new HashMap<>();
                Map<Integer, Integer> dowCount = new HashMap<>();
                for (Map.Entry<LocalDate, Long> e : series.entrySet()) {
                    int dow = e.getKey().getDayOfWeek().getValue(); // 1=Mon..7=Sun
                    dowSum.merge(dow, e.getValue(), Long::sum);
                    dowCount.merge(dow, 1, Integer::sum);
                }
                double globalAvg = baselineDaily > 0 ? baselineDaily : 0.0;
                if (globalAvg > 0) {
                    // hedef horizon içindeki ortalama gün tipine göre düzeltme (basitçe hafta içi/sonu)
                    double weekdayAvg = avgDow(dowSum, dowCount, 1, 5);
                    double weekendAvg = avgDow(dowSum, dowCount, 6, 7);
                    // agresif değil: hafif bir multiplier
                    if (weekdayAvg > 0 && weekendAvg > 0) {
                        seasonalFactor = (weekdayAvg + weekendAvg) / (2.0 * globalAvg);
                    }
                }
            }

            // === 3.4 Final günlük tahmin ===
            Double finalDaily = null;
            if (trendDaily != null && baselineDaily > 0) {
                finalDaily = 0.5 * baselineDaily + 0.5 * trendDaily;
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
            double risk = 0.0;

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
                    reason
            ));
        }

        Double rmse = null;
        Double mape = null;
        if (perfCount > 0) {
            rmse = Math.sqrt(sumSqErr / perfCount);
            mape = sumApe / perfCount;
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

    private static double avgDow(Map<Integer, Long> sum, Map<Integer, Integer> cnt, int from, int to) {
        long s = 0;
        int c = 0;
        for (int d = from; d <= to; d++) {
            if (sum.containsKey(d)) {
                s += sum.get(d);
                c += cnt.getOrDefault(d, 0);
            }
        }
        return c > 0 ? (double) s / c : 0.0;
    }

    private static double clamp(double v) {
        if (v < 0) return 0.0;
        if (v > 1) return 1.0;
        return v;
    }
}
