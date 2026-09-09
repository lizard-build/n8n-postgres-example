CREATE TABLE IF NOT EXISTS public.webhook_events (
  request_id text PRIMARY KEY CHECK (length(request_id) BETWEEN 1 AND 200),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
