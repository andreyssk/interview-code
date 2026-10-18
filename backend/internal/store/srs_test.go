package store

import (
	"math/rand/v2"
	"testing"
	"time"
)

func ptr(i int) *int { return &i }

func TestSRSWeightOrdering(t *testing.T) {
	now := time.Now()
	w := func(last *int, ago time.Duration) float64 { return srsWeight(last, now.Add(-ago), now) }
	day := 24 * time.Hour
	if !(w(ptr(RatingVeryBad), day) > w(ptr(RatingBad), day) && w(ptr(RatingBad), day) > w(ptr(RatingAlmost), day) && w(ptr(RatingAlmost), day) > w(ptr(RatingCorrect), day)) {
		t.Fatal("worse ratings must weigh more")
	}
	if w(ptr(RatingCorrect), 60*day) <= w(ptr(RatingCorrect), day) {
		t.Fatal("older ratings must weigh more")
	}
	if got, want := w(ptr(RatingCorrect), 365*day), weightCorrect*(1+staleFactor); got != want {
		t.Fatalf("staleness must cap: got %v want %v", got, want)
	}
	if srsWeight(nil, time.Time{}, now) != weightUnseen {
		t.Fatal("unseen weight")
	}
}

func TestPickCandidatesClampsAndIsUnique(t *testing.T) {
	rng := rand.New(rand.NewPCG(1, 2))
	cands := []candidate{{ID: 1}, {ID: 2}, {ID: 3}}
	for _, srs := range []bool{false, true} {
		got := pickCandidates(cands, 10, srs, time.Now(), rng)
		if len(got) != 3 {
			t.Fatalf("srs=%v: want all 3 items, got %d", srs, len(got))
		}
		seen := map[int64]bool{}
		for _, c := range got {
			seen[c.ID] = true
		}
		if len(seen) != 3 {
			t.Fatalf("srs=%v: duplicates in %v", srs, got)
		}
	}
	if pickCandidates(nil, 5, true, time.Now(), rng) != nil {
		t.Fatal("empty pool must give nothing")
	}
}

func TestPickCandidatesPrefersWeakItems(t *testing.T) {
	rng := rand.New(rand.NewPCG(3, 4))
	now := time.Now()
	cands := []candidate{{ID: 1, Last: ptr(RatingCorrect), SeenAt: now}, {ID: 2, Last: ptr(RatingVeryBad), SeenAt: now}}
	wins := 0
	for range 2000 {
		if pickCandidates(cands, 1, true, now, rng)[0].ID == 2 {
			wins++
		}
	}
	// expected 10/11 ≈ 91%
	if wins < 1700 {
		t.Fatalf("very bad item picked only %d/2000 times", wins)
	}
}
