package store

import (
	"context"
	"time"

	"github.com/trias059/web-personal/backend/internal/access"
)

type Comment struct {
	ID         int64       `db:"id" json:"id"`
	TargetType string      `db:"target_type" json:"target_type"`
	TargetID   int64       `db:"target_id" json:"target_id"`
	UserID     int64       `db:"user_id" json:"user_id"`
	UserName   string      `db:"user_name" json:"user_name"`
	UserRole   access.Role `db:"user_role" json:"user_role"`
	Body       string      `db:"body" json:"body"`
	CreatedAt  time.Time   `db:"created_at" json:"created_at"`
}

const selectComment = `SELECT c.id, c.target_type, c.target_id, c.user_id, u.name AS user_name,
	u.role AS user_role, c.body, c.created_at
	FROM comments c JOIN users u ON u.id = c.user_id`

func (s *Store) Comments(ctx context.Context, targetType string, targetID int64) ([]Comment, error) {
	comments := []Comment{}
	err := s.list(ctx, &comments, selectComment+` WHERE c.target_type = ? AND c.target_id = ? ORDER BY c.id`,
		targetType, targetID)
	return comments, err
}

func (s *Store) RecentComments(ctx context.Context, limit int) ([]Comment, error) {
	comments := []Comment{}
	err := s.list(ctx, &comments, selectComment+` ORDER BY c.id DESC LIMIT ?`, limit)
	return comments, err
}

func (s *Store) Comment(ctx context.Context, id int64) (Comment, error) {
	var c Comment
	err := s.get(ctx, &c, selectComment+` WHERE c.id = ?`, id)
	return c, err
}

func (s *Store) CreateComment(ctx context.Context, c Comment) (Comment, error) {
	id, err := s.insert(ctx, `INSERT INTO comments (target_type, target_id, user_id, body) VALUES (?, ?, ?, ?)`,
		c.TargetType, c.TargetID, c.UserID, c.Body)
	if err != nil {
		return Comment{}, err
	}
	return s.Comment(ctx, id)
}

func (s *Store) DeleteComment(ctx context.Context, id int64) error {
	return s.execOne(ctx, `DELETE FROM comments WHERE id = ?`, id)
}
