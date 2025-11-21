-- Product party (batch) tablosu: maliyet + SKT + miktar
CREATE TABLE IF NOT EXISTS product_batches (
                                               id BIGSERIAL PRIMARY KEY,
                                               product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    branch_id  BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    expiry_date DATE,                         -- gıda odaklı kritik
    unit_cost NUMERIC(12,2) NOT NULL,         -- satın alma birim maliyeti
    quantity INT NOT NULL CHECK (quantity >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
CREATE INDEX IF NOT EXISTS idx_batches_product_branch ON product_batches(product_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry        ON product_batches(expiry_date);

-- Satış başlığı
CREATE TABLE IF NOT EXISTS sales (
                                     id BIGSERIAL PRIMARY KEY,
                                     branch_id BIGINT NOT NULL REFERENCES branches(id),
    total_amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

-- Satış kalemi (zaman serisi + COGS)
CREATE TABLE IF NOT EXISTS sale_items (
                                          id BIGSERIAL PRIMARY KEY,
                                          sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    cogs_amount NUMERIC(12,2),                 -- FIFO/FEFO hesaplanıp yazılacak
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
CREATE INDEX IF NOT EXISTS idx_sale_items_product_created ON sale_items(product_id, created_at);

-- Opsiyonel: alert kayıtları (SKT/Slow Seller vs.)
CREATE TABLE IF NOT EXISTS alerts (
                                      id BIGSERIAL PRIMARY KEY,
                                      type VARCHAR(32) NOT NULL,                 -- EXPIRY, SLOW_SELLER, REALLOCATION vb.
    product_id BIGINT REFERENCES products(id),
    branch_id BIGINT REFERENCES branches(id),
    payload JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved BOOLEAN NOT NULL DEFAULT FALSE
    );
CREATE INDEX IF NOT EXISTS idx_alerts_type_created ON alerts(type, created_at);
