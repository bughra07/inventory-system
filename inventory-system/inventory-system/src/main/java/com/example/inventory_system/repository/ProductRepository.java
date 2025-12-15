package com.example.inventory_system.repository;

import com.example.inventory_system.domain.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    boolean existsBySkuIgnoreCase(String sku);
    Optional<Product> findBySkuIgnoreCaseAndBranch_Id(String sku, Long branchId);
    @EntityGraph(attributePaths = "branch")
    Page<Product> findAll(Pageable pageable);

    @EntityGraph(attributePaths = "branch")
    Page<Product> findByBranch_Id(Long branchId, Pageable pageable);

    @EntityGraph(attributePaths = "branch")
    Page<Product> findByNameContainingIgnoreCaseOrSkuContainingIgnoreCase(
            String name, String sku, Pageable pageable
    );
}

/*
package com.example.inventory_system.repository;

import com.example.inventory_system.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
}
*/