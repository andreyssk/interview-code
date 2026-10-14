package api

import (
	"log"
	"net/http"
)

// content serves sections, categories, companies, tasks and articles in one response.
func (a *API) content(w http.ResponseWriter, r *http.Request) {
	c, err := a.store.Content(r.Context())
	if err != nil {
		log.Printf("content: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	c.DefaultTimeLimitSec = defaultRunSeconds
	writeJSON(w, http.StatusOK, c)
}
