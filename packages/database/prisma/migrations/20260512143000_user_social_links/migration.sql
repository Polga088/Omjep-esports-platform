-- Optional social / streamer links on users (non-destructive).
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kick_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stream_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS latest_video_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS latest_live_url TEXT;
