package srs

import (
	"testing"
	"time"
)

func TestReviewProgression(t *testing.T) {
	now := time.Date(2026, 1, 1, 8, 0, 0, 0, time.UTC)
	state := State{Ease: 2.5}

	wantIntervals := []int{1, 3, 8, 20}
	for i, want := range wantIntervals {
		var due time.Time
		state, due = Review(state, Good, now)
		if state.IntervalDays != want {
			t.Fatalf("review good ke-%d: interval %d, want %d", i+1, state.IntervalDays, want)
		}
		if !due.Equal(now.AddDate(0, 0, want)) {
			t.Fatalf("review good ke-%d: due %v", i+1, due)
		}
	}
	if state.Repetitions != len(wantIntervals) {
		t.Errorf("repetitions = %d", state.Repetitions)
	}
}

func TestReviewAgainResetsCard(t *testing.T) {
	now := time.Now()
	state, due := Review(State{Ease: 2.5, IntervalDays: 20, Repetitions: 4}, Again, now)
	if state.Repetitions != 0 || state.IntervalDays != 0 {
		t.Errorf("again tidak mereset kartu: %+v", state)
	}
	if state.Ease != 2.3 {
		t.Errorf("ease = %v, want 2.3", state.Ease)
	}
	if due.Sub(now) != 10*time.Minute {
		t.Errorf("kartu yang lupa harus muncul lagi 10 menit kemudian, got %v", due.Sub(now))
	}
}

func TestReviewEaseBounds(t *testing.T) {
	state := State{Ease: 1.35}
	for range 5 {
		state, _ = Review(state, Hard, time.Now())
	}
	if state.Ease != minEase {
		t.Errorf("ease turun di bawah batas: %v", state.Ease)
	}
	easy, _ := Review(State{Ease: 2.5}, Easy, time.Now())
	if easy.IntervalDays != 4 || easy.Ease != 2.65 {
		t.Errorf("easy pada kartu baru: %+v", easy)
	}
}
