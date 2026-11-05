package ai

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestParseQuiz(t *testing.T) {
	reply := "Berikut soalnya:\n```json\n" + `{"questions":[
		{"question":"Apa itu goroutine?","choices":["Thread ringan","Database","Framework","Compiler"],"answer":0,"explanation":"Dikelola runtime Go."},
		{"question":"Keyword untuk channel?","choices":["go","chan","defer","map"],"answer":"B"},
		{"question":"Bahasa Go dibuat oleh?","choices":["Google","Meta"],"answer":"google"},
		{"question":"Soal rusak","choices":["a","b"],"answer":5},
		{"question":"","choices":["a","b"],"answer":0}
	]}` + "\n```"

	got := parseQuiz(reply)
	if len(got) != 3 {
		t.Fatalf("parseQuiz menghasilkan %d soal, want 3: %+v", len(got), got)
	}
	wantAnswers := []int{0, 1, 0}
	for i, q := range got {
		if q.Answer != wantAnswers[i] {
			t.Errorf("soal %d: answer %d, want %d", i, q.Answer, wantAnswers[i])
		}
	}
	if parseQuiz("maaf, saya tidak bisa") != nil {
		t.Error("balasan tanpa JSON seharusnya menghasilkan nil")
	}
}

func TestClientSendsOpenAICompatibleRequest(t *testing.T) {
	var got struct {
		Model    string    `json:"model"`
		Messages []Message `json:"messages"`
	}
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/chat/completions" {
			t.Errorf("path = %s", r.URL.Path)
		}
		if auth := r.Header.Get("Authorization"); auth != "Bearer kunci" {
			t.Errorf("Authorization = %q", auth)
		}
		if err := json.NewDecoder(r.Body).Decode(&got); err != nil {
			t.Error(err)
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":" Halo! "}}]}`))
	}))
	defer llm.Close()

	client := NewClient(llm.URL+"/v1/", "kunci", "model-uji")
	reply, err := client.Tutor(context.Background(), Topic{Track: "backend", Title: "Goroutine", Notes: "catatan rahasia"},
		[]Message{{Role: "user", Content: "jelaskan"}})
	if err != nil {
		t.Fatal(err)
	}
	if reply != "Halo!" {
		t.Errorf("reply = %q", reply)
	}
	if got.Model != "model-uji" || len(got.Messages) != 2 || got.Messages[0].Role != "system" {
		t.Fatalf("request tidak sesuai: %+v", got)
	}
	if !strings.Contains(got.Messages[0].Content, "catatan rahasia") {
		t.Error("system prompt tutor tidak memuat catatan materi")
	}
}

func TestClientErrors(t *testing.T) {
	if _, err := NewClient("", "", "").Curhat(context.Background(), nil); !errors.Is(err, ErrDisabled) {
		t.Errorf("klien tanpa konfigurasi: err = %v, want ErrDisabled", err)
	}

	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"model tidak ada"}`, http.StatusNotFound)
	}))
	defer llm.Close()
	_, err := NewClient(llm.URL, "", "x").Curhat(context.Background(), []Message{{Role: "user", Content: "hai"}})
	if !errors.Is(err, ErrUpstream) || !strings.Contains(err.Error(), "404") {
		t.Errorf("err = %v, want ErrUpstream dengan status 404", err)
	}
}
