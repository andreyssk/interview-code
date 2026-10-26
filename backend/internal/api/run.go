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
	"strings"
	"time"

	"github.com/app/interview-prep/internal/store"
)

const (
	buildTimeout = 30 * time.Second
	// How long the user's program may run when its task sets no limit of its own, and the most any task may allow.
	defaultRunSeconds = 5
	maxRunSeconds     = 30
	maxOutput         = 64 << 10
	maxBody           = 1 << 20
	maxSlug           = 100
)

type runRequest struct {
	TaskSlug string `json:"taskSlug"` // when set, the attempt is saved under this task
	Code     string `json:"code"`     // user's solution (package main)
	Harness  string `json:"harness"`  // optional extra file with main() that exercises the solution
	// TimeLimitSec is honored only for admins running without a task (verifying a solution in the task form).
	TimeLimitSec int `json:"timeLimitSec"`
	// DryRun runs the code and returns the output without recording an attempt (the editor's Run button; Submit records).
	DryRun bool `json:"dryRun"`
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
	// TimeLimitSec is the run limit that applied, so a timeout can say how long the program was allowed.
	TimeLimitSec int `json:"timeLimitSec"`
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
	mux.HandleFunc("GET /api/recent-tasks", a.listRecentTasks)
	mux.HandleFunc("POST /api/recent-tasks", a.recordRecentTask)
	mux.HandleFunc("DELETE /api/recent-tasks", a.clearRecentTasks)
	mux.HandleFunc("GET /api/sessions", a.listSessions)
	mux.HandleFunc("POST /api/sessions", a.startStudySession)
	mux.HandleFunc("GET /api/sessions/{id}", a.getSession)
	mux.HandleFunc("PUT /api/sessions/{id}/rating", a.rateSessionItem)
	mux.HandleFunc("DELETE /api/sessions/{id}", a.deleteSession)
	mux.HandleFunc("POST /api/run", a.run)
	mux.HandleFunc("POST /api/tasks/{slug}/saved", a.saveSolution)
	mux.HandleFunc("GET /api/content", a.content)
	mux.HandleFunc("GET /api/sources/{slug}/icon", a.sourceIcon)
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

	// The task decides how long the program may run, and whether a submission is possible at all.
	limitSec := defaultRunSeconds
	if req.TaskSlug != "" {
		info, found, err := a.store.TaskRunInfo(r.Context(), req.TaskSlug)
		if err != nil {
			fail(w, err, "task run info")
			return
		}
		if found && info.TimeLimitSec != nil {
			limitSec = *info.TimeLimitSec
		}
		// A task without tests cannot be submitted: there is nothing to check the code against. A dry run (the editor's
		// Run) just executes the code and is always fine.
		if found && info.TestCount == 0 && !req.DryRun {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "this task has no tests yet, so it cannot be submitted (running the code still works)"})
			return
		}
	} else if req.TimeLimitSec > 0 && currentUser(r).Role == "admin" {
		limitSec = req.TimeLimitSec // an admin verifying a reference solution against the limit being set in the task form
	}
	limitSec = max(1, min(limitSec, maxRunSeconds))

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
	resp := runResponse{Stage: "build", TimeLimitSec: limitSec}
	bin := filepath.Join(dir, "prog")

	out, code, timedOut := execute(r.Context(), buildTimeout, dir, "go", "build", "-o", bin, ".")
	if code != 0 || timedOut {
		resp.Output, resp.ExitCode, resp.TimedOut = out, code, timedOut
	} else {
		resp.Stage = "run"
		resp.Output, resp.ExitCode, resp.TimedOut = execute(r.Context(), time.Duration(limitSec)*time.Second, dir, bin)
		resp.OK = resp.ExitCode == 0 && !resp.TimedOut
	}
	resp.DurationMs = time.Since(start).Milliseconds()
	resp.Status = statusOf(resp)

	if req.TaskSlug != "" && !req.DryRun {
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

// saveSolution stores the user's code as a "saved" attempt without running it: for tasks that have no tests yet and for
// languages that cannot be run. It is not a pass or a failure and does not touch the timer.
func (a *API) saveSolution(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if slug == "" || len(slug) > maxSlug {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid slug"})
		return
	}
	var in struct {
		Code     string `json:"code"`
		Language string `json:"language"`
	}
	if !decode(w, r, &in) {
		return
	}
	if strings.TrimSpace(in.Code) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "code is required"})
		return
	}
	if in.Language == "" {
		in.Language = "go"
	}
	if in.Language != "go" && in.Language != "java" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "language must be go or java"})
		return
	}
	saved, err := a.store.AddAttempt(r.Context(), store.Attempt{
		UserID: currentUser(r).ID, TaskSlug: slug, Code: in.Code, Status: "saved", Language: in.Language,
	})
	if err != nil {
		fail(w, err, "save solution")
		return
	}
	writeJSON(w, http.StatusOK, saved)
}
