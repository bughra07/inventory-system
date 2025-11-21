package com.example.inventory_system.controller;

import com.example.inventory_system.domain.Category;
import com.example.inventory_system.dto.CategoryCreateRequest;
import com.example.inventory_system.dto.CategoryResponse;
import com.example.inventory_system.repository.CategoryRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;

import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

    private final CategoryRepository categories;

    public CategoryController(CategoryRepository categories) {
        this.categories = categories;
    }

    @PostMapping(consumes = "application/json", produces = "application/json")
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryCreateRequest req) {
        if (categories.existsByNameIgnoreCase(req.getName())) {
            throw new ResponseStatusException(CONFLICT, "Category already exists");
        }
        Category saved = categories.save(new Category(req.getName()));
        return ResponseEntity.created(URI.create("/api/v1/categories/" + saved.getId()))
                .body(new CategoryResponse(saved.getId(), saved.getName(), saved.getCreatedAt()));
    }

    @GetMapping(produces = "application/json")
    public Page<CategoryResponse> list(@PageableDefault(size = 10, sort = "name") Pageable pageable) {
        return categories.findAll(pageable)
                .map(c -> new CategoryResponse(c.getId(), c.getName(), c.getCreatedAt()));
    }

    @GetMapping(value = "/{id}", produces = "application/json")
    public CategoryResponse get(@PathVariable("id") Long id) {
        Category c = categories.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Category not found"));
        return new CategoryResponse(c.getId(), c.getName(), c.getCreatedAt());
    }

    @PutMapping(value = "/{id}", consumes = "application/json", produces = "application/json")
    public CategoryResponse update(@PathVariable("id") Long id, @Valid @RequestBody CategoryCreateRequest req) {
        Category c = categories.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Category not found"));

        if (!c.getName().equalsIgnoreCase(req.getName())
                && categories.existsByNameIgnoreCase(req.getName())) {
            throw new ResponseStatusException(CONFLICT, "Category already exists");
        }

        c.setName(req.getName());
        Category saved = categories.save(c);
        return new CategoryResponse(saved.getId(), saved.getName(), saved.getCreatedAt());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        if (!categories.existsById(id)) {
            throw new ResponseStatusException(NOT_FOUND, "Category not found");
        }
        categories.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
