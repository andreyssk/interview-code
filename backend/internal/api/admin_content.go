package api

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/app/interview-prep/internal/store"
)

func badRequest(w http.ResponseWriter, msg string) {
	writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
}

// saveFail maps store errors from admin writes to responses.
func saveFail(w http.ResponseWriter, err error, what string) {
	var ref store.ErrBadReference
	switch {
	case errors.As(err, &ref):
		badRequest(w, err.Error())
	case errors.Is(err, store.ErrInUse):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "still in use by tasks or categories; remove those first"})
	case errors.Is(err, store.ErrDuplicate):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "already exists (duplicate number or slug)"})
	default:
		fail(w, err, what)
	}
}

func slugOf(w http.ResponseWriter, r *http.Request) (string, bool) {
	slug := r.PathValue("slug")
	if err := checkSlug("", slug); err != nil {
		badRequest(w, "invalid slug")
		return "", false
	}
	return slug, true
}

// ---- sections / categories / companies

func (a *API) adminPutSection(w http.ResponseWriter, r *http.Request) {
	slug, ok := slugOf(w, r)
	if !ok {
		return
	}
	var in store.Section
	if !decode(w, r, &in) {
		return
	}
	in.Slug, in.Name = slug, strings.TrimSpace(in.Name)
	if err := checkText("name", in.Name, 60); err != nil {
		badRequest(w, err.Error())
		return
	}
	if err := a.store.SaveSection(r.Context(), in); err != nil {
		saveFail(w, err, "save section")
		return
	}
	writeJSON(w, http.StatusOK, in)
}

func (a *API) adminPutCategory(w http.ResponseWriter, r *http.Request) {
	slug, ok := slugOf(w, r)
	if !ok {
		return
	}
	var in store.Category
	if !decode(w, r, &in) {
		return
	}
	in.Slug, in.Name = slug, strings.TrimSpace(in.Name)
	if err := checkText("name", in.Name, 60); err != nil {
		badRequest(w, err.Error())
		return
	}
	if err := checkSlug("section", in.Section); err != nil {
		badRequest(w, err.Error())
		return
	}
	if len(in.Glyph) > 12 || len(in.JP) > 24 || len(in.Color) > 60 {
		badRequest(w, "glyph, jp or color is too long")
		return
	}
	if in.Color == "" {
		in.Color = "var(--cyan)"
	}
	if err := a.store.SaveCategory(r.Context(), in); err != nil {
		saveFail(w, err, "save category")
		return
	}
	writeJSON(w, http.StatusOK, in)
}

func (a *API) adminPutCompany(w http.ResponseWriter, r *http.Request) {
	slug, ok := slugOf(w, r)
	if !ok {
		return
	}
	var in store.Company
	if !decode(w, r, &in) {
		return
	}
	in.Slug, in.Name = slug, strings.TrimSpace(in.Name)
	if err := checkText("name", in.Name, 60); err != nil {
		badRequest(w, err.Error())
		return
	}
	if in.Tone == "" {
		in.Tone = "neon-violet"
	}
	if !toneRe.MatchString(in.Tone) {
		badRequest(w, "tone must be a neon-* class")
		return
	}
	if err := a.store.SaveCompany(r.Context(), in); err != nil {
		saveFail(w, err, "save company")
		return
	}
	writeJSON(w, http.StatusOK, in)
}

func (a *API) adminDeleter(del func(ctx context.Context, slug string) error, what string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slug, ok := slugOf(w, r)
		if !ok {
			return
		}
		if err := del(r.Context(), slug); err != nil {
			saveFail(w, err, what)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// ---- tasks

func (a *API) adminPutTask(w http.ResponseWriter, r *http.Request) {
	slug, ok := slugOf(w, r)
	if !ok {
		return
	}
	var in store.Task
	if !decode(w, r, &in) {
		return
	}
	if in.Slug != "" && in.Slug != slug {
		badRequest(w, "slug in the body does not match the URL")
		return
	}
	in.Slug = slug
	if err := validateTask(&in); err != nil {
		badRequest(w, err.Error())
		return
	}
	if err := a.store.SaveTask(r.Context(), in); err != nil {
		saveFail(w, err, "save task")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- articles

func (a *API) adminPutArticle(w http.ResponseWriter, r *http.Request) {
	slug, ok := slugOf(w, r)
	if !ok {
		return
	}
	var in store.Article
	if !decode(w, r, &in) {
		return
	}
	if in.Slug != "" && in.Slug != slug {
		badRequest(w, "slug in the body does not match the URL")
		return
	}
	in.Slug = slug
	if err := validateArticle(&in); err != nil {
		badRequest(w, err.Error())
		return
	}
	if err := a.store.SaveArticle(r.Context(), in); err != nil {
		saveFail(w, err, "save article")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- questions

func (a *API) adminPutQuestionCategory(w http.ResponseWriter, r *http.Request) {
	slug, ok := slugOf(w, r)
	if !ok {
		return
	}
	var in store.QuestionCategory
	if !decode(w, r, &in) {
		return
	}
	in.Slug, in.Name = slug, strings.TrimSpace(in.Name)
	if err := checkText("name", in.Name, 60); err != nil {
		badRequest(w, err.Error())
		return
	}
	if err := a.store.SaveQuestionCategory(r.Context(), in); err != nil {
		saveFail(w, err, "save question category")
		return
	}
	writeJSON(w, http.StatusOK, in)
}

// Route segments reserved for the implicit pages /questions/{category}/all and /questions/{category}/other.
func (a *API) adminPutQuestionSubcategory(w http.ResponseWriter, r *http.Request) {
	slug, ok := slugOf(w, r)
	if !ok {
		return
	}
	var in store.QuestionSubcategory
	if !decode(w, r, &in) {
		return
	}
	in.Slug, in.Name = slug, strings.TrimSpace(in.Name)
	if slug == "all" || slug == "other" {
		badRequest(w, `"all" and "other" are reserved`)
		return
	}
	if err := checkText("name", in.Name, 60); err != nil {
		badRequest(w, err.Error())
		return
	}
	if err := checkSlug("category", in.Category); err != nil {
		badRequest(w, err.Error())
		return
	}
	if err := a.store.SaveQuestionSubcategory(r.Context(), in); err != nil {
		saveFail(w, err, "save question subcategory")
		return
	}
	writeJSON(w, http.StatusOK, in)
}

// adminSaveQuestion creates (POST) or replaces (PUT /{id}) a question and returns it with its id.
func (a *API) adminSaveQuestion(w http.ResponseWriter, r *http.Request) {
	var in store.Question
	if !decode(w, r, &in) {
		return
	}
	in.ID = 0
	if r.Method == http.MethodPut {
		id, ok := pathID(w, r, "id")
		if !ok {
			return
		}
		in.ID = id
	}
	if err := validateQuestion(&in); err != nil {
		badRequest(w, err.Error())
		return
	}
	id, err := a.store.SaveQuestion(r.Context(), in)
	if err != nil {
		saveFail(w, err, "save question")
		return
	}
	in.ID = id
	writeJSON(w, http.StatusOK, in)
}

func (a *API) adminDeleteQuestion(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	if err := a.store.DeleteQuestion(r.Context(), id); err != nil {
		saveFail(w, err, "delete question")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) registerAdminContent(mux *http.ServeMux) {
	mux.HandleFunc("PUT /api/admin/question-categories/{slug}", a.adminPutQuestionCategory)
	mux.HandleFunc("DELETE /api/admin/question-categories/{slug}", a.adminDeleter(a.store.DeleteQuestionCategory, "delete question category"))
	mux.HandleFunc("PUT /api/admin/question-subcategories/{slug}", a.adminPutQuestionSubcategory)
	mux.HandleFunc("DELETE /api/admin/question-subcategories/{slug}", a.adminDeleter(a.store.DeleteQuestionSubcategory, "delete question subcategory"))
	mux.HandleFunc("POST /api/admin/questions", a.adminSaveQuestion)
	mux.HandleFunc("PUT /api/admin/questions/{id}", a.adminSaveQuestion)
	mux.HandleFunc("DELETE /api/admin/questions/{id}", a.adminDeleteQuestion)
	mux.HandleFunc("PUT /api/admin/sections/{slug}", a.adminPutSection)
	mux.HandleFunc("PUT /api/admin/categories/{slug}", a.adminPutCategory)
	mux.HandleFunc("PUT /api/admin/companies/{slug}", a.adminPutCompany)
	mux.HandleFunc("PUT /api/admin/tasks/{slug}", a.adminPutTask)
	mux.HandleFunc("PUT /api/admin/articles/{slug}", a.adminPutArticle)
	mux.HandleFunc("DELETE /api/admin/sections/{slug}", a.adminDeleter(a.store.DeleteSection, "delete section"))
	mux.HandleFunc("DELETE /api/admin/categories/{slug}", a.adminDeleter(a.store.DeleteCategory, "delete category"))
	mux.HandleFunc("DELETE /api/admin/companies/{slug}", a.adminDeleter(a.store.DeleteCompany, "delete company"))
	mux.HandleFunc("DELETE /api/admin/tasks/{slug}", a.adminDeleter(a.store.DeleteTask, "delete task"))
	mux.HandleFunc("DELETE /api/admin/articles/{slug}", a.adminDeleter(a.store.DeleteArticle, "delete article"))
}
