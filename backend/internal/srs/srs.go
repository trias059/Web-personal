// Package srs menjadwalkan review flashcard dengan spaced repetition sederhana
// turunan SM-2 (algoritma yang juga menjadi dasar Anki).
package srs

import (
	"math"
	"time"
)

type Grade string

const (
	Again Grade = "again" // lupa: kartu muncul lagi beberapa menit kemudian
	Hard  Grade = "hard"
	Good  Grade = "good"
	Easy  Grade = "easy"
)

const (
	minEase    = 1.3
	againDelay = 10 * time.Minute
)

// State adalah posisi kartu dalam jadwal review.
type State struct {
	Ease         float64
	IntervalDays int
	Repetitions  int
}

// Review menghitung state berikutnya dan waktu jatuh tempo setelah kartu dinilai.
func Review(s State, g Grade, now time.Time) (State, time.Time) {
	switch g {
	case Again:
		s.Repetitions = 0
		s.IntervalDays = 0
		s.Ease = max(minEase, s.Ease-0.2)
		return s, now.Add(againDelay)
	case Hard:
		s.IntervalDays = max(1, int(math.Round(float64(s.IntervalDays)*1.2)))
		s.Ease = max(minEase, s.Ease-0.15)
	case Good:
		s.IntervalDays = goodInterval(s)
	case Easy:
		s.IntervalDays = max(4, int(math.Round(float64(goodInterval(s))*1.3)))
		s.Ease += 0.15
	}
	s.Repetitions++
	return s, now.AddDate(0, 0, s.IntervalDays)
}

// goodInterval: 1 hari, lalu 3 hari, lalu interval sebelumnya dikali ease.
func goodInterval(s State) int {
	switch s.Repetitions {
	case 0:
		return 1
	case 1:
		return 3
	}
	return max(s.IntervalDays+1, int(math.Round(float64(s.IntervalDays)*s.Ease)))
}
