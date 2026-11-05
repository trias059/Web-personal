package api

import (
	"cmp"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/trias059/web-personal/backend/internal/srs"
	"github.com/trias059/web-personal/backend/internal/store"
)

type learningRequest struct {
	Track    string `json:"track" binding:"required,oneof=bahasa backend ai"`
	Title    string `json:"title" binding:"notblank,max=200"`
	Notes    string `json:"notes" binding:"max=50000"`
	Progress int    `json:"progress" binding:"min=0,max=100"`
}

type trackQuery struct {
	Track string `form:"track" binding:"omitempty,oneof=bahasa backend ai"`
	Limit int    `form:"limit" binding:"omitempty,min=1,max=100"`
}

type flashcardsRequest struct {
	Cards []struct {
		Question string `json:"question" binding:"notblank,max=1000"`
		Answer   string `json:"answer" binding:"notblank,max=2000"`
	} `json:"cards" binding:"required,min=1,max=50,dive"`
}

type reviewRequest struct {
	Grade srs.Grade `json:"grade" binding:"required,oneof=again hard good easy"`
}

func (s *Server) listLearning(c *gin.Context) {
	var q trackQuery
	if !bindQuery(c, &q) {
		return
	}
	items, err := s.store.LearningItems(c.Request.Context(), q.Track, time.Now())
	respond(c, http.StatusOK, items, err)
}

func (s *Server) getLearning(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	item, err := s.store.LearningItem(c.Request.Context(), id, time.Now())
	respond(c, http.StatusOK, item, err)
}

func (s *Server) createLearning(c *gin.Context) {
	item, ok := bindLearning(c)
	if !ok {
		return
	}
	created, err := s.store.CreateLearningItem(c.Request.Context(), item)
	respond(c, http.StatusCreated, created, err)
}

func (s *Server) updateLearning(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	item, ok := bindLearning(c)
	if !ok {
		return
	}
	item.ID = id
	updated, err := s.store.UpdateLearningItem(c.Request.Context(), item)
	respond(c, http.StatusOK, updated, err)
}

func (s *Server) deleteLearning(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	respond(c, http.StatusNoContent, nil, s.store.DeleteLearningItem(c.Request.Context(), id))
}

func (s *Server) listFlashcards(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	ctx := c.Request.Context()
	if _, err := s.store.LearningItem(ctx, id, time.Now()); err != nil {
		fail(c, err)
		return
	}
	cards, err := s.store.Flashcards(ctx, id)
	respond(c, http.StatusOK, cards, err)
}

// createFlashcards menyimpan kartu (manual atau hasil kuis AI) untuk satu materi.
func (s *Server) createFlashcards(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req flashcardsRequest
	if !bindJSON(c, &req) {
		return
	}
	ctx := c.Request.Context()
	if _, err := s.store.LearningItem(ctx, id, time.Now()); err != nil {
		fail(c, err)
		return
	}
	cards := make([]store.Flashcard, len(req.Cards))
	for i, card := range req.Cards {
		cards[i] = store.Flashcard{Question: strings.TrimSpace(card.Question), Answer: strings.TrimSpace(card.Answer)}
	}
	created, err := s.store.CreateFlashcards(ctx, id, cards, time.Now())
	respond(c, http.StatusCreated, created, err)
}

func (s *Server) dueFlashcards(c *gin.Context) {
	var q trackQuery
	if !bindQuery(c, &q) {
		return
	}
	cards, err := s.store.DueFlashcards(c.Request.Context(), q.Track, time.Now(), cmp.Or(q.Limit, 20))
	respond(c, http.StatusOK, cards, err)
}

func (s *Server) reviewFlashcard(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req reviewRequest
	if !bindJSON(c, &req) {
		return
	}
	ctx := c.Request.Context()
	card, err := s.store.Flashcard(ctx, id)
	if err != nil {
		fail(c, err)
		return
	}
	next, due := srs.Review(srs.State{Ease: card.Ease, IntervalDays: card.IntervalDays, Repetitions: card.Repetitions},
		req.Grade, time.Now())
	card.Ease, card.IntervalDays, card.Repetitions, card.DueAt = next.Ease, next.IntervalDays, next.Repetitions, due
	err = s.store.SaveFlashcardSchedule(ctx, card)
	respond(c, http.StatusOK, card, err)
}

func (s *Server) deleteFlashcard(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	respond(c, http.StatusNoContent, nil, s.store.DeleteFlashcard(c.Request.Context(), id))
}

func bindLearning(c *gin.Context) (store.LearningItem, bool) {
	var req learningRequest
	if !bindJSON(c, &req) {
		return store.LearningItem{}, false
	}
	return store.LearningItem{
		Track:    req.Track,
		Title:    strings.TrimSpace(req.Title),
		Notes:    req.Notes,
		Progress: req.Progress,
	}, true
}
