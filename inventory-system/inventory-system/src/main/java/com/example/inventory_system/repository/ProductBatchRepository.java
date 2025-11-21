package com.example.inventory_system.repository;

import com.example.inventory_system.domain.ProductBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;


import java.time.LocalDate;
import java.util.List;
public interface ProductBatchRepository extends JpaRepository<ProductBatch, Long> {

    @Query("""
        SELECT b FROM ProductBatch b
        WHERE b.product.id = :productId AND b.branch.id = :branchId AND b.quantity > 0
        ORDER BY 
          CASE WHEN b.expiryDate IS NULL THEN 1 ELSE 0 END,
          b.expiryDate ASC NULLS LAST,
          b.createdAt ASC
    """)
    List<ProductBatch> findConsumableBatches(@Param("productId") Long productId,
                                             @Param("branchId") Long branchId);
    @Query("""
    SELECT b.product.id, COALESCE(SUM(b.quantity),0)
    FROM ProductBatch b
    WHERE b.quantity > 0
      AND (:branchId IS NULL OR b.branch.id = :branchId)
    GROUP BY b.product.id
""")
    List<Object[]> stockByProduct(@Param("branchId") Long branchId);

    @Query("""
    SELECT b.product.id, COALESCE(SUM(b.quantity),0)
    FROM ProductBatch b
    WHERE b.quantity > 0
      AND b.expiryDate IS NOT NULL
      AND b.expiryDate <= :until
      AND (:branchId IS NULL OR b.branch.id = :branchId)
    GROUP BY b.product.id
""")
    List<Object[]> expiringStockByProduct(@Param("until") java.time.LocalDate until,
                                          @Param("branchId") Long branchId);


    @Query("""
        SELECT b FROM ProductBatch b
        WHERE b.quantity > 0
          AND b.expiryDate IS NOT NULL
          AND b.expiryDate <= :until
          AND (:branchId IS NULL OR b.branch.id = :branchId)
        ORDER BY b.expiryDate ASC
    """)
    List<ProductBatch> expiringUntil(@Param("until") LocalDate until,
                                     @Param("branchId") Long branchId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
      SELECT b FROM ProductBatch b
      WHERE b.product.id = :productId
        AND (:branchId IS NULL OR b.branch.id = :branchId)
        AND b.quantity > 0
      ORDER BY b.expiryDate ASC NULLS LAST, b.createdAt ASC, b.id ASC
    """)
    List<ProductBatch> findFifoBatchesForSale(@Param("productId") Long productId,
                                              @Param("branchId") Long branchId);
    @Query("""
    SELECT b.product.id, b.branch.id, COALESCE(SUM(b.quantity),0)
    FROM ProductBatch b
    WHERE b.quantity > 0
    GROUP BY b.product.id, b.branch.id
""")
    List<Object[]> stockByProductAndBranch();

    @Query("""
    SELECT b.product.id, b.branch.id, COALESCE(SUM(b.quantity),0)
    FROM ProductBatch b
    WHERE b.quantity > 0
      AND b.expiryDate IS NOT NULL
      AND b.expiryDate <= :until
    GROUP BY b.product.id, b.branch.id
""")
    List<Object[]> expiringStockByProductAndBranch(@Param("until") java.time.LocalDate until);


}


/*package com.example.inventory_system.repository;

import com.example.inventory_system.domain.ProductBatch;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ProductBatchRepository extends JpaRepository<ProductBatch, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
      SELECT b FROM ProductBatch b
      WHERE b.product.id = :productId
        AND (:branchId IS NULL OR b.branch.id = :branchId)
        AND b.quantity > 0
      ORDER BY b.expiryDate ASC NULLS LAST, b.createdAt ASC, b.id ASC
    """)
    List<ProductBatch> findFifoBatchesForSale(@Param("productId") Long productId,
                                              @Param("branchId") Long branchId);

    @Query("""
      SELECT b FROM ProductBatch b
      WHERE b.quantity > 0
        AND b.expiryDate IS NOT NULL
        AND b.expiryDate <= :until
        AND (:branchId IS NULL OR b.branch.id = :branchId)
      ORDER BY b.expiryDate ASC
    """)
    List<ProductBatch> expiringUntil(@Param("until") LocalDate until,
                                     @Param("branchId") Long branchId);
}
*/