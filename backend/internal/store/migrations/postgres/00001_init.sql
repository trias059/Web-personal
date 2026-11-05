-- +goose Up
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('super_admin', 'keluarga', 'teman_dekat', 'teman')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Hanya boleh ada satu super_admin: pemilik rumah digital.
CREATE UNIQUE INDEX users_one_super_admin ON users (role) WHERE role = 'super_admin';

CREATE TABLE profile (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    full_name  TEXT NOT NULL,
    headline   TEXT NOT NULL DEFAULT '',
    bio        TEXT NOT NULL DEFAULT '',
    photo_url  TEXT NOT NULL DEFAULT '',
    skills     TEXT NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO profile (id, full_name) VALUES (1, 'Trias Aji Lomanto');

CREATE TABLE profile_details (
    id         BIGSERIAL PRIMARY KEY,
    label      TEXT NOT NULL,
    value      TEXT NOT NULL,
    visibility TEXT NOT NULL CHECK (visibility IN ('private', 'shared', 'public'))
);

CREATE TABLE learning_items (
    id         BIGSERIAL PRIMARY KEY,
    track      TEXT NOT NULL CHECK (track IN ('bahasa', 'backend', 'ai')),
    title      TEXT NOT NULL,
    notes      TEXT NOT NULL DEFAULT '',
    progress   INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE flashcards (
    id               BIGSERIAL PRIMARY KEY,
    learning_item_id BIGINT NOT NULL REFERENCES learning_items (id) ON DELETE CASCADE,
    question         TEXT NOT NULL,
    answer           TEXT NOT NULL,
    ease             DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    interval_days    INTEGER NOT NULL DEFAULT 0,
    repetitions      INTEGER NOT NULL DEFAULT 0,
    due_at           TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX flashcards_item_idx ON flashcards (learning_item_id);
CREATE INDEX flashcards_due_idx ON flashcards (due_at);

CREATE TABLE vlog_posts (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL DEFAULT '',
    media_url   TEXT NOT NULL DEFAULT '',
    visibility  TEXT NOT NULL CHECK (visibility IN ('private', 'shared', 'public')),
    happened_on DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memories (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL DEFAULT '',
    media_url   TEXT NOT NULL DEFAULT '',
    visibility  TEXT NOT NULL CHECK (visibility IN ('private', 'shared', 'public')),
    happened_on DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE curhat_entries (
    id         BIGSERIAL PRIMARY KEY,
    body       TEXT NOT NULL,
    mood_score DOUBLE PRECISION NOT NULL,
    ai_reply   TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
    id          BIGSERIAL PRIMARY KEY,
    target_type TEXT NOT NULL CHECK (target_type IN ('vlog', 'memory')),
    target_id   BIGINT NOT NULL,
    user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX comments_target_idx ON comments (target_type, target_id);

-- +goose Down
DROP TABLE comments;
DROP TABLE curhat_entries;
DROP TABLE memories;
DROP TABLE vlog_posts;
DROP TABLE flashcards;
DROP TABLE learning_items;
DROP TABLE profile_details;
DROP TABLE profile;
DROP TABLE users;
