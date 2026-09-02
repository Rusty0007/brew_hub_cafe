CREATE TABLE IF NOT EXISTS brewhub.telemetry_events (
    id BIGSERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    request_id UUID NULL,
    trace_id UUID NULL,
    user_id BIGINT NULL,
    branch_id BIGINT NULL,
    order_id BIGINT NULL,
    source VARCHAR(50) NULL,
    result VARCHAR(50) NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_event_name ON brewhub.telemetry_events (event_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_created_at ON brewhub.telemetry_events (created_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_event_created ON brewhub.telemetry_events (event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_trace_id ON brewhub.telemetry_events (trace_id);