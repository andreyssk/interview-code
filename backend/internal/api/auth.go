package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"log"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/app/interview-prep/internal/store"
)

const (
	sessionCookie  = "session"
	sessionTTL     = 30 * 24 * time.Hour
	minPassword    = 8
	maxPasswordLen = 72 // bcrypt ignores everything after 72 bytes
	settingSignup  = "signup_enabled"
	maxFailures    = 5
	lockFor        = 15 * time.Minute
)

var usernameRe = regexp.MustCompile(`^[A-Za-z0-9_.-]{3,32}$`)

type ctxKey struct{}

// currentUser is the signed-in user of an authenticated request.
func currentUser(r *http.Request) store.User {
	u, _ := r.Context().Value(ctxKey{}).(store.User)
	return u
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func hashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}

// dummyHash makes a login for an unknown user cost the same as a real one.
var dummyHash, _ = hashPassword("not-a-real-password")

// publicRoutes need no session.
var publicRoutes = map[string]bool{
	"GET /api/health":       true,
	"GET /api/auth/config":  true,
	"POST /api/auth/login":  true,
	"POST /api/auth/signup": true,
}

// allowedWhileForced are the only routes a user with a temporary password may call.
var allowedWhileForced = map[string]bool{
	"GET /api/auth/me":        true,
	"POST /api/auth/logout":   true,
	"POST /api/auth/password": true,
}

// protect requires a session on every route except the public ones, restricts /api/admin to admins,
// and refuses cross-origin state-changing requests.
func (a *API) protect(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := r.Method + " " + r.URL.Path
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			if origin := r.Header.Get("Origin"); origin != "" && !sameHost(origin, r.Host) {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": "cross-origin request refused"})
				return
			}
		}
		if publicRoutes[route] {
			next.ServeHTTP(w, r)
			return
		}
		c, err := r.Cookie(sessionCookie)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "not signed in"})
			return
		}
		u, err := a.store.SessionUser(r.Context(), hashToken(c.Value))
		if err != nil {
			if !errors.Is(err, store.ErrNotFound) {
				log.Printf("session: %v", err)
			}
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "not signed in"})
			return
		}
		if u.MustChangePassword && !allowedWhileForced[route] {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "password change required"})
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/admin/") && u.Role != "admin" {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "admins only"})
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, u)))
	})
}

func sameHost(origin, host string) bool {
	i := strings.Index(origin, "://")
	return i >= 0 && origin[i+3:] == host
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// limiter locks a username+IP pair after repeated failed logins.
type limiter struct {
	mu sync.Mutex
	m  map[string]*failure
}

type failure struct {
	count int
	until time.Time
	last  time.Time
}

func newLimiter() *limiter { return &limiter{m: map[string]*failure{}} }

func (l *limiter) locked(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	f := l.m[key]
	return f != nil && time.Now().Before(f.until)
}

func (l *limiter) fail(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	for k, f := range l.m { // forget old entries
		if now.Sub(f.last) > lockFor && now.After(f.until) {
			delete(l.m, k)
		}
	}
	f := l.m[key]
	if f == nil {
		f = &failure{}
		l.m[key] = f
	}
	f.count++
	f.last = now
	if f.count >= maxFailures {
		f.until = now.Add(lockFor)
		f.count = 0
	}
}

func (l *limiter) reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.m, key)
}

func (a *API) startSession(w http.ResponseWriter, r *http.Request, userID int64) error {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return err
	}
	token := base64.RawURLEncoding.EncodeToString(buf)
	expires := time.Now().Add(sessionTTL)
	if err := a.store.CreateSession(r.Context(), hashToken(token), userID, expires); err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: token, Path: "/", Expires: expires,
		HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: isHTTPS(r),
	})
	return nil
}

func isHTTPS(r *http.Request) bool {
	return r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
}

type credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (a *API) signupEnabled(r *http.Request) bool {
	v, err := a.store.Setting(r.Context(), settingSignup, "false")
	return err == nil && v == "true"
}

func (a *API) authConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{"signupEnabled": a.signupEnabled(r)})
}

func (a *API) signup(w http.ResponseWriter, r *http.Request) {
	if !a.signupEnabled(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "sign-up is closed"})
		return
	}
	var in credentials
	if !decode(w, r, &in) {
		return
	}
	in.Username = strings.TrimSpace(in.Username)
	if !usernameRe.MatchString(in.Username) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "username: 3-32 characters, letters, digits, _ . -"})
		return
	}
	if msg := checkPassword(in.Password); msg != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
		return
	}
	hash, err := hashPassword(in.Password)
	if err != nil {
		fail(w, err, "hash password")
		return
	}
	u, err := a.store.CreateUser(r.Context(), in.Username, hash, "user", false)
	if errors.Is(err, store.ErrDuplicate) {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "this username is taken"})
		return
	}
	if err != nil {
		fail(w, err, "create user")
		return
	}
	if err := a.startSession(w, r, u.ID); err != nil {
		fail(w, err, "start session")
		return
	}
	writeJSON(w, http.StatusCreated, u)
}

func checkPassword(pw string) string {
	switch {
	case len(pw) < minPassword:
		return "password: at least 8 characters"
	case len(pw) > maxPasswordLen:
		return "password: at most 72 bytes"
	}
	return ""
}

func (a *API) login(w http.ResponseWriter, r *http.Request) {
	var in credentials
	if !decode(w, r, &in) {
		return
	}
	key := strings.ToLower(strings.TrimSpace(in.Username)) + "|" + clientIP(r)
	if a.limit.locked(key) {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "too many failed attempts, try again later"})
		return
	}
	u, hash, err := a.store.UserByUsername(r.Context(), strings.TrimSpace(in.Username))
	if errors.Is(err, store.ErrNotFound) {
		hash = dummyHash
	} else if err != nil {
		fail(w, err, "login")
		return
	}
	ok := bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Password)) == nil && err == nil
	if !ok {
		a.limit.fail(key)
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "wrong username or password"})
		return
	}
	a.limit.reset(key)
	if err := a.startSession(w, r, u.ID); err != nil {
		fail(w, err, "start session")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (a *API) logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(sessionCookie); err == nil {
		_ = a.store.DeleteSession(r.Context(), hashToken(c.Value))
	}
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteLaxMode})
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, currentUser(r))
}

// changePassword also ends the user's other sessions and clears a forced change.
func (a *API) changePassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Current string `json:"current"`
		New     string `json:"new"`
	}
	if !decode(w, r, &in) {
		return
	}
	u := currentUser(r)
	hash, err := a.store.PasswordHash(r.Context(), u.ID)
	if err != nil {
		fail(w, err, "password hash")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Current)) != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "current password is wrong"})
		return
	}
	if msg := checkPassword(in.New); msg != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
		return
	}
	if in.New == in.Current {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "choose a different password"})
		return
	}
	newHash, err := hashPassword(in.New)
	if err != nil {
		fail(w, err, "hash password")
		return
	}
	if err := a.store.SetPassword(r.Context(), u.ID, newHash, false); err != nil {
		fail(w, err, "set password")
		return
	}
	if c, err := r.Cookie(sessionCookie); err == nil {
		_ = a.store.DeleteUserSessions(r.Context(), u.ID, hashToken(c.Value))
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- admin

func (a *API) adminListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := a.store.ListUsers(r.Context())
	if err != nil {
		fail(w, err, "list users")
		return
	}
	writeJSON(w, http.StatusOK, users)
}

const tempAlphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func tempPassword() (string, error) {
	buf := make([]byte, 12)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	for i, b := range buf {
		buf[i] = tempAlphabet[int(b)%len(tempAlphabet)]
	}
	return string(buf), nil
}

// adminResetPassword sets a temporary password, shown once to the admin; the user must replace it at the next login.
func (a *API) adminResetPassword(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	pw, err := tempPassword()
	if err != nil {
		fail(w, err, "temp password")
		return
	}
	hash, err := hashPassword(pw)
	if err != nil {
		fail(w, err, "hash password")
		return
	}
	if err := a.store.SetPassword(r.Context(), id, hash, true); err != nil {
		fail(w, err, "reset password")
		return
	}
	_ = a.store.DeleteUserSessions(r.Context(), id, "")
	writeJSON(w, http.StatusOK, map[string]string{"password": pw})
}

func (a *API) adminGetSettings(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{"signupEnabled": a.signupEnabled(r)})
}

func (a *API) adminSetSettings(w http.ResponseWriter, r *http.Request) {
	var in struct {
		SignupEnabled bool `json:"signupEnabled"`
	}
	if !decode(w, r, &in) {
		return
	}
	v := "false"
	if in.SignupEnabled {
		v = "true"
	}
	if err := a.store.SetSetting(r.Context(), settingSignup, v); err != nil {
		fail(w, err, "set setting")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"signupEnabled": in.SignupEnabled})
}

// Bootstrap creates the first admin from the environment (once) and gives pre-account data to them.
func (a *API) Bootstrap(ctx context.Context, username, password string) error {
	_ = a.store.PurgeSessions(ctx)
	if username == "" || password == "" {
		log.Printf("ADMIN_USERNAME/ADMIN_PASSWORD not set: no admin account is created")
		return nil
	}
	u, _, err := a.store.UserByUsername(ctx, username)
	if errors.Is(err, store.ErrNotFound) {
		hash, herr := hashPassword(password)
		if herr != nil {
			return herr
		}
		if u, err = a.store.CreateUser(ctx, username, hash, "admin", false); err != nil {
			return err
		}
		log.Printf("created admin %q", username)
	} else if err != nil {
		return err
	} else if u.Role != "admin" {
		if err := a.store.SetRole(ctx, u.ID, "admin"); err != nil {
			return err
		}
	}
	if password == "admin" {
		log.Printf("WARNING: the admin password is the default; change it before exposing the app")
	}
	return a.store.ClaimOrphans(ctx, u.ID)
}
