-- V3: product tablosundaki para/oran kolonlarını NUMERIC'e çevir

-- price: (varsa) DOUBLE/REAL vs -> NUMERIC(12,2)
ALTER TABLE core.product
ALTER COLUMN price TYPE NUMERIC(12,2)
    USING price::numeric(12,2);

-- vat_rate: (varsa) DOUBLE/REAL vs -> NUMERIC(5,2)
ALTER TABLE core.product
ALTER COLUMN vat_rate TYPE NUMERIC(5,2)
    USING vat_rate::numeric(5,2);
