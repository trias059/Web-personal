package store

import (
	"context"
	"time"

	"github.com/trias059/web-personal/backend/internal/access"
)

type User struct {
	ID           int64       `db:"id" json:"id"`
	Name         string      `db:"name" json:"name"`
	Email        string      `db:"email" json:"email"`
	PasswordHash string      `db:"password_hash" json:"-"`
	Role         access.Role `db:"role" json:"role"`
	CreatedAt    time.Time   `db:"created_at" json:"created_at"`
}

const selectUser = `SELECT id, name, email, password_hash, role, created_at FROM users`

func (s *Store) CreateUser(ctx context.Context, u User) (User, error) {
	id, err := s.insert(ctx, `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
		u.Name, u.Email, u.PasswordHash, u.Role)
	if err != nil {
		return User{}, err
	}
	return s.UserByID(ctx, id)
}

func (s *Store) UserByID(ctx context.Context, id int64) (User, error) {
	var u User
	err := s.get(ctx, &u, selectUser+` WHERE id = ?`, id)
	return u, err
}

func (s *Store) UserByEmail(ctx context.Context, email string) (User, error) {
	var u User
	err := s.get(ctx, &u, selectUser+` WHERE email = ?`, email)
	return u, err
}

func (s *Store) Users(ctx context.Context) ([]User, error) {
	users := []User{}
	err := s.list(ctx, &users, selectUser+` ORDER BY id`)
	return users, err
}

func (s *Store) HasRole(ctx context.Context, role access.Role) (bool, error) {
	var n int
	err := s.get(ctx, &n, `SELECT COUNT(*) FROM users WHERE role = ?`, role)
	return n > 0, err
}

func (s *Store) UpdateUserRole(ctx context.Context, id int64, role access.Role) (User, error) {
	if err := s.execOne(ctx, `UPDATE users SET role = ? WHERE id = ?`, role, id); err != nil {
		return User{}, err
	}
	return s.UserByID(ctx, id)
}

func (s *Store) DeleteUser(ctx context.Context, id int64) error {
	return s.execOne(ctx, `DELETE FROM users WHERE id = ?`, id)
}
