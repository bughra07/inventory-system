package com.example.inventory_system.repository;

import com.example.inventory_system.domain.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    Page<StockMovement> findByProduct_Id(Long productId, Pageable pageable);
}

/*
package com.example.inventory_system.repository;

import com.example.inventory_system.domain.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
}
*/