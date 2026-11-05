package ai

import (
	"fmt"
	"strings"
)

// Topic adalah materi belajar yang menjadi konteks AI tutor dan generator kuis.
type Topic struct {
	Track string
	Title string
	Notes string
}

var trackNames = map[string]string{
	"bahasa":  "belajar bahasa",
	"backend": "backend development",
	"ai":      "AI dan machine learning",
}

// maxNotesRunes membatasi catatan yang ikut dikirim agar prompt tidak terlalu panjang.
const maxNotesRunes = 6000

func (t Topic) describe() string {
	var b strings.Builder
	if name, ok := trackNames[t.Track]; ok {
		fmt.Fprintf(&b, "Jalur belajar: %s.\n", name)
	}
	if t.Title != "" {
		fmt.Fprintf(&b, "Materi: %s.\n", t.Title)
	}
	if notes := strings.TrimSpace(t.Notes); notes != "" {
		fmt.Fprintf(&b, "Catatan pengguna tentang materi ini:\n\"\"\"\n%s\n\"\"\"\n", truncate(notes, maxNotesRunes))
	}
	return b.String()
}

func tutorPrompt(t Topic) string {
	return `Kamu adalah AI tutor pribadi yang sabar dan jelas. Jawab dengan bahasa yang dipakai pengguna (default Bahasa Indonesia). Jelaskan konsep langkah demi langkah, beri contoh konkret (sertakan potongan kode untuk materi teknis), dan bila cocok akhiri dengan satu pertanyaan singkat untuk mengecek pemahaman. Kalau pertanyaan di luar materi, tetap bantu secara singkat.

` + t.describe()
}

const curhatPrompt = `Kamu adalah teman curhat yang hangat, empatik, dan tidak menghakimi. Balas dalam Bahasa Indonesia yang santai dan tulus.
- Dengarkan dulu: cerminkan perasaan yang kamu tangkap sebelum memberi saran.
- Validasi emosinya; jangan meremehkan atau buru-buru menyuruh bersyukur.
- Beri saran hanya bila relevan, ringan, dan bisa langsung dilakukan.
- Jangan mendiagnosis kondisi medis atau psikologis.
- Jika ada tanda ingin menyakiti diri sendiri atau orang lain, dengan lembut sarankan segera menghubungi orang terdekat atau layanan darurat 119 ext. 8 (SEJIWA).
- Jawab singkat: 2-4 paragraf pendek.`

const quizSystemPrompt = `Kamu membuat soal latihan pilihan ganda dari catatan belajar. Balas HANYA dengan JSON valid tanpa teks lain.`

func quizPrompt(t Topic, count int) string {
	return fmt.Sprintf(`Buat %d soal pilihan ganda untuk menguji pemahaman materi berikut. Setiap soal punya 4 pilihan dengan tepat satu jawaban benar. Gunakan bahasa yang sama dengan catatan.

%s
Format balasan:
{"questions":[{"question":"...","choices":["...","...","...","..."],"answer":0,"explanation":"..."}]}
"answer" adalah indeks (mulai dari 0) pilihan yang benar.`, count, t.describe())
}
