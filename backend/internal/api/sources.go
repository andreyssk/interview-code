package api

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/app/interview-prep/internal/store"
)

func (a *API) adminPutSource(w http.ResponseWriter, r *http.Request) {
	slug, ok := slugOf(w, r)
	if !ok {
		return
	}
	var in store.Source
	if !decode(w, r, &in) {
		return
	}
	in.Slug, in.Name, in.IconURL = slug, strings.TrimSpace(in.Name), nil
	if err := checkText("name", in.Name, 60); err != nil {
		badRequest(w, err.Error())
		return
	}
	if in.Link != nil {
		l := strings.TrimSpace(*in.Link)
		in.Link = nil
		if l != "" {
			u, err := url.Parse(l)
			if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || len(l) > 500 {
				badRequest(w, "link must be an http(s) URL")
				return
			}
			in.Link = &l
		}
	}
	if err := a.store.SaveSource(r.Context(), in); err != nil {
		saveFail(w, err, "save source")
		return
	}
	writeJSON(w, http.StatusOK, in)
}

// iconType returns the media type of an allowed image, or "".
func iconType(data []byte) string {
	switch t := http.DetectContentType(data); t {
	case "image/png", "image/jpeg", "image/gif", "image/webp":
		return t
	case "image/x-icon":
		return "image/x-icon"
	}
	head := bytes.ToLower(data[:min(len(data), 512)])
	if bytes.Contains(head, []byte("<svg")) {
		return "image/svg+xml"
	}
	return ""
}

// adminPutSourceIcon takes the raw image as the request body (png, jpeg, gif, webp, ico or svg, up to 100 KB).
func (a *API) adminPutSourceIcon(w http.ResponseWriter, r *http.Request) {
	slug, ok := slugOf(w, r)
	if !ok {
		return
	}
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, store.MaxIconBytes+1))
	if err != nil || len(data) > store.MaxIconBytes {
		badRequest(w, "icon is too large (max 100 KB)")
		return
	}
	mt := iconType(data)
	if mt == "" {
		badRequest(w, "icon must be a PNG, JPEG, GIF, WebP, ICO or SVG image")
		return
	}
	if err := a.store.SetSourceIcon(r.Context(), slug, mt, data); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "no such source"})
			return
		}
		fail(w, err, "save source icon")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) adminDeleteSourceIcon(w http.ResponseWriter, r *http.Request) {
	slug, ok := slugOf(w, r)
	if !ok {
		return
	}
	if err := a.store.ClearSourceIcon(r.Context(), slug); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "no such source"})
			return
		}
		fail(w, err, "delete source icon")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// sourceIcon serves the image. The URL carries a version, so browsers may cache it for good.
func (a *API) sourceIcon(w http.ResponseWriter, r *http.Request) {
	slug, ok := slugOf(w, r)
	if !ok {
		return
	}
	mt, data, err := a.store.SourceIcon(r.Context(), slug)
	if errors.Is(err, store.ErrNotFound) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		fail(w, err, "source icon")
		return
	}
	h := w.Header()
	h.Set("Content-Type", mt)
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox") // an SVG must not run anything
	h.Set("Cache-Control", "private, max-age=31536000, immutable")
	w.Write(data)
}
