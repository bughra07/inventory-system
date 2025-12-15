package com.example.inventory_system.controller;

import com.example.inventory_system.domain.ProductBatch;
import com.example.inventory_system.domain.SaleItem;
import com.example.inventory_system.dto.TransactionResponse;
import com.example.inventory_system.repository.ProductBatchRepository;
import com.example.inventory_system.repository.SaleItemRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionController {

    private final ProductBatchRepository batches;
    private final SaleItemRepository saleItems;

    public TransactionController(ProductBatchRepository batches,
                                 SaleItemRepository saleItems) {
        this.batches = batches;
        this.saleItems = saleItems;
    }

    /**
     * Genel işlem listesi:
     *  - Purchases  -> ProductBatch üzerinden
     *  - Sales      -> SaleItem + Sale üzerinden
     *
     *  Örn:
     *  GET /api/v1/transactions
     *  GET /api/v1/transactions?branchId=110
     *  GET /api/v1/transactions?branchId=110&limit=100
     */
    @GetMapping
    @Transactional(readOnly = true)
    public List<TransactionResponse> list(
            @RequestParam(name = "branchId", required = false) Long branchId,
            @RequestParam(name = "limit", defaultValue = "100") int limit
    ) {
        List<TransactionResponse> out = new ArrayList<>();

        // --- PURCHASE tarafı: ProductBatch ---
        for (ProductBatch b : batches.findAll()) {
            if (branchId != null) {
                if (b.getBranch() == null || !branchId.equals(b.getBranch().getId())) {
                    continue;
                }
            }

            var product = b.getProduct();
            var branch  = b.getBranch();

            BigDecimal unitCost = b.getUnitCost() != null
                    ? b.getUnitCost()
                    : BigDecimal.ZERO;

            Integer qty = b.getQuantity() != null ? b.getQuantity() : 0;
            BigDecimal total = unitCost.multiply(BigDecimal.valueOf(qty));

            out.add(new TransactionResponse(
                    b.getId(),
                    "purchase",
                    product != null ? product.getId() : null,
                    product != null ? product.getName() : "(deleted)",
                    branch != null ? branch.getId() : null,
                    branch != null ? branch.getName() : null,
                    qty,
                    unitCost,
                    total,
                    b.getCreatedAt(),     // veya b.getReceivedAt() varsa onu kullan
                    b.getExpiryDate()
            ));
        }

        // --- SALES tarafı: SaleItem + Sale ---
        for (SaleItem si : saleItems.findAll()) {
            var sale    = si.getSale();
            var product = si.getProduct();

            if (branchId != null) {
                if (sale == null || sale.getBranch() == null
                        || !branchId.equals(sale.getBranch().getId())) {
                    continue;
                }
            }

            var branch = (sale != null) ? sale.getBranch() : null;

            BigDecimal unitPrice = si.getUnitPrice() != null
                    ? si.getUnitPrice()
                    : BigDecimal.ZERO;

            Integer qty = si.getQuantity() != null ? si.getQuantity() : 0;
            BigDecimal total = unitPrice.multiply(BigDecimal.valueOf(qty));

            out.add(new TransactionResponse(
                    si.getId(),
                    "sale",
                    product != null ? product.getId() : null,
                    product != null ? product.getName() : "(deleted)",
                    branch != null ? branch.getId() : null,
                    branch != null ? branch.getName() : null,
                    qty,
                    unitPrice,
                    total,
                    sale != null ? sale.getCreatedAt() : null,
                    null      // satışta SKT yok
            ));
        }

        // Tarihe göre sondan başa sırala (en yeni en üstte)
        out.sort(Comparator.comparing(TransactionResponse::getDate,
                Comparator.nullsLast(Comparator.naturalOrder())).reversed());

        if (out.size() > limit) {
            return out.subList(0, limit);
        }
        return out;
    }
}
