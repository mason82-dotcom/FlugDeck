-- FlugDeck-Backend: Speichervertrag (einzige Quelle für Entitätstypen und Build-Projektion).
-- Erlaubte Syntax laut DJI-Toolchain: CREATE TABLE / CREATE [UNIQUE] INDEX / ALTER TABLE ADD COLUMN /
-- DROP INDEX / BEGIN / COMMIT. Spaltentypen nur TEXT und TIMESTAMPTZ, keine DEFAULTs.
-- Tabellen tragen das Präfix plugin_db_; id, tenant_id, created_at und updated_at injiziert die Plattform.
-- Fachwerte sind Text: Millisekunden-Zeitstempel 13-stellig, Zahlen als Dezimaltext.
-- Vor dem Deployment führt der Betreiber dieses Skript in der Plugin-Datenbank aus.

BEGIN;

-- Ein Flug pro flightId des Cockpits (flight_key ist der fachliche Idempotenzschlüssel).
-- media_ref verweist später auf Fotos und Videos des Flugs (z. B. Medienordner-Pfad).
CREATE TABLE IF NOT EXISTS plugin_db_flugdeck_flight (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NULL,
  flight_key TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL,
  drone_sn TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at_ms TEXT NOT NULL,
  finished_at_ms TEXT NOT NULL,
  max_height_m TEXT NOT NULL,
  max_speed_ms TEXT NOT NULL,
  media_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_flugdeck_flight_project ON plugin_db_flugdeck_flight (project_id);
CREATE INDEX IF NOT EXISTS ix_flugdeck_flight_started ON plugin_db_flugdeck_flight (started_at_ms);

COMMIT;
