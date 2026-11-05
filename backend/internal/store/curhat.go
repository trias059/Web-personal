package store

import (
	"context"
	"time"
)

// CurhatEntry adalah jurnal pribadi pemilik; hanya super_admin yang bisa mengaksesnya.
type CurhatEntry struct {
	ID        int64     `db:"id" json:"id"`
	Body      string    `db:"body" json:"body"`
	MoodScore float64   `db:"mood_score" json:"mood_score"`
	AIReply   string    `db:"ai_reply" json:"ai_reply"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

const selectCurhat = `SELECT id, body, mood_score, ai_reply, created_at FROM curhat_entries`

func (s *Store) CurhatEntries(ctx context.Context) ([]CurhatEntry, error) {
	entries := []CurhatEntry{}
	err := s.list(ctx, &entries, selectCurhat+` ORDER BY created_at DESC, id DESC`)
	return entries, err
}

func (s *Store) CurhatEntry(ctx context.Context, id int64) (CurhatEntry, error) {
	var e CurhatEntry
	err := s.get(ctx, &e, selectCurhat+` WHERE id = ?`, id)
	return e, err
}

func (s *Store) CreateCurhatEntry(ctx context.Context, body string, mood float64) (CurhatEntry, error) {
	id, err := s.insert(ctx, `INSERT INTO curhat_entries (body, mood_score) VALUES (?, ?)`, body, mood)
	if err != nil {
		return CurhatEntry{}, err
	}
	return s.CurhatEntry(ctx, id)
}

// UpdateCurhatEntry mengganti isi jurnal; balasan AI lama dihapus karena tidak lagi sesuai.
func (s *Store) UpdateCurhatEntry(ctx context.Context, id int64, body string, mood float64) (CurhatEntry, error) {
	err := s.execOne(ctx, `UPDATE curhat_entries SET body = ?, mood_score = ?, ai_reply = '' WHERE id = ?`, body, mood, id)
	if err != nil {
		return CurhatEntry{}, err
	}
	return s.CurhatEntry(ctx, id)
}

func (s *Store) SetCurhatReply(ctx context.Context, id int64, reply string) (CurhatEntry, error) {
	if err := s.execOne(ctx, `UPDATE curhat_entries SET ai_reply = ? WHERE id = ?`, reply, id); err != nil {
		return CurhatEntry{}, err
	}
	return s.CurhatEntry(ctx, id)
}

func (s *Store) DeleteCurhatEntry(ctx context.Context, id int64) error {
	return s.execOne(ctx, `DELETE FROM curhat_entries WHERE id = ?`, id)
}
