// Package access berisi aturan role, room, dan visibility. Semua keputusan hak
// akses di backend diturunkan dari tabel di file ini.
package access

import "slices"

type Role string

const (
	SuperAdmin Role = "super_admin"
	Keluarga   Role = "keluarga"
	TemanDekat Role = "teman_dekat"
	Teman      Role = "teman"
	// Umum adalah pengunjung tanpa login; role ini tidak pernah disimpan di database.
	Umum Role = "umum"
)

type Room string

const (
	Biodata  Room = "biodata"
	Learning Room = "learning"
	Vlog     Room = "vlog"
	Curhat   Room = "curhat"
	Kenangan Room = "kenangan"
	Data     Room = "data"
)

type Visibility string

const (
	Private Visibility = "private"
	Shared  Visibility = "shared"
	Public  Visibility = "public"
)

// roomRules menentukan role yang boleh masuk tiap room, berurutan sesuai navigasi.
var roomRules = []struct {
	room  Room
	roles []Role
}{
	{Biodata, []Role{SuperAdmin, Keluarga, TemanDekat, Teman, Umum}},
	{Learning, []Role{SuperAdmin}},
	{Vlog, []Role{SuperAdmin, Keluarga, TemanDekat, Teman}},
	{Curhat, []Role{SuperAdmin}},
	{Kenangan, []Role{SuperAdmin, Keluarga, TemanDekat}},
	{Data, []Role{SuperAdmin}},
}

// visibleTo menentukan visibility data yang boleh dilihat tiap role di dalam room
// yang bisa ia masuki. Keluarga melihat semua isi Biodata, Vlog, dan Kenangan.
var visibleTo = map[Role][]Visibility{
	SuperAdmin: {Private, Shared, Public},
	Keluarga:   {Private, Shared, Public},
	TemanDekat: {Shared, Public},
	Teman:      {Public},
	Umum:       {Public},
}

func CanEnter(role Role, room Room) bool {
	for _, rule := range roomRules {
		if rule.room == room {
			return slices.Contains(rule.roles, role)
		}
	}
	return false
}

// Rooms mengembalikan room yang bisa dibuka role, sesuai urutan navigasi.
func Rooms(role Role) []Room {
	rooms := []Room{}
	for _, rule := range roomRules {
		if slices.Contains(rule.roles, role) {
			rooms = append(rooms, rule.room)
		}
	}
	return rooms
}

func Visibilities(role Role) []Visibility {
	return visibleTo[role]
}

func CanSee(role Role, v Visibility) bool {
	return slices.Contains(visibleTo[role], v)
}

// CanComment: pemilik, keluarga, dan teman dekat boleh berkomentar; teman tidak.
func CanComment(role Role) bool {
	return role == SuperAdmin || role == Keluarga || role == TemanDekat
}
