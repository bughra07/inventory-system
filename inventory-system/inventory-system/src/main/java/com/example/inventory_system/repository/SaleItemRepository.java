package com.example.inventory_system.repository;

import com.example.inventory_system.domain.SaleItem;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    @Query("""
        SELECT si.product.id, SUM(si.quantity) AS totalQty
        FROM SaleItem si
        WHERE si.createdAt >= :from AND si.createdAt < :to
          AND (:branchId IS NULL OR si.sale.branch.id = :branchId)
        GROUP BY si.product.id
        ORDER BY totalQty DESC
    """)
    List<Object[]> topSellers(@Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to,
                              @Param("branchId") Long branchId);

    @Query("""
        SELECT si.product.id, COALESCE(SUM(si.quantity),0) AS totalQty
        FROM SaleItem si
        WHERE si.createdAt >= :from AND si.createdAt < :to
          AND (:branchId IS NULL OR si.sale.branch.id = :branchId)
        GROUP BY si.product.id
        HAVING COALESCE(SUM(si.quantity),0) <= :threshold
        ORDER BY totalQty ASC
    """)
    List<Object[]> slowSellers(@Param("from") LocalDateTime from,
                               @Param("to") LocalDateTime to,
                               @Param("branchId") Long branchId,
                               @Param("threshold") long threshold);

    @Query("""
    SELECT 
      COALESCE(SUM(CAST(si.quantity AS bigdecimal) * si.unitPrice), CAST(0 AS bigdecimal)),
      COALESCE(SUM(CAST(si.cogsAmount AS bigdecimal)), CAST(0 AS bigdecimal))
    FROM SaleItem si
    WHERE si.sale.createdAt >= :from
      AND si.sale.createdAt < :to
      AND (:branchId IS NULL OR si.sale.branch.id = :branchId)
""")
    Object[] revenueAndCogs(@Param("from") LocalDateTime from,
                            @Param("to") LocalDateTime to,
                            @Param("branchId") Long branchId);
    @Query("""
    SELECT si.product.id, COALESCE(SUM(si.quantity),0)
    FROM SaleItem si
    WHERE si.sale.createdAt >= :from AND si.sale.createdAt < :to
      AND (:branchId IS NULL OR si.sale.branch.id = :branchId)
    GROUP BY si.product.id
""")
    List<Object[]> salesByProduct(@Param("from") LocalDateTime from,
                                  @Param("to") LocalDateTime to,

                                  @Param("branchId") Long branchId);
    @Query("""
    SELECT 
        si.product.id,
        FUNCTION('date', si.sale.createdAt),
        SUM(si.quantity)
    FROM SaleItem si
    WHERE si.sale.createdAt >= :from AND si.sale.createdAt < :to
      AND (:branchId IS NULL OR si.sale.branch.id = :branchId)
    GROUP BY si.product.id, FUNCTION('date', si.sale.createdAt)
    ORDER BY si.product.id, FUNCTION('date', si.sale.createdAt)
""")
    List<Object[]> dailySalesByProduct(@Param("from") java.time.LocalDateTime from,
                                       @Param("to") java.time.LocalDateTime to,
                                       @Param("branchId") Long branchId);

    @Query("""
        SELECT COALESCE(SUM(si.quantity),0)
        FROM SaleItem si
        WHERE si.product.id = :productId
          AND si.createdAt >= :from
          AND (:branchId IS NULL OR si.sale.branch.id = :branchId)
    """)
    Long sumQtySince(@Param("productId") Long productId,
                     @Param("from") LocalDateTime from,
                     @Param("branchId") Long branchId);
}


/*
package com.example.inventory_system.repository;

import com.example.inventory_system.domain.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    @Query("""
        SELECT si.product.id, SUM(si.quantity) AS totalQty
        FROM SaleItem si
        WHERE si.createdAt >= :from AND si.createdAt < :to
          AND (:branchId IS NULL OR si.sale.branch.id = :branchId)
        GROUP BY si.product.id
        ORDER BY totalQty DESC
    """)
    List<Object[]> topSellers(@Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to,
                              @Param("branchId") Long branchId);

    @Query("""
        SELECT si.product.id, COALESCE(SUM(si.quantity),0) AS totalQty
        FROM SaleItem si
        WHERE si.createdAt >= :from AND si.createdAt < :to
          AND (:branchId IS NULL OR si.sale.branch.id = :branchId)
        GROUP BY si.product.id
        HAVING COALESCE(SUM(si.quantity),0) <= :threshold
        ORDER BY totalQty ASC
    """)
    List<Object[]> slowSellers(@Param("from") LocalDateTime from,
                               @Param("to") LocalDateTime to,
                               @Param("branchId") Long branchId,
                               @Param("threshold") long threshold);

    @Query("""
        SELECT
          COALESCE(SUM(CAST(si.quantity AS bigdecimal) * si.unitPrice), CAST(0 AS bigdecimal)),
          COALESCE(SUM(COALESCE(CAST(si.cogsAmount AS bigdecimal), CAST(0 AS bigdecimal))), CAST(0 AS bigdecimal))
        FROM SaleItem si
        WHERE si.createdAt >= :from AND si.createdAt < :to
          AND (:branchId IS NULL OR si.sale.branch.id = :branchId)
    """)
    Object[] revenueAndCogs(@Param("from") LocalDateTime from,
                            @Param("to") LocalDateTime to,
                            @Param("branchId") Long branchId);

    @Query("""
        SELECT COALESCE(SUM(si.quantity),0)
        FROM SaleItem si
        WHERE si.product.id = :productId
          AND si.createdAt >= :from
          AND (:branchId IS NULL OR si.sale.branch.id = :branchId)
    """)
    Long sumQtySince(@Param("productId") Long productId,
                     @Param("from") LocalDateTime from,
                     @Param("branchId") Long branchId);
}

 */