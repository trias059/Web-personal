package api

import (
	"cmp"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/trias059/web-personal/backend/internal/access"
	"github.com/trias059/web-personal/backend/internal/ai"
)

type chatRequest struct {
	Mode           string `json:"mode" binding:"required,oneof=tutor curhat"`
	LearningItemID int64  `json:"learning_item_id" binding:"omitempty,min=1"`
	Track          string `json:"track" binding:"omitempty,oneof=bahasa backend ai"`
	Messages       []struct {
		Role    string `json:"role" binding:"required,oneof=user assistant"`
		Content string `json:"content" binding:"notblank,max=8000"`
	} `json:"messages" binding:"required,min=1,max=40,dive"`
}

type quizRequest struct {
	LearningItemID int64 `json:"learning_item_id" binding:"required,min=1"`
	Count          int   `json:"count" binding:"omitempty,min=1,max=10"`
}

type sentimentRequest struct {
	Text string `json:"text" binding:"max=10000"`
}

// chatRooms: tiap mode chat hanya boleh dipakai role yang bisa membuka room-nya.
var chatRooms = map[string]access.Room{
	"tutor":  access.Learning,
	"curhat": access.Curhat,
}

// chat meneruskan percakapan ke LLM. Riwayat dikirim utuh oleh frontend setiap
// kali, jadi backend tidak menyimpan state percakapan.
func (s *Server) chat(c *gin.Context) {
	var req chatRequest
	if !bindJSON(c, &req) || !allowRoom(c, chatRooms[req.Mode]) {
		return
	}
	history := make([]ai.Message, len(req.Messages))
	for i, m := range req.Messages {
		history[i] = ai.Message{Role: m.Role, Content: m.Content}
	}

	ctx := c.Request.Context()
	if req.Mode == "curhat" {
		reply, err := s.ai.Curhat(ctx, history)
		respond(c, http.StatusOK, gin.H{"reply": reply}, err)
		return
	}

	topic := ai.Topic{Track: req.Track}
	if req.LearningItemID != 0 {
		item, err := s.store.LearningItem(ctx, req.LearningItemID, time.Now())
		if err != nil {
			fail(c, err)
			return
		}
		topic = ai.Topic{Track: item.Track, Title: item.Title, Notes: item.Notes}
	}
	reply, err := s.ai.Tutor(ctx, topic, history)
	respond(c, http.StatusOK, gin.H{"reply": reply}, err)
}

// quiz membuat soal pilihan ganda dari catatan sebuah materi.
func (s *Server) quiz(c *gin.Context) {
	var req quizRequest
	if !bindJSON(c, &req) {
		return
	}
	ctx := c.Request.Context()
	item, err := s.store.LearningItem(ctx, req.LearningItemID, time.Now())
	if err != nil {
		fail(c, err)
		return
	}
	if strings.TrimSpace(item.Notes) == "" {
		abort(c, http.StatusBadRequest, "catatan materi masih kosong; tulis catatan dulu agar AI bisa membuat soal")
		return
	}
	questions, err := s.ai.Quiz(ctx, ai.Topic{Track: item.Track, Title: item.Title, Notes: item.Notes}, cmp.Or(req.Count, 5))
	respond(c, http.StatusOK, gin.H{"questions": questions}, err)
}

func (s *Server) sentiment(c *gin.Context) {
	var req sentimentRequest
	if bindJSON(c, &req) {
		c.JSON(http.StatusOK, ai.AnalyzeSentiment(req.Text))
	}
}
