package ai

import (
	"math"
	"strings"
	"unicode"
)

// Sentiment adalah hasil analisis mood sebuah teks.
type Sentiment struct {
	Score float64 `json:"score"` // -1 (sangat negatif) sampai 1 (sangat positif)
	Label string  `json:"label"` // positif, netral, atau negatif
	Terms []Term  `json:"terms"` // kata/emoji yang memengaruhi skor
}

type Term struct {
	Word   string  `json:"word"`
	Weight float64 `json:"weight"`
}

const (
	negationFactor = -0.6 // "tidak senang" berlawanan arah dan lebih lemah dari "sedih"
	boostFactor    = 1.5  // "sangat senang", "senang banget"
	softenFactor   = 0.5  // "agak capek", "sedikit kecewa"
	// normalizer menekan jumlah bobot ke rentang -1..1 (seperti VADER).
	normalizer = 15.0
	// labelThreshold: skor dengan |skor| di bawah ini dianggap netral.
	labelThreshold = 0.1
)

// AnalyzeSentiment menilai mood teks berbahasa Indonesia (dan Inggris) memakai
// leksikon berbobot dengan empat aturan: negasi ("tidak senang"), penguat
// ("senang banget"), pelunak ("agak capek"), dan kontras (bagian setelah "tapi"
// lebih berbobot).
func AnalyzeSentiment(text string) Sentiment {
	terms := []Term{}
	var sum float64
	for _, sentence := range splitSentences(text) {
		tokens := words(sentence)
		contrastAt := -1
		for i, tok := range tokens {
			if contrastWords[tok] {
				contrastAt = i
			}
		}
		for i, tok := range tokens {
			word, weight, ok := lookup(tok)
			if !ok {
				continue
			}
			if negated(tokens, i) {
				weight *= negationFactor
			}
			if boosted(tokens, i) {
				weight *= boostFactor
			}
			if i > 0 && softeners[tokens[i-1]] {
				weight *= softenFactor
			}
			switch {
			case contrastAt < 0:
			case i < contrastAt:
				weight *= 0.5
			default:
				weight *= 1.5
			}
			sum += weight
			terms = append(terms, Term{Word: word, Weight: round(weight, 2)})
		}
	}
	for _, r := range text {
		if weight, ok := emojiWeights[r]; ok {
			sum += weight
			terms = append(terms, Term{Word: string(r), Weight: weight})
		}
	}

	score := round(sum/math.Sqrt(sum*sum+normalizer), 3)
	return Sentiment{Score: score, Label: MoodLabel(score), Terms: terms}
}

func MoodLabel(score float64) string {
	switch {
	case score >= labelThreshold:
		return "positif"
	case score <= -labelThreshold:
		return "negatif"
	}
	return "netral"
}

func splitSentences(text string) []string {
	return strings.FieldsFunc(text, func(r rune) bool {
		return r == '.' || r == '!' || r == '?' || r == '\n' || r == ';'
	})
}

// words memecah kalimat menjadi kata huruf kecil. Huruf yang diulang 3x atau lebih
// dipendekkan ("senaaang" -> "senang") dan kata ulang beruntun digabung ("senang-senang").
func words(sentence string) []string {
	sentence = strings.NewReplacer("'", "", "’", "").Replace(strings.ToLower(sentence))
	fields := strings.FieldsFunc(sentence, func(r rune) bool { return !unicode.IsLetter(r) })
	tokens := make([]string, 0, len(fields))
	for _, f := range fields {
		f = squeeze(f)
		if n := len(tokens); n > 0 && tokens[n-1] == f {
			continue
		}
		tokens = append(tokens, f)
	}
	return tokens
}

func squeeze(word string) string {
	runes := []rune(word)
	var b strings.Builder
	for i := 0; i < len(runes); {
		j := i
		for j < len(runes) && runes[j] == runes[i] {
			j++
		}
		repeat := j - i
		if repeat >= 3 {
			repeat = 1
		}
		b.WriteString(strings.Repeat(string(runes[i]), repeat))
		i = j
	}
	return b.String()
}

// lookup mencari kata di leksikon, termasuk bentuk tanpa partikel/akhiran
// ("senangnya" -> "senang") dan tawa ("wkwkwk", "hahaha").
func lookup(tok string) (string, float64, bool) {
	for _, laugh := range []string{"wkwk", "haha", "hehe", "hihi"} {
		if strings.HasPrefix(tok, laugh) {
			return tok, lexicon["haha"], true
		}
	}
	if weight, ok := lexicon[tok]; ok {
		return tok, weight, true
	}
	for _, suffix := range []string{"nya", "lah", "kah", "pun", "ku", "mu"} {
		if base, ok := strings.CutSuffix(tok, suffix); ok {
			if weight, ok := lexicon[base]; ok {
				return base, weight, true
			}
		}
	}
	return "", 0, false
}

// negated mengecek dua kata sebelumnya ("tidak terlalu senang") tanpa melewati kata kontras.
func negated(tokens []string, i int) bool {
	for j := i - 1; j >= 0 && j >= i-2; j-- {
		if contrastWords[tokens[j]] {
			return false
		}
		if negators[tokens[j]] {
			return true
		}
	}
	return false
}

func boosted(tokens []string, i int) bool {
	return (i > 0 && boostersBefore[tokens[i-1]]) || (i+1 < len(tokens) && boostersAfter[tokens[i+1]])
}

func round(v float64, decimals int) float64 {
	p := math.Pow(10, float64(decimals))
	return math.Round(v*p) / p
}
