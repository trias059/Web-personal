package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"unicode"
)

type QuizQuestion struct {
	Question    string   `json:"question"`
	Choices     []string `json:"choices"`
	Answer      int      `json:"answer"` // indeks jawaban benar di Choices
	Explanation string   `json:"explanation"`
}

// Quiz meminta LLM membuat soal pilihan ganda dari catatan materi.
func (c *Client) Quiz(ctx context.Context, topic Topic, count int) ([]QuizQuestion, error) {
	reply, err := c.complete(ctx, []Message{
		{Role: "system", Content: quizSystemPrompt},
		{Role: "user", Content: quizPrompt(topic, count)},
	})
	if err != nil {
		return nil, err
	}
	questions := parseQuiz(reply)
	if len(questions) == 0 {
		return nil, fmt.Errorf("%w: soal dari AI tidak bisa dibaca, coba lagi", ErrUpstream)
	}
	return questions[:min(count, len(questions))], nil
}

// rawQuestion menampung soal dari model sebelum dinormalisasi; "answer" bisa
// berupa indeks, huruf pilihan ("B"), atau teks pilihan.
type rawQuestion struct {
	Question    string          `json:"question"`
	Choices     []string        `json:"choices"`
	Answer      json.RawMessage `json:"answer"`
	Explanation string          `json:"explanation"`
}

// parseQuiz mengambil objek JSON dari balasan model (kadang dibungkus blok kode
// markdown) dan membuang soal yang tidak lengkap.
func parseQuiz(reply string) []QuizQuestion {
	start, end := strings.Index(reply, "{"), strings.LastIndex(reply, "}")
	if start < 0 || end < start {
		return nil
	}
	var parsed struct {
		Questions []rawQuestion `json:"questions"`
	}
	if err := json.Unmarshal([]byte(reply[start:end+1]), &parsed); err != nil {
		return nil
	}
	questions := []QuizQuestion{}
	for _, raw := range parsed.Questions {
		if q, ok := raw.normalize(); ok {
			questions = append(questions, q)
		}
	}
	return questions
}

func (r rawQuestion) normalize() (QuizQuestion, bool) {
	q := QuizQuestion{
		Question:    strings.TrimSpace(r.Question),
		Explanation: strings.TrimSpace(r.Explanation),
	}
	for _, choice := range r.Choices {
		choice = strings.TrimSpace(choice)
		if choice == "" {
			return QuizQuestion{}, false
		}
		q.Choices = append(q.Choices, choice)
	}
	if q.Question == "" || len(q.Choices) < 2 {
		return QuizQuestion{}, false
	}
	answer, ok := answerIndex(r.Answer, q.Choices)
	q.Answer = answer
	return q, ok
}

func answerIndex(raw json.RawMessage, choices []string) (int, bool) {
	var index int
	if err := json.Unmarshal(raw, &index); err == nil {
		return index, index >= 0 && index < len(choices)
	}
	var text string
	if err := json.Unmarshal(raw, &text); err != nil {
		return 0, false
	}
	text = strings.TrimSpace(text)
	if letters := []rune(text); len(letters) == 1 {
		index = int(unicode.ToUpper(letters[0]) - 'A')
		return index, index >= 0 && index < len(choices)
	}
	for i, choice := range choices {
		if strings.EqualFold(choice, text) {
			return i, true
		}
	}
	return 0, false
}
