package com.example.inventory_system.controller;

import com.example.inventory_system.domain.Category;
import com.example.inventory_system.repository.CategoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.transaction.annotation.Transactional;
import com.example.inventory_system.domain.Branch;
import com.example.inventory_system.domain.Product;
import com.example.inventory_system.dto.ProductCreateRequest;
import com.example.inventory_system.dto.ProductResponse;
import com.example.inventory_system.repository.BranchRepository;
import com.example.inventory_system.repository.ProductRepository;
import jakarta.validation.Valid;
import com.example.inventory_system.domain.StockMovement;
import com.example.inventory_system.repository.StockMovementRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;


import java.net.URI;


import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final CategoryRepository categories;

    private final  StockMovementRepository stockMovements;
    private final ProductRepository products;
    private final BranchRepository branches;



    public ProductController(ProductRepository products,
                             BranchRepository branches,
                             CategoryRepository categories, StockMovementRepository stockMovements) {
        this.products = products;
        this.branches = branches;
        this.categories = categories;
        this.stockMovements = stockMovements;
    }


    @GetMapping(value = "/{id}/movements", produces = "application/json")
    @Transactional(readOnly = true)
    public Page<?> listMovements(@PathVariable("id") Long id,
                                 @PageableDefault(size = 10, sort = "createdAt") Pageable pageable) {
        // ürün var mı kontrolü (404 yerine boş dönmek istemezsin)
        products.findById(id).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));

        return stockMovements.findByProduct_Id(id, pageable)
                .map(m -> java.util.Map.of(
                        "id", m.getId(),
                        "type", m.getType().name(),
                        "quantity", m.getQuantity(),
                        "createdAt", m.getCreatedAt()
                ));
    }

    // health/ping (isteğe bağlı)
    @GetMapping("/_ping")
    public String ping() { return "ok"; }


    @GetMapping(value = "", produces = "application/json")
    @Transactional(readOnly = true)
    public Page<ProductResponse> list(
            @RequestParam(name = "branchId", required = false) Long branchId,
            @PageableDefault(size = 10, sort = "name") Pageable pageable) {

        Page<Product> page = (branchId != null)
                ? products.findByBranch_Id(branchId, pageable)
                : products.findAll(pageable);

        return page.map(this::toResponse);
    }

    @GetMapping(value = "", produces = "application/json", params = "q")
    @Transactional(readOnly = true)
    public Page<ProductResponse> search(
            @RequestParam(name = "q") String q,
            @PageableDefault(size = 10, sort = "name") Pageable pageable) {

        return products
                .findByNameContainingIgnoreCaseOrSkuContainingIgnoreCase(q, q, pageable)
                .map(this::toResponse);
    }



    // GET by id
    @GetMapping(value = "/{id}", produces = "application/json")
    public ProductResponse get(@PathVariable Long id) {
        Product p = products.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));
        return toResponse(p);
    }

    @PostMapping(consumes = "application/json", produces = "application/json")
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductCreateRequest req) {
        if (products.existsBySkuIgnoreCase(req.getSku())) {
            throw new ResponseStatusException(CONFLICT, "SKU already exists");
        }
        Branch branch = branches.findById(req.getBranchId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Branch not found"));

        // kategori opsiyonel
        Category category = null;
        if (req.getCategoryId() != null) {
            category = categories.findById(req.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Category not found"));
        }

        Product saved = products.save(new Product(
                req.getName(), req.getSku(), req.getPrice(), req.getStock(), branch
        ));
        saved.setCategory(category);
        saved = products.save(saved);

        return ResponseEntity.created(URI.create("/api/v1/products/" + saved.getId()))
                .body(toResponse(saved));
    }

    // UPDATE
    @PutMapping(value = "/{id}", consumes = "application/json", produces = "application/json")
    public ProductResponse update(@PathVariable("id") Long id, @Valid @RequestBody ProductCreateRequest req) {
        Product p = products.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));

        if (!p.getSku().equalsIgnoreCase(req.getSku()) &&
                products.existsBySkuIgnoreCase(req.getSku())) {
            throw new ResponseStatusException(CONFLICT, "SKU already exists");
        }

        Branch branch = branches.findById(req.getBranchId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Branch not found"));

        // kategori opsiyonel
        Category category = null;
        if (req.getCategoryId() != null) {
            category = categories.findById(req.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Category not found"));
        }

        p.setName(req.getName());
        p.setSku(req.getSku());
        p.setPrice(req.getPrice());
        p.setStock(req.getStock());
        p.setBranch(branch);
        p.setCategory(category);

        return toResponse(products.save(p));
    }


    // STOCK ADJUST (IN / OUT)
    @PostMapping(value = "/{id}/adjust-stock", consumes = "application/json", produces = "application/json")
    @Transactional
    public ProductResponse adjustStock(
            @PathVariable("id") Long id,                   // 👈 isim verildi
            @RequestBody java.util.Map<String, Object> body) {

        // body: { "type": "IN" | "OUT", "quantity": 10 }
        Object typeObj = body.get("type");
        Object qtyObj  = body.get("quantity");

        if (typeObj == null || qtyObj == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Body must contain 'type' and 'quantity'");
        }

        String type = String.valueOf(typeObj).trim().toUpperCase();
        int quantity;
        try {
            quantity = (qtyObj instanceof Number)
                    ? ((Number) qtyObj).intValue()
                    : Integer.parseInt(String.valueOf(qtyObj));
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(BAD_REQUEST, "'quantity' must be a number");
        }

        if (quantity <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "'quantity' must be > 0");
        }
        if (!type.equals("IN") && !type.equals("OUT")) {
            throw new ResponseStatusException(BAD_REQUEST, "'type' must be IN or OUT");
        }

        Product p = products.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));

        if (type.equals("IN")) {
            p.setStock(p.getStock() + quantity);
        } else { // OUT
            if (p.getStock() < quantity) {
                throw new ResponseStatusException(BAD_REQUEST, "Insufficient stock");
            }
            p.setStock(p.getStock() - quantity);
        }

        // hareket kaydı
        StockMovement.Type mvType = "IN".equals(type)
                ? StockMovement.Type.IN : StockMovement.Type.OUT;
        stockMovements.save(new StockMovement(p, mvType, quantity));

        return toResponse(products.save(p));
    }



    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!products.existsById(id)) {
            throw new ResponseStatusException(NOT_FOUND, "Product not found");
        }
        products.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private ProductResponse toResponse(Product p) {
        return new ProductResponse(
                p.getId(),
                p.getName(),
                p.getSku(),
                p.getPrice(),
                p.getStock(),
                p.getBranch() != null ? p.getBranch().getId() : null,
                p.getBranch() != null ? p.getBranch().getName() : null,
                p.getCreatedAt(),
                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getCategory() != null ? p.getCategory().getName() : null
        );
    }

}
