-- Şube (branch) tablosu
CREATE TABLE core.branch (
                             id BIGSERIAL PRIMARY KEY,
                             name TEXT NOT NULL UNIQUE,
                             address TEXT,
                             phone TEXT,
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ürün (product) tablosu
CREATE TABLE core.product (
                              id BIGSERIAL PRIMARY KEY,
                              name TEXT NOT NULL,
                              category TEXT,
                              price NUMERIC(10,2) NOT NULL,
                              quantity INT DEFAULT 0,
                              vat_rate FLOAT DEFAULT 0.18,
                              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
