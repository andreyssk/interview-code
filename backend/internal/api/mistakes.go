package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/app/interview-prep/internal/store"
)

const (
	maxTitleRunes       = 100
	maxDescriptionRunes = 2000
)

func pathID(w http.ResponseWriter, r *http.Request, name string) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue(name), 10, 64)
	if err != nil || id <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return 0, false
	}
	return id, true
}

func fail(w http.ResponseWriter, err error, what string) {
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
	case errors.Is(err, store.ErrAttemptPassed):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "only failed attempts can be added to mistakes"})
	case errors.Is(err, store.ErrDuplicate):
		writeJSON(w, http.StatusConflict, map[string]string{"error": "this attempt is already in the journal"})
	default:
		log.Printf("%s: %v", what, err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
	}
}

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBody)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON body"})
		return false
	}
	return true
}

func (a *API) listMistakeTypes(w http.ResponseWriter, r *http.Request) {
	types, err := a.store.ListMistakeTypes(r.Context(), currentUser(r).ID)
	if err != nil {
		fail(w, err, "list mistake types")
		return
	}
	writeJSON(w, http.StatusOK, types)
}

type typeInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// readTypeInput decodes and validates a mistake type body; it writes the error response itself.
func readTypeInput(w http.ResponseWriter, r *http.Request) (typeInput, bool) {
	var in typeInput
	if !decode(w, r, &in) {
		return in, false
	}
	in.Title, in.Description = strings.TrimSpace(in.Title), strings.TrimSpace(in.Description)
	if in.Title == "" || utf8.RuneCountInString(in.Title) > maxTitleRunes {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title is required (max 100 characters)"})
		return in, false
	}
	if utf8.RuneCountInString(in.Description) > maxDescriptionRunes {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "description is too long (max 2000 characters)"})
		return in, false
	}
	return in, true
}

func (a *API) createMistakeType(w http.ResponseWriter, r *http.Request) {
	in, ok := readTypeInput(w, r)
	if !ok {
		return
	}
	t, err := a.store.CreateMistakeType(r.Context(), currentUser(r).ID, in.Title, in.Description)
	if err != nil {
		fail(w, err, "create mistake type")
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (a *API) updateMistakeType(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	in, ok := readTypeInput(w, r)
	if !ok {
		return
	}
	t, err := a.store.UpdateMistakeType(r.Context(), currentUser(r).ID, id, in.Title, in.Description)
	if err != nil {
		fail(w, err, "update mistake type")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (a *API) getMistakeType(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	d, err := a.store.GetMistakeType(r.Context(), currentUser(r).ID, id)
	if err != nil {
		fail(w, err, "get mistake type")
		return
	}
	writeJSON(w, http.StatusOK, d)
}

func (a *API) deleteMistakeType(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	if err := a.store.DeleteMistakeType(r.Context(), currentUser(r).ID, id); err != nil {
		fail(w, err, "delete mistake type")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) addMistake(w http.ResponseWriter, r *http.Request) {
	var in struct {
		AttemptID int64 `json:"attemptId"`
		TypeID    int64 `json:"typeId"`
	}
	if !decode(w, r, &in) {
		return
	}
	if in.AttemptID <= 0 || in.TypeID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "attemptId and typeId are required"})
		return
	}
	m, err := a.store.AddMistake(r.Context(), currentUser(r).ID, in.AttemptID, in.TypeID)
	if err != nil {
		fail(w, err, "add mistake")
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

func (a *API) deleteMistake(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	if err := a.store.DeleteMistake(r.Context(), currentUser(r).ID, id); err != nil {
		fail(w, err, "delete mistake")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) moveMistake(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	var in struct {
		TypeID int64 `json:"typeId"`
	}
	if !decode(w, r, &in) {
		return
	}
	if in.TypeID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "typeId is required"})
		return
	}
	m, err := a.store.MoveMistake(r.Context(), currentUser(r).ID, id, in.TypeID)
	if err != nil {
		fail(w, err, "move mistake")
		return
	}
	writeJSON(w, http.StatusOK, m)
}
