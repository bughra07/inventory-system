package com.example.inventory_system.service;

import com.example.inventory_system.domain.*;
import com.example.inventory_system.dto.PurchaseRequest;
import com.example.inventory_system.dto.SaleCreateRequest;
import com.example.inventory_system.dto.SaleResponse;
import com.example.inventory_system.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class InventoryServiceImpl implements InventoryService {

    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final ProductBatchRepository batchRepository;
    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final StockMovementRepository stockMovementRepository;

    // ========== PUBLIC METHODS ==========

    @Override
    public SaleResponse createSale(SaleCreateRequest request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sale items cannot be empty");
        }

        Long branchId = request.branchId();
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found: " + branchId));

        // Satış kaydı: toplamı sonra set edeceğiz
        Sale sale = new Sale(branch, BigDecimal.ZERO);
        saleRepository.save(sale);

        BigDecimal total = BigDecimal.ZERO;
        List<SaleResponse.Line> responseLines = new ArrayList<>();

        for (SaleCreateRequest.Item item : request.items()) {
            Long productId = item.productId();
            Integer qty = item.quantity();
            BigDecimal unitPrice = item.unitPrice();

            if (qty == null || qty <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be > 0");
            }

            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Product not found: " + productId));

            // FIFO batch tüket + COGS hesapla
            BigDecimal cogs = consumeFifoBatches(productId, branchId, qty);

            // SaleItem kaydı (entity ctor'unu kullanıyoruz)
            SaleItem saleItem = new SaleItem(sale, product, qty, unitPrice, cogs);
            saleItemRepository.save(saleItem);

            // toplam ve response line
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty));
            total = total.add(lineTotal);

            // Stok movement (OUT)
            recordStockMovement(product, StockMovement.Type.OUT, qty);

            // İsteğe bağlı: Product.stock alanı doluysa güncelle
            Integer currentStock = product.getStock();
            if (currentStock != null) {
                product.setStock(currentStock - qty);
            }

            responseLines.add(new SaleResponse.Line(
                    productId,
                    qty,
                    unitPrice,
                    cogs
            ));
        }

        sale.setTotalAmount(total);
        // createdAt zaten entity içinde now() ile set ediliyor
        // saleRepository.save(sale); // @Transactional olduğu için zorunlu değil ama sorun da yok

        return new SaleResponse(
                sale.getId(),
                branchId,
                total,
                sale.getCreatedAt(),
                responseLines
        );
    }

    @Override
    public void receiveBatch(PurchaseRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request cannot be null");
        }

        Long branchId = request.branchId();
        Long productId = request.productId();

        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found: " + branchId));

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found: " + productId));

        Integer qty = request.quantity();
        if (qty == null || qty <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be > 0");
        }

        // Yeni batch
        ProductBatch batch = new ProductBatch(
                product,
                branch,
                request.expiryDate(),
                request.unitCost(),
                qty
        );
        batchRepository.save(batch);

        // Stok movement (IN)
        recordStockMovement(product, StockMovement.Type.IN, qty);

        // Product.stock varsa güncelle
        Integer currentStock = product.getStock();
        if (currentStock != null) {
            product.setStock(currentStock + qty);
        }
    }

    // ========== HELPERS ==========

    /**
     * FIFO mantığıyla ilgili product + branch için batch tüketir ve toplam COGS döner.
     */
    private BigDecimal consumeFifoBatches(Long productId, Long branchId, int sellQty) {
        if (sellQty <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be > 0");
        }

        List<ProductBatch> fifo = batchRepository.findFifoBatchesForSale(productId, branchId);
        int remaining = sellQty;
        BigDecimal cogs = BigDecimal.ZERO;

        for (ProductBatch b : fifo) {
            if (remaining == 0) break;

            Integer available = Optional.ofNullable(b.getQuantity()).orElse(0);
            if (available <= 0) continue;

            int use = Math.min(remaining, available);
            BigDecimal part = b.getUnitCost().multiply(BigDecimal.valueOf(use));
            cogs = cogs.add(part);

            b.setQuantity(available - use);
            remaining -= use;
        }

        if (remaining > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Insufficient stock for product %d at branch %d".formatted(productId, branchId)
            );
        }

        return cogs;
    }

    private void recordStockMovement(Product product, StockMovement.Type type, int qty) {
        if (stockMovementRepository == null) return;
        StockMovement mv = new StockMovement(product, type, qty);
        stockMovementRepository.save(mv);
    }
}
