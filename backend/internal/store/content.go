package store

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/trias059/web-personal/backend/internal/access"
)

// ContentKind membedakan konten berbentuk sama (judul, isi, media, tanggal,
// visibility) yang disimpan di tabel berbeda: Vlog dan Kenangan.
type ContentKind struct {
	table string
	// TargetType adalah nilai comments.target_type untuk konten ini.
	TargetType string
}

var (
	Vlog     = ContentKind{table: "vlog_posts", TargetType: "vlog"}
	Kenangan = ContentKind{table: "memories", TargetType: "memory"}
)

type Content struct {
	ID           int64             `db:"id" json:"id"`
	Title        string            `db:"title" json:"title"`
	Body         string            `db:"body" json:"body"`
	MediaURL     string            `db:"media_url" json:"media_url"`
	Visibility   access.Visibility `db:"visibility" json:"visibility"`
	HappenedOn   Date              `db:"happened_on" json:"happened_on"`
	CommentCount int               `db:"comment_count" json:"comment_count"`
	CreatedAt    time.Time         `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time         `db:"updated_at" json:"updated_at"`
}

// selectSQL membutuhkan TargetType sebagai argumen pertama (untuk hitungan komentar).
func (k ContentKind) selectSQL() string {
	return `SELECT t.id, t.title, t.body, t.media_url, t.visibility, t.happened_on, t.created_at, t.updated_at,
		(SELECT COUNT(*) FROM comments c WHERE c.target_type = ? AND c.target_id = t.id) AS comment_count
		FROM ` + k.table + ` t`
}

func (s *Store) ListContent(ctx context.Context, k ContentKind, visible []access.Visibility) ([]Content, error) {
	query, args, err := sqlx.In(k.selectSQL()+` WHERE t.visibility IN (?) ORDER BY t.happened_on DESC, t.id DESC`,
		k.TargetType, visible)
	if err != nil {
		return nil, err
	}
	items := []Content{}
	err = s.list(ctx, &items, query, args...)
	return items, err
}

func (s *Store) Content(ctx context.Context, k ContentKind, id int64) (Content, error) {
	var c Content
	err := s.get(ctx, &c, k.selectSQL()+` WHERE t.id = ?`, k.TargetType, id)
	return c, err
}

func (s *Store) CreateContent(ctx context.Context, k ContentKind, c Content) (Content, error) {
	id, err := s.insert(ctx, `INSERT INTO `+k.table+` (title, body, media_url, visibility, happened_on)
		VALUES (?, ?, ?, ?, ?)`, c.Title, c.Body, c.MediaURL, c.Visibility, c.HappenedOn)
	if err != nil {
		return Content{}, err
	}
	return s.Content(ctx, k, id)
}

func (s *Store) UpdateContent(ctx context.Context, k ContentKind, c Content) (Content, error) {
	err := s.execOne(ctx, `UPDATE `+k.table+` SET title = ?, body = ?, media_url = ?, visibility = ?,
		happened_on = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		c.Title, c.Body, c.MediaURL, c.Visibility, c.HappenedOn, c.ID)
	if err != nil {
		return Content{}, err
	}
	return s.Content(ctx, k, c.ID)
}

// DeleteContent menghapus konten beserta komentarnya.
func (s *Store) DeleteContent(ctx context.Context, k ContentKind, id int64) error {
	return s.inTx(ctx, func(tx *sqlx.Tx) error {
		if _, err := tx.ExecContext(ctx, tx.Rebind(`DELETE FROM comments WHERE target_type = ? AND target_id = ?`),
			k.TargetType, id); err != nil {
			return err
		}
		res, err := tx.ExecContext(ctx, tx.Rebind(`DELETE FROM `+k.table+` WHERE id = ?`), id)
		if err != nil {
			return err
		}
		return expectOneRow(res)
	})
}
