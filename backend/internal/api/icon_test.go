package api

import "testing"

func TestIconTypeIco(t *testing.T) {
	ico := []byte{0, 0, 1, 0, 1, 0, 16, 16, 0, 0, 1, 0, 32, 0, 4, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0}
	if got := iconType(ico); got != "image/x-icon" {
		t.Fatalf("got %q", got)
	}
	if got := iconType([]byte("plain text")); got != "" {
		t.Fatalf("text accepted as %q", got)
	}
}
