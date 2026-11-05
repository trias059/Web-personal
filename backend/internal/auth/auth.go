// Package auth menangani hash password (bcrypt) dan token JWT.
package auth

import (
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 12

// dummyHash adalah hash bcrypt (cost 12) dari string acak. Dipakai saat email tidak
// ditemukan agar lama respons login sama dan email terdaftar tidak bisa ditebak.
const dummyHash = "$2a$12$lc9aXTYYttK8K9HaEPqeq.MrvEup.uym6bNUvF5MNBABW5RZj44ce"

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	return string(hash), err
}

// ComparePassword mengecek password terhadap hash. Hash kosong (user tidak ada)
// selalu gagal, tetapi tetap menjalankan bcrypt supaya waktunya sama.
func ComparePassword(hash, password string) bool {
	if hash == "" {
		_ = bcrypt.CompareHashAndPassword([]byte(dummyHash), []byte(password))
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

type Tokens struct {
	secret []byte
	ttl    time.Duration
}

func NewTokens(secret string, ttl time.Duration) *Tokens {
	return &Tokens{secret: []byte(secret), ttl: ttl}
}

func (t *Tokens) Issue(userID int64) (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   strconv.FormatInt(userID, 10),
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(t.ttl)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(t.secret)
}

// Parse memvalidasi token dan mengembalikan ID user di dalamnya.
func (t *Tokens) Parse(token string) (int64, error) {
	var claims jwt.RegisteredClaims
	_, err := jwt.ParseWithClaims(token, &claims,
		func(*jwt.Token) (any, error) { return t.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return 0, err
	}
	return strconv.ParseInt(claims.Subject, 10, 64)
}
