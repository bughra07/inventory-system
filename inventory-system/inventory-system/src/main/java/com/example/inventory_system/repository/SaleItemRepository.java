package com.example.inventory_system.repository;

import com.example.inventory_system.domain.SaleItem;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    @Query("""
        SELECT 
            si.product.id,
            COALESCE(SUM(si.quantity), 0) AS totalQty,
            COALESCE(SUM(CAST(si.quantity AS bigdecimal) * si.unitPrice), CAST(0 AS bigdecimal)) AS totalValue
        FROM SaleItem si
        WHERE si.sale.createdAt >= :from AND si.sale.createdAt < :to
          AND (:branchId IS NULL OR si.sale.branch.id = :branchId)
        GROUP BY si.product.id
        ORDER BY totalQty DESC
    """)
    List<Object[]> topSellers(@Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to,
                              @Param("branchId") Long branchId);

    @Query("""
    SELECT 
        si.product.id,
        COALESCE(SUM(si.quantity),0) AS totalQty,
        MAX(si.sale.createdAt)       AS lastSaleAt
    FROM SaleItem si
    WHERE si.sale.createdAt >= :from AND si.sale.createdAt < :to
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
    select 
        sum(si.unitPrice * si.quantity) as revenue,
        sum(coalesce(si.cogsAmount, 0)) as cogs
    from SaleItem si
    where si.sale.createdAt >= :from
      and si.sale.createdAt < :to
      and (:branchId is null or si.sale.branch.id = :branchId)
""")
    Object[] revenueAndCogs(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("branchId") Long branchId
    );


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


    // --- BURADAN İTİBAREN YENİ EKLEDİKLERİMİZ ---

    @Query("""
        select function('date', si.sale.createdAt),
               sum(si.unitPrice * si.quantity) as revenue,
               sum(si.cogsAmount)            as cogs
        from SaleItem si
        where si.sale.createdAt >= :from and si.sale.createdAt < :to
          and (:branchId is null or si.sale.branch.id = :branchId)
        group by function('date', si.sale.createdAt)
        order by function('date', si.sale.createdAt)
        """)
    List<Object[]> salesTrend(@Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to,
                              @Param("branchId") Long branchId);

    @Query("""
        select c.id, c.name,
               sum(si.unitPrice * si.quantity) as revenue,
               sum(si.cogsAmount)            as cogs
        from SaleItem si
        join si.product p
        join p.category c
        where si.sale.createdAt >= :from and si.sale.createdAt < :to
          and (:branchId is null or si.sale.branch.id = :branchId)
        group by c.id, c.name
        order by revenue desc
        """)
    List<Object[]> categoryBreakdown(@Param("from") LocalDateTime from,
                                     @Param("to") LocalDateTime to,
                                     @Param("branchId") Long branchId);

    @Query("""
        select p.id, p.name, p.sku,
               sum(si.unitPrice * si.quantity) as revenue,
               sum(si.cogsAmount)            as cogs
        from SaleItem si
        join si.product p
        where si.sale.createdAt >= :from and si.sale.createdAt < :to
          and (:branchId is null or si.sale.branch.id = :branchId)
        group by p.id, p.name, p.sku
        order by revenue desc
        """)
    List<Object[]> productMargins(@Param("from") LocalDateTime from,
                                  @Param("to") LocalDateTime to,
                                  @Param("branchId") Long branchId);


    @Query("""
        select coalesce(sum(si.quantity), 0)
        from SaleItem si
        join si.sale s
        where s.createdAt >= :from
          and s.createdAt < :to
          and (:branchId is null or s.branch.id = :branchId)
    """)
    Long sumQuantityBetween(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("branchId") Long branchId
    );
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