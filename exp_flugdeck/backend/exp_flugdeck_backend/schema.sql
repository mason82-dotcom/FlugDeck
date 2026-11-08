CREATE TABLE IF NOT EXISTS plugin_db_live_snapshot (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    tenant_id TEXT NULL,
    slot TEXT NOT NULL,
    fetched_at_ms TEXT NOT NULL,
    payload TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_flugdeck_live_snapshot_slot ON plugin_db_live_snapshot (slot);
