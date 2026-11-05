// Package store berisi akses database: koneksi, migrasi, dan query per resource.
package store

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib" // driver "pgx"
	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
	_ "modernc.org/sqlite" // driver "sqlite"
)

// Folder di dalam migrations/ dinamai sesuai dialek goose: postgres dan sqlite3.
//
//go:embed migrations
var migrations embed.FS

var ErrNotFound = errors.New("data tidak ditemukan")

type Store struct {
	db *sqlx.DB
}

// Open membuka database lalu menjalankan migrasi yang belum diterapkan. URL yang
// diawali postgres:// atau postgresql:// memakai PostgreSQL; selain itu dianggap
// path file SQLite.
func Open(ctx context.Context, url string) (*Store, error) {
	db, dialect, err := connect(url)
	if err != nil {
		return nil, err
	}
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("koneksi database: %w", err)
	}
	if err := migrate(ctx, db.DB, dialect); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrasi database: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func connect(url string) (*sqlx.DB, goose.Dialect, error) {
	if strings.HasPrefix(url, "postgres://") || strings.HasPrefix(url, "postgresql://") {
		db, err := sqlx.Open("pgx", url)
		return db, goose.DialectPostgres, err
	}

	if err := os.MkdirAll(filepath.Dir(url), 0o755); err != nil {
		return nil, "", fmt.Errorf("membuat folder database: %w", err)
	}
	dsn := "file:" + url + "?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_time_format=sqlite"
	db, err := sqlx.Open("sqlite", dsn)
	if err != nil {
		return nil, "", err
	}
	// SQLite hanya punya satu penulis; satu koneksi mencegah error "database is locked".
	db.SetMaxOpenConns(1)
	return db, goose.DialectSQLite3, nil
}

func migrate(ctx context.Context, db *sql.DB, dialect goose.Dialect) error {
	fsys, err := fs.Sub(migrations, "migrations/"+string(dialect))
	if err != nil {
		return err
	}
	provider, err := goose.NewProvider(dialect, db, fsys)
	if err != nil {
		return err
	}
	_, err = provider.Up(ctx)
	return err
}

// Semua query ditulis dengan placeholder "?" lalu di-Rebind sesuai driver
// ("$1" untuk PostgreSQL).

func (s *Store) get(ctx context.Context, dest any, query string, args ...any) error {
	err := s.db.GetContext(ctx, dest, s.db.Rebind(query), args...)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (s *Store) list(ctx context.Context, dest any, query string, args ...any) error {
	return s.db.SelectContext(ctx, dest, s.db.Rebind(query), args...)
}

// insert menjalankan INSERT dan mengembalikan id baris baru.
func (s *Store) insert(ctx context.Context, query string, args ...any) (int64, error) {
	var id int64
	err := s.db.QueryRowxContext(ctx, s.db.Rebind(query+" RETURNING id"), args...).Scan(&id)
	return id, err
}

// execOne menjalankan UPDATE/DELETE untuk satu baris; ErrNotFound jika tidak ada yang berubah.
func (s *Store) execOne(ctx context.Context, query string, args ...any) error {
	res, err := s.db.ExecContext(ctx, s.db.Rebind(query), args...)
	if err != nil {
		return err
	}
	return expectOneRow(res)
}

func (s *Store) inTx(ctx context.Context, fn func(tx *sqlx.Tx) error) error {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

func expectOneRow(res sql.Result) error {
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
