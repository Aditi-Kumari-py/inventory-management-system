CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    original_quantity NUMERIC(14, 2) NOT NULL CHECK (original_quantity > 0),
    remaining_quantity NUMERIC(14, 2) NOT NULL CHECK (remaining_quantity >= 0),
    unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
    purchased_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
    total_cost NUMERIC(14, 2) NOT NULL CHECK (total_cost >= 0),
    sold_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    inventory_batch_id UUID NOT NULL
        REFERENCES inventory_batches(id) ON DELETE RESTRICT,
    quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(14, 2) NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC(14, 2) NOT NULL CHECK (total_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    product_code VARCHAR(100) NOT NULL,
    event_type VARCHAR(20) NOT NULL
        CHECK (event_type IN ('purchase', 'sale')),
    quantity NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(14, 2),
    event_timestamp TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'processed',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_fifo
ON inventory_batches (
    product_id,
    purchased_at,
    created_at
)
WHERE remaining_quantity > 0;

CREATE INDEX IF NOT EXISTS idx_sales_product_time
ON sales (product_id, sold_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_time
ON inventory_events (event_timestamp DESC);
