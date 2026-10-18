package api

import (
	"errors"
	"net/http"

	"github.com/app/interview-prep/internal/store"
)

const maxSessionCount = 1000

// startStudySession picks the items on the server (SRS needs the user's history) and returns the stored session.
func (a *API) startStudySession(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Kind       string   `json:"kind"`
		Mode       string   `json:"mode"`
		Count      int      `json:"count"`
		Categories []string `json:"categories"`
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Kind != "question" && in.Kind != "quiz" {
		badRequest(w, "kind must be question or quiz")
		return
	}
	if in.Mode != "random" && in.Mode != "srs" {
		badRequest(w, "mode must be random or srs")
		return
	}
	if in.Count < 1 || in.Count > maxSessionCount {
		badRequest(w, "count must be between 1 and 1000")
		return
	}
	if in.Kind == "quiz" {
		in.Categories = nil
	}
	for _, c := range in.Categories {
		if c != store.UncategorizedSlug {
			if err := checkSlug("category", c); err != nil {
				badRequest(w, err.Error())
				return
			}
		}
	}
	id, err := a.store.StartStudySession(r.Context(), currentUser(r).ID, store.SessionParams{Kind: in.Kind, Mode: in.Mode, Count: in.Count, Categories: in.Categories})
	if errors.Is(err, store.ErrEmptyPool) {
		msg := "There are no questions to play in the selected categories."
		if in.Kind == "quiz" {
			msg = "There are no quizzes to play."
		}
		badRequest(w, msg)
		return
	}
	if err != nil {
		fail(w, err, "start session")
		return
	}
	a.writeSession(w, r, id)
}

func (a *API) writeSession(w http.ResponseWriter, r *http.Request, id int64) {
	s, err := a.store.GetSession(r.Context(), currentUser(r).ID, id)
	if err != nil {
		fail(w, err, "get session")
		return
	}
	writeJSON(w, http.StatusOK, s)
}

func (a *API) listSessions(w http.ResponseWriter, r *http.Request) {
	list, err := a.store.Sessions(r.Context(), currentUser(r).ID)
	if err != nil {
		fail(w, err, "list sessions")
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) getSession(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	a.writeSession(w, r, id)
}

// rateSessionItem stores the user's self-assessment of one item (0 very bad … 3 correct).
func (a *API) rateSessionItem(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	var in struct {
		Position int `json:"position"`
		Rating   int `json:"rating"`
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Rating < store.RatingVeryBad || in.Rating > store.RatingCorrect || in.Position < 0 {
		badRequest(w, "invalid rating")
		return
	}
	if err := a.store.RateSessionItem(r.Context(), currentUser(r).ID, id, in.Position, in.Rating); err != nil {
		fail(w, err, "rate session item")
		return
	}
	a.writeSession(w, r, id)
}

func (a *API) deleteSession(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	if err := a.store.DeleteStudySession(r.Context(), currentUser(r).ID, id); err != nil {
		fail(w, err, "delete session")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
