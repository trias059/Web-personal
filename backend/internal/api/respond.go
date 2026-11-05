package api

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"reflect"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"github.com/go-playground/validator/v10/non-standard/validators"

	"github.com/trias059/web-personal/backend/internal/ai"
	"github.com/trias059/web-personal/backend/internal/store"
)

// Validator Gin memakai nama field JSON/query di pesan error dan mengenal tag
// "notblank" (teks wajib diisi dan tidak boleh hanya spasi).
func init() {
	v, ok := binding.Validator.Engine().(*validator.Validate)
	if !ok {
		return
	}
	v.RegisterTagNameFunc(func(f reflect.StructField) string {
		for _, tag := range []string{"json", "form"} {
			if name, _, _ := strings.Cut(f.Tag.Get(tag), ","); name != "" && name != "-" {
				return name
			}
		}
		return f.Name
	})
	if err := v.RegisterValidation("notblank", validators.NotBlank); err != nil {
		panic(err)
	}
}

func abort(c *gin.Context, status int, msg string) {
	c.AbortWithStatusJSON(status, gin.H{"error": msg})
}

// respond mengirim data sebagai JSON (atau status saja jika data nil), atau error jika err tidak nil.
func respond(c *gin.Context, status int, data any, err error) {
	switch {
	case err != nil:
		fail(c, err)
	case data == nil:
		c.Status(status)
	default:
		c.JSON(status, data)
	}
}

// fail menerjemahkan error dari store/AI ke respons HTTP; error tak terduga dicatat di log.
func fail(c *gin.Context, err error) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		abort(c, http.StatusNotFound, "data tidak ditemukan")
	case errors.Is(err, ai.ErrDisabled):
		abort(c, http.StatusServiceUnavailable, err.Error())
	case errors.Is(err, ai.ErrUpstream):
		log.Printf("%s %s: %v", c.Request.Method, c.FullPath(), err)
		abort(c, http.StatusBadGateway, err.Error())
	default:
		log.Printf("%s %s: %v", c.Request.Method, c.FullPath(), err)
		abort(c, http.StatusInternalServerError, "terjadi kesalahan di server")
	}
}

func bindJSON(c *gin.Context, dst any) bool {
	return bindWith(c, dst, binding.JSON)
}

func bindQuery(c *gin.Context, dst any) bool {
	return bindWith(c, dst, binding.Query)
}

func bindWith(c *gin.Context, dst any, b binding.Binding) bool {
	err := c.ShouldBindWith(dst, b)
	if err == nil {
		return true
	}
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		abort(c, http.StatusRequestEntityTooLarge, "ukuran request terlalu besar")
		return false
	}
	abort(c, http.StatusBadRequest, validationMessage(err))
	return false
}

func pathID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		abort(c, http.StatusBadRequest, "id tidak valid")
		return 0, false
	}
	return id, true
}

func validationMessage(err error) string {
	var fieldErrs validator.ValidationErrors
	if !errors.As(err, &fieldErrs) {
		return "format JSON tidak valid"
	}
	msgs := make([]string, 0, len(fieldErrs))
	for _, fe := range fieldErrs {
		msgs = append(msgs, fieldMessage(fe))
	}
	return strings.Join(msgs, "; ")
}

func fieldMessage(fe validator.FieldError) string {
	field := fe.Field()
	switch fe.Tag() {
	case "required", "notblank":
		return field + " wajib diisi"
	case "email":
		return field + " harus berupa email yang valid"
	case "http_url":
		return field + " harus berupa URL http:// atau https://"
	case "oneof":
		return field + " harus salah satu dari: " + fe.Param()
	case "datetime":
		return field + " harus berformat YYYY-MM-DD"
	case "min", "max":
		bound := "minimal"
		if fe.Tag() == "max" {
			bound = "maksimal"
		}
		switch fe.Kind() {
		case reflect.String:
			return fmt.Sprintf("%s %s %s karakter", field, bound, fe.Param())
		case reflect.Slice:
			return fmt.Sprintf("%s %s berisi %s item", field, bound, fe.Param())
		}
		return fmt.Sprintf("%s %s %s", field, bound, fe.Param())
	}
	return field + " tidak valid"
}
