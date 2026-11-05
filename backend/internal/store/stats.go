package store

import (
	"context"

	"github.com/trias059/web-personal/backend/internal/access"
)

type Stats struct {
	UsersByRole map[access.Role]int `json:"users_by_role"`
	Records     map[string]int      `json:"records"`
	Tracks      []TrackStat         `json:"tracks"`
}

type TrackStat struct {
	Track       string  `db:"track" json:"track"`
	Items       int     `db:"items" json:"items"`
	AvgProgress float64 `db:"avg_progress" json:"avg_progress"`
}

type namedCount struct {
	Name string `db:"name"`
	N    int    `db:"n"`
}

const recordCounts = `SELECT 'learning_items' AS name, COUNT(*) AS n FROM learning_items
	UNION ALL SELECT 'flashcards', COUNT(*) FROM flashcards
	UNION ALL SELECT 'vlog_posts', COUNT(*) FROM vlog_posts
	UNION ALL SELECT 'memories', COUNT(*) FROM memories
	UNION ALL SELECT 'curhat_entries', COUNT(*) FROM curhat_entries
	UNION ALL SELECT 'comments', COUNT(*) FROM comments
	UNION ALL SELECT 'profile_details', COUNT(*) FROM profile_details`

// Stats merangkum isi database untuk dashboard Data Management.
func (s *Store) Stats(ctx context.Context) (Stats, error) {
	var roles, records []namedCount
	if err := s.list(ctx, &roles, `SELECT role AS name, COUNT(*) AS n FROM users GROUP BY role`); err != nil {
		return Stats{}, err
	}
	if err := s.list(ctx, &records, recordCounts); err != nil {
		return Stats{}, err
	}
	stats := Stats{
		UsersByRole: map[access.Role]int{},
		Records:     map[string]int{},
		Tracks:      []TrackStat{},
	}
	for _, r := range roles {
		stats.UsersByRole[access.Role(r.Name)] = r.N
	}
	for _, r := range records {
		stats.Records[r.Name] = r.N
	}
	err := s.list(ctx, &stats.Tracks, `SELECT track, COUNT(*) AS items, AVG(CAST(progress AS REAL)) AS avg_progress
		FROM learning_items GROUP BY track ORDER BY track`)
	return stats, err
}
