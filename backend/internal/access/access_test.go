package access

import (
	"slices"
	"testing"
)

// Matriks ini menyalin spesifikasi role apa adanya; test gagal jika aturan berubah.
func TestRoomsPerRole(t *testing.T) {
	want := map[Role][]Room{
		SuperAdmin: {Biodata, Learning, Vlog, Curhat, Kenangan, Data},
		Keluarga:   {Biodata, Vlog, Kenangan},
		TemanDekat: {Biodata, Vlog, Kenangan},
		Teman:      {Biodata, Vlog},
		Umum:       {Biodata},
	}
	for role, rooms := range want {
		if got := Rooms(role); !slices.Equal(got, rooms) {
			t.Errorf("Rooms(%s) = %v, want %v", role, got, rooms)
		}
	}
}

func TestVisibilityPerRole(t *testing.T) {
	want := map[Role][]Visibility{
		SuperAdmin: {Private, Shared, Public},
		Keluarga:   {Private, Shared, Public},
		TemanDekat: {Shared, Public},
		Teman:      {Public},
		Umum:       {Public},
	}
	for role, visible := range want {
		for _, v := range []Visibility{Private, Shared, Public} {
			if got := CanSee(role, v); got != slices.Contains(visible, v) {
				t.Errorf("CanSee(%s, %s) = %v", role, v, got)
			}
		}
	}
}

func TestCanComment(t *testing.T) {
	for role, want := range map[Role]bool{SuperAdmin: true, Keluarga: true, TemanDekat: true, Teman: false, Umum: false} {
		if got := CanComment(role); got != want {
			t.Errorf("CanComment(%s) = %v, want %v", role, got, want)
		}
	}
}
