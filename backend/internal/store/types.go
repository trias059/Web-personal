package store

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// Date adalah tanggal kalender tanpa jam, dikirim di JSON sebagai "2006-01-02".
type Date struct{ t time.Time }

func ParseDate(s string) (Date, error) {
	t, err := time.Parse(time.DateOnly, s)
	return Date{t}, err
}

func (d Date) String() string {
	return d.t.Format(time.DateOnly)
}

func (d Date) MarshalJSON() ([]byte, error) {
	return json.Marshal(d.String())
}

func (d Date) Value() (driver.Value, error) {
	return d.String(), nil
}

func (d *Date) Scan(src any) error {
	switch v := src.(type) {
	case time.Time:
		d.t = v
		return nil
	case string:
		parsed, err := ParseDate(v)
		*d = parsed
		return err
	case []byte:
		parsed, err := ParseDate(string(v))
		*d = parsed
		return err
	}
	return fmt.Errorf("scan Date: tipe %T tidak didukung", src)
}

// StringList disimpan sebagai teks JSON agar skemanya sama di PostgreSQL dan SQLite.
type StringList []string

func (l StringList) Value() (driver.Value, error) {
	if l == nil {
		return "[]", nil
	}
	b, err := json.Marshal([]string(l))
	return string(b), err
}

func (l *StringList) Scan(src any) error {
	switch v := src.(type) {
	case string:
		return json.Unmarshal([]byte(v), (*[]string)(l))
	case []byte:
		return json.Unmarshal(v, (*[]string)(l))
	}
	return fmt.Errorf("scan StringList: tipe %T tidak didukung", src)
}
