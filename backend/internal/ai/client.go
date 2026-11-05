// Package ai adalah service layer AI: klien LLM untuk endpoint chat completions
// yang kompatibel dengan OpenAI (OpenAI, Anthropic, Ollama, LM Studio, dll.) dan
// analisis sentimen berbasis leksikon untuk mood tracking.
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var (
	ErrDisabled = errors.New("fitur AI belum dikonfigurasi: isi AI_BASE_URL dan AI_MODEL di backend")
	ErrUpstream = errors.New("layanan AI gagal merespons")
)

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Client struct {
	baseURL string
	apiKey  string
	model   string
	http    *http.Client
}

func NewClient(baseURL, apiKey, model string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		model:   model,
		http:    &http.Client{Timeout: 90 * time.Second},
	}
}

func (c *Client) Enabled() bool {
	return c.baseURL != "" && c.model != ""
}

// Hanya model dan messages yang dikirim. Parameter lain (temperature, max_tokens,
// response_format) tidak didukung seragam: model penalaran OpenAI dan Claude terbaru
// menolak temperature selain default, dan Anthropic menolak response_format json_object.
type completionRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type completionResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
}

func (c *Client) complete(ctx context.Context, messages []Message) (string, error) {
	if !c.Enabled() {
		return "", ErrDisabled
	}
	payload, err := json.Marshal(completionRequest{Model: c.model, Messages: messages})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("%w: %w", ErrUpstream, err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return "", fmt.Errorf("%w: %w", ErrUpstream, err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("%w: HTTP %d: %s", ErrUpstream, resp.StatusCode, truncate(string(body), 300))
	}

	var out completionResponse
	if err := json.Unmarshal(body, &out); err != nil || len(out.Choices) == 0 {
		return "", fmt.Errorf("%w: format respons tidak dikenali", ErrUpstream)
	}
	reply := strings.TrimSpace(out.Choices[0].Message.Content)
	if reply == "" {
		return "", fmt.Errorf("%w: balasan kosong", ErrUpstream)
	}
	return reply, nil
}

// Tutor menjawab pertanyaan belajar dengan konteks materi dari Learning Room.
func (c *Client) Tutor(ctx context.Context, topic Topic, history []Message) (string, error) {
	return c.complete(ctx, append([]Message{{Role: "system", Content: tutorPrompt(topic)}}, history...))
}

// Curhat membalas sebagai teman curhat yang empatik.
func (c *Client) Curhat(ctx context.Context, history []Message) (string, error) {
	return c.complete(ctx, append([]Message{{Role: "system", Content: curhatPrompt}}, history...))
}

// truncate memotong teks ke maksimal n rune.
func truncate(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n]) + "…"
}
