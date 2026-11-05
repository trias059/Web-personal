package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/trias059/web-personal/backend/internal/access"
	"github.com/trias059/web-personal/backend/internal/store"
)

// contentRoom menghubungkan jenis konten dengan room dan path API-nya. Room baru
// yang berbentuk sama (judul, isi, media, tanggal, visibility) cukup ditambah di sini
// beserta tabelnya.
type contentRoom struct {
	path string
	room access.Room
	kind store.ContentKind
}

// contentRooms diindeks dengan target_type komentar.
var contentRooms = map[string]contentRoom{
	store.Vlog.TargetType:     {path: "/vlogs", room: access.Vlog, kind: store.Vlog},
	store.Kenangan.TargetType: {path: "/memories", room: access.Kenangan, kind: store.Kenangan},
}

type contentRequest struct {
	Title      string            `json:"title" binding:"notblank,max=200"`
	Body       string            `json:"body" binding:"max=20000"`
	MediaURL   string            `json:"media_url" binding:"omitempty,http_url,max=500"`
	Visibility access.Visibility `json:"visibility" binding:"required,oneof=private shared public"`
	HappenedOn string            `json:"happened_on" binding:"required"`
}

func (s *Server) contentRoutes(g *gin.RouterGroup, room contentRoom) {
	g.GET("", s.listContent(room))
	g.GET("/:id", s.getContent(room))
	g.POST("", ownerOnly, s.createContent(room))
	g.PUT("/:id", ownerOnly, s.updateContent(room))
	g.DELETE("/:id", ownerOnly, s.deleteContent(room))
}

func (s *Server) listContent(room contentRoom) gin.HandlerFunc {
	return func(c *gin.Context) {
		items, err := s.store.ListContent(c.Request.Context(), room.kind, access.Visibilities(currentRole(c)))
		respond(c, http.StatusOK, items, err)
	}
}

func (s *Server) getContent(room contentRoom) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := pathID(c)
		if !ok {
			return
		}
		item, ok := s.visibleContent(c, room, id)
		if ok {
			c.JSON(http.StatusOK, item)
		}
	}
}

func (s *Server) createContent(room contentRoom) gin.HandlerFunc {
	return func(c *gin.Context) {
		content, ok := bindContent(c)
		if !ok {
			return
		}
		item, err := s.store.CreateContent(c.Request.Context(), room.kind, content)
		respond(c, http.StatusCreated, item, err)
	}
}

func (s *Server) updateContent(room contentRoom) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := pathID(c)
		if !ok {
			return
		}
		content, ok := bindContent(c)
		if !ok {
			return
		}
		content.ID = id
		item, err := s.store.UpdateContent(c.Request.Context(), room.kind, content)
		respond(c, http.StatusOK, item, err)
	}
}

func (s *Server) deleteContent(room contentRoom) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := pathID(c)
		if !ok {
			return
		}
		respond(c, http.StatusNoContent, nil, s.store.DeleteContent(c.Request.Context(), room.kind, id))
	}
}

// visibleContent mengambil konten yang boleh dilihat role saat ini. Konten yang tidak
// boleh dilihat dijawab 404 agar keberadaannya tidak bocor.
func (s *Server) visibleContent(c *gin.Context, room contentRoom, id int64) (store.Content, bool) {
	item, err := s.store.Content(c.Request.Context(), room.kind, id)
	if err == nil && !access.CanSee(currentRole(c), item.Visibility) {
		err = store.ErrNotFound
	}
	if err != nil {
		fail(c, err)
		return store.Content{}, false
	}
	return item, true
}

func bindContent(c *gin.Context) (store.Content, bool) {
	var req contentRequest
	if !bindJSON(c, &req) {
		return store.Content{}, false
	}
	date, err := store.ParseDate(req.HappenedOn)
	if err != nil {
		abort(c, http.StatusBadRequest, "happened_on harus berformat YYYY-MM-DD")
		return store.Content{}, false
	}
	return store.Content{
		Title:      strings.TrimSpace(req.Title),
		Body:       strings.TrimSpace(req.Body),
		MediaURL:   req.MediaURL,
		Visibility: req.Visibility,
		HappenedOn: date,
	}, true
}
