-- =============================================
-- PHOTOVAULT SUPABASE DATABASE SETUP
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 0,
    height INTEGER NOT NULL DEFAULT 0,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device TEXT,
    location TEXT,
    backed_up BOOLEAN NOT NULL DEFAULT true,
    s3_key_original TEXT NOT NULL,
    s3_key_preview TEXT NOT NULL,
    s3_key_thumb TEXT NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If you created tables before adding new columns, CREATE TABLE IF NOT EXISTS won't update them.
-- Keep this setup idempotent by adding critical columns when missing.
ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'pending';

-- Albums table
CREATE TABLE IF NOT EXISTS albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Album-Photos junction table
CREATE TABLE IF NOT EXISTS album_photos (
    album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (album_id, photo_id)
);

-- User storage connection (Bring Your Own Storage)
CREATE TABLE IF NOT EXISTS user_storage (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'aws_s3',
    bucket TEXT NOT NULL,
    region TEXT NOT NULL,
    endpoint TEXT,
    quota_bytes BIGINT,
    access_key_id_enc TEXT NOT NULL,
    secret_access_key_enc TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos(taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_backed_up ON photos(backed_up);
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_album_photos_album_id ON album_photos(album_id);
CREATE INDEX IF NOT EXISTS idx_album_photos_photo_id ON album_photos(photo_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- This is what prevents User A from seeing User B's photos!
-- =============================================

-- Enable RLS on all tables
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_storage ENABLE ROW LEVEL SECURITY;

-- Photos policies: Users can only see/modify their own photos
CREATE POLICY "Users can view own photos" ON photos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos" ON photos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own photos" ON photos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos" ON photos
    FOR DELETE USING (auth.uid() = user_id);

-- Albums policies: Users can only see/modify their own albums
CREATE POLICY "Users can view own albums" ON albums
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own albums" ON albums
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own albums" ON albums
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own albums" ON albums
    FOR DELETE USING (auth.uid() = user_id);

-- Album_photos policies: Users can only modify album_photos for their own albums
CREATE POLICY "Users can view own album_photos" ON album_photos
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM albums WHERE albums.id = album_photos.album_id AND albums.user_id = auth.uid())
    );

CREATE POLICY "Users can insert own album_photos" ON album_photos
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM albums WHERE albums.id = album_photos.album_id AND albums.user_id = auth.uid())
    );

CREATE POLICY "Users can delete own album_photos" ON album_photos
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM albums WHERE albums.id = album_photos.album_id AND albums.user_id = auth.uid())
    );

-- user_storage policies: user can manage their own storage connection
CREATE POLICY "Users can view own storage" ON user_storage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storage" ON user_storage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storage" ON user_storage
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own storage" ON user_storage
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS for updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_updated_at
    BEFORE UPDATE ON albums
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_storage_updated_at
    BEFORE UPDATE ON user_storage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- USER SESSIONS (for session management & security)
-- =============================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    device_info TEXT,
    ip_address TEXT,
    user_agent TEXT,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    is_current BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON user_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- DONE!
-- Your database is now set up with:
-- ✓ Tables for photos, albums, and their relationships
-- ✓ Indexes for fast queries
-- ✓ Row Level Security to isolate user data
-- ✓ Automatic updated_at timestamps
-- ✓ Session tracking for security
-- =============================================
