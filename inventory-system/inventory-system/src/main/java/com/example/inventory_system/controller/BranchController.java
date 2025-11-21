package com.example.inventory_system.controller;

import com.example.inventory_system.domain.Branch;
import com.example.inventory_system.dto.BranchCreateRequest;
import com.example.inventory_system.repository.BranchRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;

import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/v1/branches")
public class BranchController {

    private final BranchRepository repo;

    public BranchController(BranchRepository repo) {
        this.repo = repo;
    }

    @PostMapping(consumes = "application/json", produces = "application/json")
    public ResponseEntity<Branch> create(@Valid @RequestBody BranchCreateRequest req) {
        if (repo.existsByNameIgnoreCase(req.getName())) {
            throw new ResponseStatusException(CONFLICT, "Branch name already exists");
        }
        Branch saved = repo.save(new Branch(req.getName(), req.getAddress(), req.getPhone()));
        return ResponseEntity.created(URI.create("/api/v1/branches/" + saved.getId())).body(saved);
    }

    @GetMapping(produces = "application/json")
    public List<Branch> list() {
        return repo.findAll(Sort.by(Sort.Direction.ASC, "name"));
    }

    @GetMapping(value = "/{id}", produces = "application/json")
    public Branch get(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() ->
                new ResponseStatusException(NOT_FOUND, "Branch not found"));
    }

    @PutMapping(value = "/{id}", consumes = "application/json", produces = "application/json")
    public Branch update(@PathVariable Long id, @Valid @RequestBody BranchCreateRequest req) {
        Branch b = repo.findById(id).orElseThrow(() ->
                new ResponseStatusException(NOT_FOUND, "Branch not found"));

        if (!b.getName().equalsIgnoreCase(req.getName()) && repo.existsByNameIgnoreCase(req.getName())) {
            throw new ResponseStatusException(CONFLICT, "Branch name already exists");
        }

        b.setName(req.getName());
        b.setAddress(req.getAddress());
        b.setPhone(req.getPhone());
        return repo.save(b);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(NOT_FOUND, "Branch not found");
        }
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
