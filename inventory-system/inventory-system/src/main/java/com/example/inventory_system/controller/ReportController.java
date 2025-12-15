package com.example.inventory_system.controller;

import com.example.inventory_system.domain.Product;
import com.example.inventory_system.dto.BestSellerResponse;
import com.example.inventory_system.dto.SlowMoverResponse;
import com.example.inventory_system.dto.TimeToEmptyResponse;
import com.example.inventory_system.dto.SalesTrendPointResponse;
import com.example.inventory_system.dto.CategorySalesResponse;
import com.example.inventory_system.dto.ProductMarginResponse;
import com.example.inventory_system.repository.ProductBatchRepository;
import com.example.inventory_system.repository.ProductRepository;
import com.example.inventory_system.repository.SaleItemRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final SaleItemRepository saleItems;
    private final ProductRepository products;
    private final ProductBatchRepository batches;

    public ReportController(SaleItemRepository saleItems,
                            ProductRepository products,
                            ProductBatchRepository batches) {
        this.saleItems = saleItems;
        this.products = products;
        this.batches = batches;
    }

    // En çok satanlar (adet bazlı)
    @GetMapping("/bestsellers")
    public List<BestSellerResponse> bestsellers(
            @RequestParam(name = "from")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId,
            @RequestParam(name = "limit", defaultValue = "10") int limit
    ) {
        LocalDateTime f = from.atStartOfDay();
        LocalDateTime t = to.plusDays(1).atStartOfDay(); // inclusive bitiş için

        List<Object[]> rows = saleItems.topSellers(f, t, branchId);
        List<BestSellerResponse> out = new ArrayList<>();

        for (Object[] r : rows.stream().limit(limit).toList()) {
            // 0: productId, 1: toplam adet, 2: toplam değer (varsa)
            Long pid = r[0] != null ? ((Number) r[0]).longValue() : null;
            Long qty = r.length > 1 && r[1] != null ? ((Number) r[1]).longValue() : 0L;

            BigDecimal totalValue = BigDecimal.ZERO;
            if (r.length > 2 && r[2] != null) {
                totalValue = safeBig(r[2]);
            }

            Product p = products.findById(pid)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product " + pid + " not found"));

            out.add(new BestSellerResponse(
                    pid,            // productId
                    p.getName(),    // productName
                    qty,            // totalQuantity
                    totalValue      // totalValue
            ));
        }
        return out;
    }

    // Yavaş/az satanlar
    @GetMapping("/slow-movers")
    public List<SlowMoverResponse> slowMovers(
            @RequestParam(name = "from")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(name = "to")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId,
            @RequestParam(name = "threshold", defaultValue = "3") long threshold
    )  {
        LocalDateTime f = from.atStartOfDay();
        LocalDateTime t = to.plusDays(1).atStartOfDay();

        List<Object[]> rows = saleItems.slowSellers(f, t, branchId, threshold);
        List<SlowMoverResponse> out = new ArrayList<>();

        for (Object[] r : rows) {
            // 0: productId, 1: toplam adet (query'ine göre değişebilir)
            Long pid = r[0] != null ? ((Number) r[0]).longValue() : null;
            Long qty = r.length > 1 && r[1] != null ? ((Number) r[1]).longValue() : 0L;

            Product p = products.findById(pid).orElse(null);
            String name = (p != null) ? p.getName() : "(deleted)";
            String sku  = (p != null) ? p.getSku()  : null;

            // daysSinceLastSale şimdilik hesaplanmıyor, null geçiyoruz
            Long daysSinceLastSale = null;

            out.add(new SlowMoverResponse(
                    pid,               // productId
                    name,              // productName
                    sku,               // sku
                    qty,               // totalQuantity
                    daysSinceLastSale  // daysSinceLastSale
            ));
        }
        return out;
    }

    // ------------- YENİ: Satış Trendi (gün bazlı) -------------
    @GetMapping("/sales-trend")
    public List<SalesTrendPointResponse> salesTrend(
            @RequestParam("from")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId
    ) {
        LocalDateTime fromTs = from.atStartOfDay();
        LocalDateTime toTs   = to.plusDays(1).atStartOfDay();

        List<Object[]> rows = saleItems.salesTrend(fromTs, toTs, branchId);
        List<SalesTrendPointResponse> out = new ArrayList<>();

        for (Object[] r : rows) {
            // 0: date, 1: revenue, 2: cogs
            Object dateObj = r[0];
            LocalDate d;
            if (dateObj instanceof java.sql.Date sqlDate) {
                d = sqlDate.toLocalDate();
            } else if (dateObj instanceof LocalDate ld) {
                d = ld;
            } else if (dateObj instanceof LocalDateTime ldt) {
                d = ldt.toLocalDate();
            } else {
                d = from;
            }

            BigDecimal revenue = safeBig(r[1]);
            BigDecimal cogs    = safeBig(r[2]);
            BigDecimal gross   = revenue.subtract(cogs);

            out.add(new SalesTrendPointResponse(d, revenue, cogs, gross));
        }
        return out;
    }

    // ------------- YENİ: Kategori Bazlı Satış Dağılımı -------------
    @GetMapping("/category-sales")
    public List<CategorySalesResponse> categorySales(
            @RequestParam("from")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId
    ) {
        LocalDateTime fromTs = from.atStartOfDay();
        LocalDateTime toTs   = to.plusDays(1).atStartOfDay();

        List<Object[]> rows = saleItems.categoryBreakdown(fromTs, toTs, branchId);
        List<CategorySalesResponse> out = new ArrayList<>();

        for (Object[] r : rows) {
            // 0: categoryId, 1: name, 2: revenue, 3: cogs
            Long categoryId = r[0] != null ? ((Number) r[0]).longValue() : null;
            String categoryName = (String) r[1];
            BigDecimal revenue = safeBig(r[2]);
            BigDecimal cogs    = safeBig(r[3]);
            BigDecimal gross   = revenue.subtract(cogs);

            Double marginPercent = null;
            if (revenue.compareTo(BigDecimal.ZERO) > 0) {
                marginPercent = gross
                        .multiply(BigDecimal.valueOf(100))
                        .divide(revenue, 2, RoundingMode.HALF_UP)
                        .doubleValue();
            }

            out.add(new CategorySalesResponse(
                    categoryId,
                    categoryName,
                    revenue,
                    cogs,
                    gross,
                    marginPercent
            ));
        }
        return out;
    }

    // ------------- YENİ: Ürün Bazlı Kâr Marjı -------------
    @GetMapping("/product-margins")
    public List<ProductMarginResponse> productMargins(
            @RequestParam("from")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId,
            @RequestParam(name = "limit", defaultValue = "50") int limit
    ) {
        LocalDateTime fromTs = from.atStartOfDay();
        LocalDateTime toTs   = to.plusDays(1).atStartOfDay();

        List<Object[]> rows = saleItems.productMargins(fromTs, toTs, branchId);
        List<ProductMarginResponse> out = new ArrayList<>();

        for (Object[] r : rows.stream().limit(limit).toList()) {
            // 0: productId, 1: name, 2: sku, 3: revenue, 4: cogs
            Long productId = r[0] != null ? ((Number) r[0]).longValue() : null;
            String name    = (String) r[1];
            String sku     = (String) r[2];
            BigDecimal revenue = safeBig(r[3]);
            BigDecimal cogs    = safeBig(r[4]);
            BigDecimal profit  = revenue.subtract(cogs);

            Double marginPercent = null;
            if (revenue.compareTo(BigDecimal.ZERO) > 0) {
                marginPercent = profit
                        .multiply(BigDecimal.valueOf(100))
                        .divide(revenue, 2, RoundingMode.HALF_UP)
                        .doubleValue();
            }

            out.add(new ProductMarginResponse(
                    productId,
                    name,
                    sku,
                    revenue,
                    cogs,
                    profit,
                    marginPercent
            ));
        }
        return out;
    }

    // Time-to-Empty (son N gün ort. satış)
    @GetMapping("/time-to-empty")
    public TimeToEmptyResponse tte(
            @RequestParam(name = "productId") Long productId,
            @RequestParam(name = "windowDays", defaultValue = "30") int windowDays,
            @RequestParam(name = "branchId", required = false) Long branchId
    ) {
        Product p = products.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));

        LocalDateTime since = LocalDate.now().minusDays(windowDays).atStartOfDay();
        long sum = Optional.ofNullable(saleItems.sumQtySince(productId, since, branchId)).orElse(0L);
        double avgDaily = (double) sum / windowDays;

        Integer currentStock = p.getStock(); // modelindeki stok alanı
        Double days = (avgDaily > 0) ? currentStock / avgDaily : null;

        return new TimeToEmptyResponse(
                p.getId(), p.getName(), currentStock, avgDaily, days
        );
    }

    // --------- DÜZELTİLEN: Gelir Tablosu (Revenue, COGS, GrossProfit) ---------
    @GetMapping(value = "/income-statement", produces = "application/json")
    @Transactional(readOnly = true)
    public Map<String, Object> incomeStatement(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to")   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId) {

        // [1] tarih aralığı (inclusive start, exclusive end)
        LocalDateTime fromTs = from.atStartOfDay();
        LocalDateTime toTs   = to.plusDays(1).atStartOfDay();

        // [2] Ciro ve COGS için salesTrend sonucunu kullan
        List<Object[]> trendRows = saleItems.salesTrend(fromTs, toTs, branchId);

        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal cogs    = BigDecimal.ZERO;

        for (Object[] r : trendRows) {
            // r[0] = date, r[1] = revenue, r[2] = cogs
            if (r.length > 1 && r[1] != null) {
                revenue = revenue.add(safeBig(r[1]));
            }
            if (r.length > 2 && r[2] != null) {
                cogs = cogs.add(safeBig(r[2]));
            }
        }

        BigDecimal gross = revenue.subtract(cogs);

        // [3] Toplam satış adedi (quantity) – yeni eklenen repository metodu
        Long totalQty = java.util.Optional.ofNullable(
                saleItems.sumQuantityBetween(fromTs, toTs, branchId)
        ).orElse(0L);

        // [4] Sonuç objesi
        Map<String, Object> result = new HashMap<>();
        result.put("from", from.toString());
        result.put("to", to.toString());
        result.put("branchId", branchId);
        result.put("revenue", revenue.toPlainString());
        result.put("cogs", cogs.toPlainString());
        result.put("grossProfit", gross.toPlainString());
        result.put("totalQuantity", totalQty); // <-- AdminDashboard buradan okuyacak
        return result;
    }


    // Envanter değeri (FIFO'ya yakın: kalan batch miktarı * batch unit_cost)
    @GetMapping("/inventory-valuation")
    public BigDecimal inventoryValuation(
            @RequestParam(name = "branchId", required = false) Long branchId
    ) {
        var all = (branchId == null)
                ? batches.findAll()
                : batches.findAll().stream()
                .filter(b -> b.getBranch() != null && b.getBranch().getId().equals(branchId))
                .toList();

        BigDecimal total = BigDecimal.ZERO;
        for (var b : all) {
            if (b.getQuantity() != null && b.getQuantity() > 0) {
                BigDecimal part = b.getUnitCost().multiply(BigDecimal.valueOf(b.getQuantity()));
                total = total.add(part);
            }
        }
        return total;
    }

    // String / Number -> BigDecimal güvenli parse
    private static BigDecimal safeBig(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return new BigDecimal(n.toString());

        String s = v.toString().trim();
        if (s.isEmpty()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(s); // "1.23E+6" gibi formatları da destekler
        } catch (NumberFormatException ex) {
            return BigDecimal.ZERO;
        }
    }
}
