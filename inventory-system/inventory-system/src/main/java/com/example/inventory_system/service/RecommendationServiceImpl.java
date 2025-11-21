package com.example.inventory_system.service;

import com.example.inventory_system.domain.Product;
import com.example.inventory_system.dto.RecommendationItemResponse;
import com.example.inventory_system.repository.ProductBatchRepository;
import com.example.inventory_system.repository.ProductRepository;
import com.example.inventory_system.repository.SaleItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationServiceImpl implements RecommendationService {

    private final ProductRepository products;
    private final SaleItemRepository saleItems;
    private final ProductBatchRepository batches;

    @Override
    public List<RecommendationItemResponse> generate(
            LocalDate from,
            LocalDate to,
            Long branchId,
            int tteWindowDays,
            int expiryWindowDays
    ) {
        LocalDateTime fromTs = from.atStartOfDay();
        LocalDateTime toTs = to.plusDays(1).atStartOfDay();

        // 1) Satış adetleri (tarih aralığında)
        Map<Long, Long> soldQty = new HashMap<>();
        for (Object[] row : saleItems.salesByProduct(fromTs, toTs, branchId)) {
            Long pid = (Long) row[0];
            Long qty = (Long) row[1];
            soldQty.put(pid, qty != null ? qty : 0L);
        }

        // 2) Mevcut stok (batch tablosundan)
        Map<Long, Long> stockQty = new HashMap<>();
        for (Object[] row : batches.stockByProduct(branchId)) {
            Long pid = (Long) row[0];
            Long qty = (Long) row[1];
            stockQty.put(pid, qty != null ? qty : 0L);
        }

        // 3) Yakında bitecek stok (expiryWindowDays içinde)
        LocalDate expiryLimit = LocalDate.now().plusDays(expiryWindowDays);
        Map<Long, Long> expiringQty = new HashMap<>();
        for (Object[] row : batches.expiringStockByProduct(expiryLimit, branchId)) {
            Long pid = (Long) row[0];
            Long qty = (Long) row[1];
            expiringQty.put(pid, qty != null ? qty : 0L);
        }

        long days = Math.max(1, Math.max(1, java.time.Duration.between(fromTs, toTs).toDays()));

        List<RecommendationItemResponse> out = new ArrayList<>();

        for (Product p : products.findAll()) {
            Long pid = p.getId();
            String name = p.getName();

            long sold = soldQty.getOrDefault(pid, 0L);
            long stock = stockQty.getOrDefault(pid, 0L);
            long expSoon = expiringQty.getOrDefault(pid, 0L);

            // Ortalama günlük satış
            Double avgDaily = sold > 0 ? (double) sold / days : null;

            // Time-to-empty
            Double daysToEmpty = (avgDaily != null && avgDaily > 0 && stock > 0)
                    ? stock / avgDaily
                    : null;

            // Basit kural seti:
            String rec;
            String reason;

            if (stock == 0 && sold > 0) {
                rec = "BUY";
                reason = "Stok bitti, bu dönemde satış var. Yeniden sipariş önerilir.";
            } else if (sold == 0 && stock > 0) {
                rec = "AVOID";
                reason = "Bu dönemde satış yok ama stok var. Yeniden sipariş etme, alternatif değerlendirilir.";
            } else if (daysToEmpty != null && daysToEmpty < 7) {
                rec = "BUY";
                reason = "Stok " + String.format("%.1f", daysToEmpty) + " günde bitecek görünüyor. Yeniden sipariş planla.";
            } else if (daysToEmpty != null && daysToEmpty > 60) {
                rec = "AVOID";
                reason = "Stok çok yavaş dönüyor (~" + String.format("%.1f", daysToEmpty)
                        + " gün). Yeni sipariş verme, eldeki stoğu erit.";
            } else {
                rec = "HOLD";
                reason = "Stok ve satış dengeli görünüyor. Mevcut sipariş politikasını sürdür.";
            }

            // SKT yaklaşan ürünler için ek aksiyon
            if (expSoon > 0) {
                if (avgDaily == null || avgDaily == 0) {
                    rec = "PROMOTE";
                    reason = "SKT yaklaşan " + expSoon + " adet var ve satış hızı düşük. İndirim / promosyon / transfer önerilir.";
                } else {
                    double cover = expSoon / avgDaily; // bu kadar güne yetecek satış hızı
                    if (cover > expiryWindowDays) {
                        rec = "PROMOTE";
                        reason = "SKT yaklaşan stok satış hızına göre eritilemeyecek gibi görünüyor. Promosyon / transfer önerilir.";
                    }
                }
            }

            // Sadece anlamlı ürünleri dön: stoksuz & satışı olmayan çöp ürünleri istersen filtreleyebilirsin
            if (sold > 0 || stock > 0 || expSoon > 0) {
                out.add(new RecommendationItemResponse(
                        pid,
                        name,
                        branchId,
                        sold,
                        stock,
                        avgDaily,
                        daysToEmpty,
                        expSoon,
                        rec,
                        reason
                ));
            }
        }

        // En anlamlıları üste almak için küçük sıralama:
        out.sort(Comparator
                .comparing(RecommendationItemResponse::recommendation) // BUY/Avoid/...
                .thenComparing(RecommendationItemResponse::soldQuantity, Comparator.reverseOrder()));

        return out;
    }
}
