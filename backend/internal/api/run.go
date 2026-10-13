// Package api runs Go code in a throwaway temp directory and records attempts per task.
package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"

	"github.com/app/interview-prep/internal/store"
)

const (
	buildTimeout = 30 * time.Second
	runTimeout   = 5 * time.Second
	maxOutput    = 64 << 10
	maxBody      = 1 << 20
	maxSlug      = 100
)

type runRequest struct {
	TaskSlug string `json:"taskSlug"` // when set, the attempt is saved under this task
	Code     string `json:"code"`     // user's solution (package main)
	Harness  string `json:"harness"`  // optional extra file with main() that exercises the solution
	// Stopwatch reading at submit time; stored only when the attempt passes.
	SolveTimeMs *int64 `json:"solveTimeMs"`
}

type runResponse struct {
	AttemptID  int64  `json:"attemptId,omitempty"`
	Status     string `json:"status"` // passed | failed | compile | timeout
	OK         bool   `json:"ok"`
	Stage      string `json:"stage"` // "build" or "run"
	Output     string `json:"output"`
	ExitCode   int    `json:"exitCode"`
	TimedOut   bool   `json:"timedOut"`
	DurationMs int64  `json:"durationMs"`
}

// limitedBuffer keeps at most maxOutput bytes and drops the rest.
type limitedBuffer struct{ bytes.Buffer }

func (b *limitedBuffer) Write(p []byte) (int, error) {
	if room := maxOutput - b.Len(); room > 0 {
		if len(p) > room {
			b.Buffer.Write(p[:room])
		} else {
			b.Buffer.Write(p)
		}
	}
	return len(p), nil
}

type API struct {
	store *store.Store
	limit *limiter
}

func New(s *store.Store) *API { return &API{store: s, limit: newLimiter()} }

func (a *API) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/auth/config", a.authConfig)
	mux.HandleFunc("POST /api/auth/signup", a.signup)
	mux.HandleFunc("POST /api/auth/login", a.login)
	mux.HandleFunc("POST /api/auth/logout", a.logout)
	mux.HandleFunc("GET /api/auth/me", a.me)
	mux.HandleFunc("POST /api/auth/password", a.changePassword)
	mux.HandleFunc("GET /api/admin/users", a.adminListUsers)
	mux.HandleFunc("POST /api/admin/users/{id}/reset-password", a.adminResetPassword)
	mux.HandleFunc("GET /api/admin/settings", a.adminGetSettings)
	mux.HandleFunc("PUT /api/admin/settings", a.adminSetSettings)
	mux.HandleFunc("POST /api/run", a.run)
	mux.HandleFunc("GET /api/content", a.content)
	mux.HandleFunc("GET /api/stats", a.stats)
	mux.HandleFunc("GET /api/tasks/{slug}/attempts", a.attempts)
	mux.HandleFunc("DELETE /api/attempts/{id}", a.deleteAttempt)
	mux.HandleFunc("DELETE /api/attempts/{id}/solve-time", a.clearSolveTime)
	mux.HandleFunc("GET /api/mistake-types", a.listMistakeTypes)
	mux.HandleFunc("POST /api/mistake-types", a.createMistakeType)
	mux.HandleFunc("GET /api/mistake-types/{id}", a.getMistakeType)
	mux.HandleFunc("PATCH /api/mistake-types/{id}", a.updateMistakeType)
	mux.HandleFunc("DELETE /api/mistake-types/{id}", a.deleteMistakeType)
	mux.HandleFunc("POST /api/mistakes", a.addMistake)
	mux.HandleFunc("PATCH /api/mistakes/{id}", a.moveMistake)
	mux.HandleFunc("DELETE /api/mistakes/{id}", a.deleteMistake)
	a.registerAdminContent(mux)
	return a.protect(mux)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func (a *API) run(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBody)
	var req runRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Code == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "code is required"})
		return
	}
	if len(req.TaskSlug) > maxSlug {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid taskSlug"})
		return
	}

	dir, err := os.MkdirTemp("", "gorun-*")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer os.RemoveAll(dir)

	files := map[string]string{
		"go.mod":      "module sandbox\n\ngo 1.22\n",
		"solution.go": req.Code,
	}
	if req.Harness != "" {
		files["harness.go"] = req.Harness
	}
	for name, content := range files {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o600); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
	}

	start := time.Now()
	resp := runResponse{Stage: "build"}
	bin := filepath.Join(dir, "prog")

	out, code, timedOut := execute(r.Context(), buildTimeout, dir, "go", "build", "-o", bin, ".")
	if code != 0 || timedOut {
		resp.Output, resp.ExitCode, resp.TimedOut = out, code, timedOut
	} else {
		resp.Stage = "run"
		resp.Output, resp.ExitCode, resp.TimedOut = execute(r.Context(), runTimeout, dir, bin)
		resp.OK = resp.ExitCode == 0 && !resp.TimedOut
	}
	resp.DurationMs = time.Since(start).Milliseconds()
	resp.Status = statusOf(resp)

	if req.TaskSlug != "" {
		var solveTime *int64
		if resp.Status == "passed" && req.SolveTimeMs != nil && *req.SolveTimeMs >= 0 {
			solveTime = req.SolveTimeMs
		}
		saved, err := a.store.AddAttempt(r.Context(), store.Attempt{
			UserID:      currentUser(r).ID,
			SolveTimeMs: solveTime,
			TaskSlug:    req.TaskSlug,
			Code:        req.Code,
			Status:      resp.Status,
			Output:      resp.Output,
			DurationMs:  int(resp.DurationMs),
		})
		if err != nil {
			log.Printf("save attempt: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "could not save attempt"})
			return
		}
		resp.AttemptID = saved.ID
	}
	writeJSON(w, http.StatusOK, resp)
}

func statusOf(r runResponse) string {
	switch {
	case r.OK:
		return "passed"
	case r.TimedOut:
		return "timeout"
	case r.Stage == "build":
		return "compile"
	default:
		return "failed"
	}
}

func (a *API) stats(w http.ResponseWriter, r *http.Request) {
	stats, err := a.store.Stats(r.Context(), currentUser(r).ID)
	if err != nil {
		log.Printf("stats: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (a *API) attempts(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if slug == "" || len(slug) > maxSlug {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid slug"})
		return
	}
	limit := 50
	if n, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && n > 0 && n <= 200 {
		limit = n
	}
	list, err := a.store.Attempts(r.Context(), currentUser(r).ID, slug, limit)
	if err != nil {
		log.Printf("attempts: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) deleteAttempt(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	switch err := a.store.DeleteAttempt(r.Context(), currentUser(r).ID, id); {
	case errors.Is(err, store.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
	case err != nil:
		log.Printf("delete attempt: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

func (a *API) clearSolveTime(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	switch err := a.store.ClearSolveTime(r.Context(), currentUser(r).ID, id); {
	case errors.Is(err, store.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
	case err != nil:
		log.Printf("clear solve time: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

// execute runs a command with a timeout and returns combined output, exit code and whether it timed out.
func execute(parent context.Context, timeout time.Duration, dir, name string, args ...string) (string, int, bool) {
	ctx, cancel := context.WithTimeout(parent, timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	cmd.WaitDelay = time.Second
	var buf limitedBuffer
	cmd.Stdout, cmd.Stderr = &buf, &buf
	err := cmd.Run()
	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return buf.String(), -1, true
	}
	if err != nil {
		var ee *exec.ExitError
		if errors.As(err, &ee) {
			return buf.String(), ee.ExitCode(), false
		}
		return err.Error(), -1, false
	}
	return buf.String(), 0, false
}
