package ai

// lexicon memberi bobot -3..3 pada kata yang sering muncul di jurnal harian,
// termasuk bahasa gaul dan kosakata Inggris yang lazim dipakai.
var lexicon = map[string]float64{
	// positif
	"senang": 2, "seneng": 2, "bahagia": 3, "gembira": 2.5, "ceria": 2, "riang": 2,
	"suka": 1, "cinta": 2.5, "sayang": 2, "syukur": 2, "bersyukur": 2.5, "alhamdulillah": 2,
	"lega": 2, "tenang": 1.5, "damai": 2, "nyaman": 1.5, "puas": 2, "bangga": 2,
	"semangat": 2, "bersemangat": 2, "optimis": 2, "yakin": 1, "percaya": 1, "kuat": 1,
	"berhasil": 2, "sukses": 2, "lulus": 2, "menang": 2, "lancar": 1.5, "sembuh": 2,
	"hebat": 2, "keren": 1.5, "bagus": 1.5, "baik": 1, "mantap": 2, "mantul": 2,
	"asik": 1.5, "asyik": 1.5, "seru": 1.5, "lucu": 1, "indah": 2, "enak": 1.5,
	"sehat": 1.5, "segar": 1, "seger": 1, "santai": 1, "rileks": 1.5, "aman": 1,
	"produktif": 1.5, "termotivasi": 2, "terinspirasi": 2, "menyenangkan": 2,
	"membahagiakan": 2.5, "menikmati": 1.5, "nikmat": 1.5, "tertawa": 1.5, "ketawa": 1.5,
	"senyum": 1.5, "tersenyum": 1.5, "beruntung": 2, "berkah": 2, "rezeki": 1.5, "rejeki": 1.5,
	"terbaik": 2, "sempurna": 2.5, "istimewa": 2, "hangat": 1, "makasih": 1.5, "terimakasih": 1.5,
	"hore": 2, "yey": 1.5, "yeay": 1.5, "haha": 1,
	"happy": 2, "glad": 2, "great": 2, "good": 1.5, "love": 2.5, "excited": 2,
	"grateful": 2.5, "thankful": 2, "awesome": 2, "amazing": 2.5, "fun": 1.5, "calm": 1.5,
	"proud": 2, "nice": 1.5, "relieved": 2, "hopeful": 1.5, "blessed": 2, "productive": 1.5,

	// negatif
	"sedih": -2, "kecewa": -2, "marah": -2.5, "kesal": -2, "kesel": -2, "jengkel": -2,
	"sebal": -2, "sebel": -2, "dongkol": -2, "emosi": -1, "benci": -3, "muak": -2.5,
	"takut": -2, "cemas": -2, "khawatir": -2, "kuatir": -2, "gelisah": -2, "panik": -2,
	"galau": -2, "stres": -2, "stress": -2, "depresi": -3, "frustasi": -2.5, "frustrasi": -2.5,
	"tertekan": -2, "terbebani": -2, "beban": -1, "masalah": -1, "bingung": -1, "ragu": -1,
	"lelah": -1.5, "capek": -1.5, "cape": -1.5, "letih": -1.5, "penat": -1.5, "lemas": -1, "lemes": -1,
	"bosan": -1.5, "bosen": -1.5, "bete": -1.5, "badmood": -2, "malas": -1, "males": -1,
	"sakit": -2, "pusing": -1.5, "demam": -1.5, "mual": -1,
	"kesepian": -2, "sepi": -1, "sendirian": -1, "hampa": -2, "terpuruk": -2.5,
	"menangis": -2, "nangis": -2, "gagal": -2, "kalah": -1.5, "rugi": -1.5,
	"buruk": -2, "jelek": -1.5, "hancur": -2.5, "kacau": -2, "terluka": -2, "luka": -1.5,
	"patah": -1.5, "kehilangan": -2, "duka": -2.5, "berduka": -2.5, "sial": -2,
	"ribet": -1, "susah": -1, "sulit": -1, "berat": -1, "telat": -1, "terlambat": -1,
	"malu": -1, "menyesal": -2, "nyesel": -2, "iri": -1.5, "trauma": -2.5,
	"overthinking": -2, "insecure": -2, "down": -1.5,
	"mengecewakan": -2, "menyedihkan": -2, "menyebalkan": -2, "membosankan": -1.5,
	"melelahkan": -1.5, "menyakitkan": -2.5, "menakutkan": -2,
	"sad": -2, "angry": -2.5, "tired": -1.5, "bad": -1.5, "hate": -3, "upset": -2,
	"worried": -2, "anxious": -2, "stressed": -2, "depressed": -3, "lonely": -2,
	"scared": -2, "afraid": -2, "cry": -2, "crying": -2, "disappointed": -2,
	"awful": -2.5, "terrible": -2.5, "hurt": -2, "exhausted": -2, "bored": -1.5,
	"sick": -1.5, "overwhelmed": -2,
}

var negators = setOf(
	"tidak", "tak", "gak", "ga", "nggak", "ngga", "enggak", "engga", "nda", "ndak", "kagak",
	"bukan", "belum", "kurang", "jangan", "tanpa",
	"not", "no", "never", "dont", "doesnt", "didnt", "isnt", "wasnt", "cant", "cannot", "without",
)

var boostersBefore = setOf(
	"sangat", "amat", "sungguh", "terlalu", "paling", "begitu", "makin", "semakin", "benar", "bener",
	"super", "very", "really", "so", "extremely", "too",
)

var boostersAfter = setOf("banget", "bgt", "sekali", "pol", "poll")

var softeners = setOf("agak", "sedikit", "rada", "slightly", "somewhat")

var contrastWords = setOf("tapi", "tetapi", "namun", "but", "however")

var emojiWeights = map[rune]float64{
	'😀': 1.5, '😃': 1.5, '😄': 1.5, '😁': 1.5, '😆': 1.5, '😊': 1.5, '🙂': 1, '😍': 2,
	'🥰': 2, '🤗': 1.5, '🥳': 2, '👍': 1, '❤': 2, '💖': 2, '✨': 1,
	'😢': -2, '😭': -2, '😞': -1.5, '😔': -1.5, '😟': -1.5, '😩': -2, '😫': -2,
	'😡': -2.5, '😠': -2, '💔': -2, '😰': -2, '😥': -1.5, '🙁': -1, '😣': -1.5,
}

func setOf(words ...string) map[string]bool {
	set := make(map[string]bool, len(words))
	for _, w := range words {
		set[w] = true
	}
	return set
}
