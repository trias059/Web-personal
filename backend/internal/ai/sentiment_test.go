package ai

import "testing"

func TestAnalyzeSentimentLabels(t *testing.T) {
	cases := []struct {
		text string
		want string
	}{
		{"Hari ini aku senang banget, akhirnya lulus ujian!", "positif"},
		{"Aku capek dan sedih, semuanya kacau.", "negatif"},
		{"Aku tidak bahagia dengan hasilnya.", "negatif"},
		{"Capek sih, tapi seneng banget bisa ketemu keluarga", "positif"},
		{"Senang sih, tapi kecewa berat sama hasilnya", "negatif"},
		{"Rapat jam 9 lalu makan siang", "netral"},
		{"", "netral"},
		{"senaaaang bangettt 😊", "positif"},
		{"I'm so tired and I don't feel good", "negatif"},
		{"Tidak masalah, semuanya lancar", "positif"},
		{"hari yang berat 😭💔", "negatif"},
	}
	for _, tc := range cases {
		got := AnalyzeSentiment(tc.text)
		if got.Label != tc.want {
			t.Errorf("AnalyzeSentiment(%q) = %s (%.3f, %v), want %s", tc.text, got.Label, got.Score, got.Terms, tc.want)
		}
		if got.Score < -1 || got.Score > 1 {
			t.Errorf("AnalyzeSentiment(%q) score %.3f di luar rentang -1..1", tc.text, got.Score)
		}
	}
}

func TestAnalyzeSentimentRules(t *testing.T) {
	plain := AnalyzeSentiment("aku senang").Score
	boosted := AnalyzeSentiment("aku sangat senang").Score
	if boosted <= plain {
		t.Errorf("penguat tidak menaikkan skor: %.3f <= %.3f", boosted, plain)
	}
	if negated := AnalyzeSentiment("aku tidak senang").Score; negated >= 0 {
		t.Errorf("negasi tidak membalik skor: %.3f", negated)
	}
	terms := AnalyzeSentiment("bahagianya hari ini").Terms
	if len(terms) != 1 || terms[0].Word != "bahagia" {
		t.Errorf("akhiran -nya tidak dikenali: %v", terms)
	}
}

func TestMoodLabel(t *testing.T) {
	for score, want := range map[float64]string{0.5: "positif", 0.1: "positif", 0.05: "netral", -0.1: "negatif", -0.9: "negatif"} {
		if got := MoodLabel(score); got != want {
			t.Errorf("MoodLabel(%v) = %s, want %s", score, got, want)
		}
	}
}
