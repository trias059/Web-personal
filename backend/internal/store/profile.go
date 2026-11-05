package store

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/trias059/web-personal/backend/internal/access"
)

// Profile adalah bagian biodata yang selalu publik.
type Profile struct {
	FullName  string     `db:"full_name" json:"full_name"`
	Headline  string     `db:"headline" json:"headline"`
	Bio       string     `db:"bio" json:"bio"`
	PhotoURL  string     `db:"photo_url" json:"photo_url"`
	Skills    StringList `db:"skills" json:"skills"`
	UpdatedAt time.Time  `db:"updated_at" json:"updated_at"`
}

// ProfileDetail adalah baris biodata (kontak, sosial media, dll.) dengan visibility sendiri.
type ProfileDetail struct {
	ID         int64             `db:"id" json:"id"`
	Label      string            `db:"label" json:"label"`
	Value      string            `db:"value" json:"value"`
	Visibility access.Visibility `db:"visibility" json:"visibility"`
}

func (s *Store) Profile(ctx context.Context) (Profile, error) {
	var p Profile
	err := s.get(ctx, &p, `SELECT full_name, headline, bio, photo_url, skills, updated_at FROM profile WHERE id = 1`)
	return p, err
}

func (s *Store) UpdateProfile(ctx context.Context, p Profile) (Profile, error) {
	err := s.execOne(ctx, `UPDATE profile SET full_name = ?, headline = ?, bio = ?, photo_url = ?, skills = ?,
		updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
		p.FullName, p.Headline, p.Bio, p.PhotoURL, p.Skills)
	if err != nil {
		return Profile{}, err
	}
	return s.Profile(ctx)
}

func (s *Store) ProfileDetails(ctx context.Context, visible []access.Visibility) ([]ProfileDetail, error) {
	query, args, err := sqlx.In(`SELECT id, label, value, visibility FROM profile_details
		WHERE visibility IN (?) ORDER BY id`, visible)
	if err != nil {
		return nil, err
	}
	details := []ProfileDetail{}
	err = s.list(ctx, &details, query, args...)
	return details, err
}

func (s *Store) profileDetail(ctx context.Context, id int64) (ProfileDetail, error) {
	var d ProfileDetail
	err := s.get(ctx, &d, `SELECT id, label, value, visibility FROM profile_details WHERE id = ?`, id)
	return d, err
}

func (s *Store) CreateProfileDetail(ctx context.Context, d ProfileDetail) (ProfileDetail, error) {
	id, err := s.insert(ctx, `INSERT INTO profile_details (label, value, visibility) VALUES (?, ?, ?)`,
		d.Label, d.Value, d.Visibility)
	if err != nil {
		return ProfileDetail{}, err
	}
	return s.profileDetail(ctx, id)
}

func (s *Store) UpdateProfileDetail(ctx context.Context, d ProfileDetail) (ProfileDetail, error) {
	err := s.execOne(ctx, `UPDATE profile_details SET label = ?, value = ?, visibility = ? WHERE id = ?`,
		d.Label, d.Value, d.Visibility, d.ID)
	if err != nil {
		return ProfileDetail{}, err
	}
	return s.profileDetail(ctx, d.ID)
}

func (s *Store) DeleteProfileDetail(ctx context.Context, id int64) error {
	return s.execOne(ctx, `DELETE FROM profile_details WHERE id = ?`, id)
}
