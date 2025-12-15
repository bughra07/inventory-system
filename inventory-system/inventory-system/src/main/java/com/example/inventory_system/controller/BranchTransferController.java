package com.example.inventory_system.controller;

import com.example.inventory_system.domain.Branch;
import com.example.inventory_system.domain.BranchTransfer;
import com.example.inventory_system.domain.Product;
import com.example.inventory_system.domain.StockMovement;
import com.example.inventory_system.dto.BranchTransferCreateRequest;
import com.example.inventory_system.dto.BranchTransferResponse;
import com.example.inventory_system.repository.BranchRepository;
import com.example.inventory_system.repository.BranchTransferRepository;
import com.example.inventory_system.repository.ProductRepository;
import com.example.inventory_system.repository.StockMovementRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.springframework.http.HttpStatus.*;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/branch-transfers")
public class BranchTransferController {

    private final BranchTransferRepository transfers;
    private final ProductRepository products;
    private final BranchRepository branches;
    private final StockMovementRepository stockMovements;

    private static final DateTimeFormatter DATE_TIME_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public BranchTransferController(BranchTransferRepository transfers,
                                    ProductRepository products,
                                    BranchRepository branches,
                                    StockMovementRepository stockMovements) {
        this.transfers = transfers;
        this.products = products;
        this.branches = branches;
        this.stockMovements = stockMovements;
    }

    // 🔹 1) Transfer oluştur (stokları hemen günceller)
    @PostMapping(consumes = "application/json", produces = "application/json")
    @Transactional
    public BranchTransferResponse create(@RequestBody BranchTransferCreateRequest req) {

        if (req.quantity() == null || req.quantity() <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Quantity must be > 0");
        }

        Product sourceProduct = products.findById(req.productId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));

        Branch source = branches.findById(req.sourceBranchId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Source branch not found"));

        Branch target = branches.findById(req.targetBranchId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Target branch not found"));

        if (source.getId().equals(target.getId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Source and target branch must be different");
        }

        // Bu ürün gerçekten source şubeye mi ait, kontrol
        if (sourceProduct.getBranch() == null ||
                !sourceProduct.getBranch().getId().equals(source.getId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Product does not belong to source branch");
        }

        int qty = req.quantity();

        if (sourceProduct.getStock() == null || sourceProduct.getStock() < qty) {
            throw new ResponseStatusException(BAD_REQUEST, "Insufficient stock at source branch");
        }

        // --- 1) Kaynak şubeden stok düş (OUT) ---
        sourceProduct.setStock(sourceProduct.getStock() - qty);
        stockMovements.save(new StockMovement(
                sourceProduct,
                StockMovement.Type.OUT,
                qty
        ));
        products.save(sourceProduct);

        // --- 2) Hedef şubede aynı SKU'lu ürün var mı? ---
        Product targetProduct = products
                .findBySkuIgnoreCaseAndBranch_Id(sourceProduct.getSku(), target.getId())
                .orElse(null);

        if (targetProduct == null) {
            // Aynı SKU ve isimle yeni Product oluştur
            targetProduct = new Product(
                    sourceProduct.getName(),
                    sourceProduct.getSku(),
                    sourceProduct.getPrice(),
                    0,
                    target
            );
            targetProduct.setCategory(sourceProduct.getCategory());
            targetProduct = products.save(targetProduct);
        }

        // --- 3) Hedef şubeye stok ekle (IN) ---
        Integer currentTargetStock = targetProduct.getStock() != null ? targetProduct.getStock() : 0;
        targetProduct.setStock(currentTargetStock + qty);
        stockMovements.save(new StockMovement(
                targetProduct,
                StockMovement.Type.IN,
                qty
        ));
        products.save(targetProduct);

        // --- 4) Transfer kaydı oluştur (COMPLETED) ---
        BranchTransfer transfer = new BranchTransfer(
                sourceProduct,
                source,
                target,
                qty,
                BranchTransfer.Status.COMPLETED
        );
        BranchTransfer saved = transfers.save(transfer);

        return toResponse(saved);
    }

    // 🔹 2) Tüm transferleri listele
    @GetMapping(produces = "application/json")
    @Transactional(readOnly = true)
    public List<BranchTransferResponse> list() {
        return transfers.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // --- helper ---
    private BranchTransferResponse toResponse(BranchTransfer t) {
        return new BranchTransferResponse(
                t.getId(),
                t.getCreatedAt() != null ? t.getCreatedAt().format(DATE_TIME_FMT) : null,
                t.getProduct() != null ? t.getProduct().getId() : null,
                t.getProduct() != null ? t.getProduct().getName() : null,
                t.getSourceBranch() != null ? t.getSourceBranch().getId() : null,
                t.getSourceBranch() != null ? t.getSourceBranch().getName() : null,
                t.getTargetBranch() != null ? t.getTargetBranch().getId() : null,
                t.getTargetBranch() != null ? t.getTargetBranch().getName() : null,
                t.getQuantity(),
                t.getStatus() != null ? t.getStatus().name() : null
        );
    }
}
