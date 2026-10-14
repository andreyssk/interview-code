package api

import "net/http"

func (a *API) listRecentTasks(w http.ResponseWriter, r *http.Request) {
	slugs, err := a.store.RecentTasks(r.Context(), currentUser(r).ID)
	if err != nil {
		fail(w, err, "recent tasks")
		return
	}
	writeJSON(w, http.StatusOK, slugs)
}

// recordRecentTask notes that the user opened a task.
func (a *API) recordRecentTask(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Slug string `json:"slug"`
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Slug == "" || len(in.Slug) > maxSlug {
		badRequest(w, "invalid slug")
		return
	}
	if err := a.store.RecordRecentTask(r.Context(), currentUser(r).ID, in.Slug); err != nil {
		fail(w, err, "record recent task")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) clearRecentTasks(w http.ResponseWriter, r *http.Request) {
	if err := a.store.ClearRecentTasks(r.Context(), currentUser(r).ID); err != nil {
		fail(w, err, "clear recent tasks")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
