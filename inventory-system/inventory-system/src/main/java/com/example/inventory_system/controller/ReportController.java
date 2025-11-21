/*package com.example.inventory_system.controller;

import com.example.inventory_system.domain.Product;
import com.example.inventory_system.dto.*;
import com.example.inventory_system.repository.ProductRepository;
import com.example.inventory_system.repository.ProductBatchRepository;
import com.example.inventory_system.repository.SaleItemRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.springframework.http.HttpStatus.NOT_FOUND;
/*
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
            @RequestParam(name = "from") LocalDate from,
            @RequestParam(name = "to") LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId,
            @RequestParam(name = "limit", defaultValue = "10") int limit
    ) {
        LocalDateTime f = from.atStartOfDay();
        LocalDateTime t = to.plusDays(1).atStartOfDay(); // inclusive bitiş için

        List<Object[]> rows = saleItems.topSellers(f, t, branchId);
        List<BestSellerResponse> out = new ArrayList<>();
        for (Object[] r : rows.stream().limit(limit).toList()) {
            Long pid = (Long) r[0];
            Long qty = (Long) r[1];
            Product p = products.findById(pid)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product " + pid + " not found"));
            out.add(new BestSellerResponse(pid, p.getName(), qty));
        }
        return out;
    }

    // Yavaş/az satanlar
    @GetMapping("/slow-movers")
    public List<SlowMoverResponse> slowMovers(
            @RequestParam(name = "from") LocalDate from,
            @RequestParam(name = "to") LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId,
            @RequestParam(name = "threshold", defaultValue = "3") long threshold
    )  {
        LocalDateTime f = from.atStartOfDay();
        LocalDateTime t = to.plusDays(1).atStartOfDay();

        List<Object[]> rows = saleItems.slowSellers(f, t, branchId, threshold);
        List<SlowMoverResponse> out = new ArrayList<>();
        for (Object[] r : rows) {
            Long pid = (Long) r[0];
            Long qty = (Long) r[1];
            Product p = products.findById(pid).orElse(null);
            out.add(new SlowMoverResponse(pid, p != null ? p.getName() : "(deleted)", qty));
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

        Integer currentStock = p.getStock(); // senin modelinde ürün stok alanı var
        Double days = (avgDaily > 0) ? currentStock / avgDaily : null;

        return new TimeToEmptyResponse(
                p.getId(), p.getName(), currentStock, avgDaily, days
        );
    }

    // Gelir Tablosu (Revenue, COGS, GrossProfit)
    @GetMapping(value = "/income-statement", produces = "application/json")
    @Transactional(readOnly = true)
    public Map<String, Object> incomeStatement(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to")   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId) {

        // [1] tarih aralığı (inclusive start, exclusive end)
        LocalDateTime fromTs = from.atStartOfDay();
        LocalDateTime toTs   = to.plusDays(1).atStartOfDay();

        // [2] repository sonucu
        Object[] row = saleItems.revenueAndCogs(fromTs, toTs, branchId);

        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal cogs    = BigDecimal.ZERO;

        if (row != null) {
            Object revRaw  = row.length > 0 ? row[0] : null;
            Object cgsRaw  = row.length > 1 ? row[1] : null;

            revenue = safeBig(revRaw);
            cogs    = safeBig(cgsRaw);
        }

        BigDecimal gross = revenue.subtract(cogs);

        Map<String, Object> result = new HashMap<>();
        result.put("from", from.toString());
        result.put("to", to.toString());
        result.put("branchId", branchId);
        result.put("revenue", revenue.toPlainString());
        result.put("cogs", cogs.toPlainString());
        result.put("grossProfit", gross.toPlainString());
        return result;
    }

    // Envanter değeri (FIFO'ya yakın: kalan batch miktarı * batch unit_cost)
    @GetMapping("/inventory-valuation")
    public BigDecimal inventoryValuation(
            @RequestParam(name = "branchId", required = false) Long branchId
    ) {
        var all = (branchId == null)
                ? batches.findAll()
                : batches.findAll().stream().filter(b -> b.getBranch().getId().equals(branchId)).toList();

        BigDecimal total = BigDecimal.ZERO;
        for (var b : all) {
            if (b.getQuantity() != null && b.getQuantity() > 0) {
                BigDecimal part = b.getUnitCost().multiply(BigDecimal.valueOf(b.getQuantity()));
                total = total.add(part);
            }
        }
        return total;
    }

    // String manipülasyonu YOK — bilimsel gösterim dahil güvenli parse
    private static BigDecimal safeBig(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return new BigDecimal(n.toString());

        String s = v.toString().trim();
        if (s.isEmpty()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(s); // "1.23E+6" gibi formatları destekler
        } catch (NumberFormatException ex) {
            // burada istersen log atabilirsin
            return BigDecimal.ZERO;
        }
    }
}
*/
/*
@GetMapping(value = "/income-statement", produces = "application/json")
@Transactional(readOnly = true)
public Map<String, Object> incomeStatement(
        @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam("to")   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(name = "branchId", required = false) Long branchId) {

    var fromTs = from.atStartOfDay();
    var toTs   = to.plusDays(1).atStartOfDay(); // < : to

    Object[] row = saleItems.revenueAndCogs(fromTs, toTs, branchId);

    BigDecimal revenue = BigDecimal.ZERO;
    BigDecimal cogs    = BigDecimal.ZERO;

    if (row != null) {
        if (row.length > 0 && row[0] != null) revenue = (BigDecimal) row[0];
        if (row.length > 1 && row[1] != null) cogs    = (BigDecimal) row[1];
    }

    BigDecimal gross = revenue.subtract(cogs);

    return Map.of(
            "from", from.toString(),
            "to", to.toString(),
            "branchId", branchId,
            "revenue", revenue.toPlainString(),
            "cogs", cogs.toPlainString(),
            "grossProfit", gross.toPlainString()
    );
}
*/


package com.example.inventory_system.controller;

import com.example.inventory_system.domain.Product;
import com.example.inventory_system.dto.BestSellerResponse;
import com.example.inventory_system.dto.SlowMoverResponse;
import com.example.inventory_system.dto.TimeToEmptyResponse;
import com.example.inventory_system.repository.ProductBatchRepository;
import com.example.inventory_system.repository.ProductRepository;
import com.example.inventory_system.repository.SaleItemRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
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
            @RequestParam(name = "from") LocalDate from,
            @RequestParam(name = "to") LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId,
            @RequestParam(name = "limit", defaultValue = "10") int limit
    ) {
        LocalDateTime f = from.atStartOfDay();
        LocalDateTime t = to.plusDays(1).atStartOfDay();

        List<Object[]> rows = saleItems.topSellers(f, t, branchId);
        List<BestSellerResponse> out = new ArrayList<>();
        for (Object[] r : rows.stream().limit(limit).toList()) {
            Long pid = (Long) r[0];
            Long qty = (Long) r[1];
            Product p = products.findById(pid)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product " + pid + " not found"));
            out.add(new BestSellerResponse(pid, p.getName(), qty));
        }
        return out;
    }

    // Yavaş/az satanlar
    @GetMapping("/slow-movers")
    public List<SlowMoverResponse> slowMovers(
            @RequestParam(name = "from") LocalDate from,
            @RequestParam(name = "to") LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId,
            @RequestParam(name = "threshold", defaultValue = "3") long threshold
    )  {
        LocalDateTime f = from.atStartOfDay();
        LocalDateTime t = to.plusDays(1).atStartOfDay();

        List<Object[]> rows = saleItems.slowSellers(f, t, branchId, threshold);
        List<SlowMoverResponse> out = new ArrayList<>();
        for (Object[] r : rows) {
            Long pid = (Long) r[0];
            Long qty = (Long) r[1];
            Product p = products.findById(pid).orElse(null);
            out.add(new SlowMoverResponse(pid, p != null ? p.getName() : "(deleted)", qty));
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
        double avgDaily = windowDays > 0 ? (double) sum / windowDays : 0.0;

        Integer currentStock = p.getStock();
        Double days = (avgDaily > 0) ? currentStock / avgDaily : null;

        return new TimeToEmptyResponse(
                p.getId(), p.getName(), currentStock, avgDaily, days
        );
    }


    @GetMapping(value = "/income-statement", produces = "application/json")
    @Transactional(readOnly = true)
    public Map<String, Object> incomeStatement(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to")   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "branchId", required = false) Long branchId) {

        LocalDateTime fromTs = from.atStartOfDay();
        LocalDateTime toTs   = to.plusDays(1).atStartOfDay();

        Object[] row = saleItems.revenueAndCogs(fromTs, toTs, branchId);

        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal cogs    = BigDecimal.ZERO;

        if (row != null && row.length >= 2) {
            if (row[0] instanceof BigDecimal r) revenue = r;
            if (row[1] instanceof BigDecimal c) cogs = c;
        }

        BigDecimal gross = revenue.subtract(cogs);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("from", from.toString());
        result.put("to", to.toString());
        // branchId null olabilir, LinkedHashMap bunu kaldırır
        result.put("branchId", branchId);
        result.put("revenue", revenue);
        result.put("cogs", cogs);
        result.put("grossProfit", gross);

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
}
