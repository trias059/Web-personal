package store

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"
)

type LearningItem struct {
	ID        int64     `db:"id" json:"id"`
	Track     string    `db:"track" json:"track"`
	Title     string    `db:"title" json:"title"`
	Notes     string    `db:"notes" json:"notes"`
	Progress  int       `db:"progress" json:"progress"`
	CardCount int       `db:"card_count" json:"card_count"`
	DueCount  int       `db:"due_count" json:"due_count"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type Flashcard struct {
	ID             int64     `db:"id" json:"id"`
	LearningItemID int64     `db:"learning_item_id" json:"learning_item_id"`
	ItemTitle      string    `db:"item_title" json:"item_title"`
	Track          string    `db:"track" json:"track"`
	Question       string    `db:"question" json:"question"`
	Answer         string    `db:"answer" json:"answer"`
	Ease           float64   `db:"ease" json:"ease"`
	IntervalDays   int       `db:"interval_days" json:"interval_days"`
	Repetitions    int       `db:"repetitions" json:"repetitions"`
	DueAt          time.Time `db:"due_at" json:"due_at"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}

// selectLearning membutuhkan waktu sekarang sebagai argumen pertama (untuk due_count).
const selectLearning = `SELECT i.id, i.track, i.title, i.notes, i.progress, i.created_at, i.updated_at,
	(SELECT COUNT(*) FROM flashcards f WHERE f.learning_item_id = i.id) AS card_count,
	(SELECT COUNT(*) FROM flashcards f WHERE f.learning_item_id = i.id AND f.due_at <= ?) AS due_count
	FROM learning_items i`

const selectFlashcard = `SELECT f.id, f.learning_item_id, i.title AS item_title, i.track, f.question, f.answer,
	f.ease, f.interval_days, f.repetitions, f.due_at, f.created_at
	FROM flashcards f JOIN learning_items i ON i.id = f.learning_item_id`

// LearningItems mengembalikan semua materi sesuai urutan dibuat.
func (s *Store) LearningItems(ctx context.Context, now time.Time) ([]LearningItem, error) {
	items := []LearningItem{}
	err := s.list(ctx, &items, selectLearning+` ORDER BY i.id`, now)
	return items, err
}

func (s *Store) LearningItem(ctx context.Context, id int64, now time.Time) (LearningItem, error) {
	var item LearningItem
	err := s.get(ctx, &item, selectLearning+` WHERE i.id = ?`, now, id)
	return item, err
}

func (s *Store) CreateLearningItem(ctx context.Context, item LearningItem) (LearningItem, error) {
	id, err := s.insert(ctx, `INSERT INTO learning_items (track, title, notes, progress) VALUES (?, ?, ?, ?)`,
		item.Track, item.Title, item.Notes, item.Progress)
	if err != nil {
		return LearningItem{}, err
	}
	return s.LearningItem(ctx, id, time.Now())
}

func (s *Store) UpdateLearningItem(ctx context.Context, item LearningItem) (LearningItem, error) {
	err := s.execOne(ctx, `UPDATE learning_items SET track = ?, title = ?, notes = ?, progress = ?,
		updated_at = CURRENT_TIMESTAMP WHERE id = ?`, item.Track, item.Title, item.Notes, item.Progress, item.ID)
	if err != nil {
		return LearningItem{}, err
	}
	return s.LearningItem(ctx, item.ID, time.Now())
}

// DeleteLearningItem juga menghapus flashcard-nya (ON DELETE CASCADE).
func (s *Store) DeleteLearningItem(ctx context.Context, id int64) error {
	return s.execOne(ctx, `DELETE FROM learning_items WHERE id = ?`, id)
}

func (s *Store) Flashcards(ctx context.Context, itemID int64) ([]Flashcard, error) {
	cards := []Flashcard{}
	err := s.list(ctx, &cards, selectFlashcard+` WHERE f.learning_item_id = ? ORDER BY f.id`, itemID)
	return cards, err
}

// DueFlashcards mengembalikan kartu yang jadwal review-nya sudah tiba, paling lama dulu.
func (s *Store) DueFlashcards(ctx context.Context, track string, now time.Time, limit int) ([]Flashcard, error) {
	query, args := selectFlashcard+` WHERE f.due_at <= ?`, []any{now}
	if track != "" {
		query += ` AND i.track = ?`
		args = append(args, track)
	}
	cards := []Flashcard{}
	err := s.list(ctx, &cards, query+` ORDER BY f.due_at, f.id LIMIT ?`, append(args, limit)...)
	return cards, err
}

func (s *Store) Flashcard(ctx context.Context, id int64) (Flashcard, error) {
	var card Flashcard
	err := s.get(ctx, &card, selectFlashcard+` WHERE f.id = ?`, id)
	return card, err
}

// CreateFlashcards menyimpan kartu baru (langsung jatuh tempo) dan mengembalikan
// semua kartu milik materi tersebut.
func (s *Store) CreateFlashcards(ctx context.Context, itemID int64, cards []Flashcard, now time.Time) ([]Flashcard, error) {
	err := s.inTx(ctx, func(tx *sqlx.Tx) error {
		query := tx.Rebind(`INSERT INTO flashcards (learning_item_id, question, answer, due_at) VALUES (?, ?, ?, ?)`)
		for _, card := range cards {
			if _, err := tx.ExecContext(ctx, query, itemID, card.Question, card.Answer, now); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.Flashcards(ctx, itemID)
}

func (s *Store) SaveFlashcardSchedule(ctx context.Context, card Flashcard) error {
	return s.execOne(ctx, `UPDATE flashcards SET ease = ?, interval_days = ?, repetitions = ?, due_at = ? WHERE id = ?`,
		card.Ease, card.IntervalDays, card.Repetitions, card.DueAt, card.ID)
}

func (s *Store) DeleteFlashcard(ctx context.Context, id int64) error {
	return s.execOne(ctx, `DELETE FROM flashcards WHERE id = ?`, id)
}
