package store

import (
	"math"
	"math/rand/v2"
	"sort"
	"time"
)

// Ratings a user gives an item after seeing the answer.
const (
	RatingVeryBad = 0
	RatingBad     = 1
	RatingAlmost  = 2
	RatingCorrect = 3
)

// Base SRS weights (see docs/study-sessions.md): the worse the last rating, the likelier an item is picked.
const (
	weightUnseen  = 6.0
	weightVeryBad = 10.0
	weightBad     = 7.0
	weightAlmost  = 3.0
	weightCorrect = 1.0

	// A rated item gains up to +300% weight the longer it has not been seen.
	staleDays   = 30.0
	staleFactor = 3.0
)

// srsWeight is how likely an item is to be picked. last is nil for an item the user never rated.
func srsWeight(last *int, seenAt time.Time, now time.Time) float64 {
	if last == nil {
		return weightUnseen
	}
	var base float64
	switch *last {
	case RatingVeryBad:
		base = weightVeryBad
	case RatingBad:
		base = weightBad
	case RatingAlmost:
		base = weightAlmost
	default:
		base = weightCorrect
	}
	days := math.Min(math.Max(now.Sub(seenAt).Hours()/24, 0), staleDays)
	return base * (1 + staleFactor*days/staleDays)
}

// candidate is an item that may go into a session.
type candidate struct {
	ID     int64
	Title  string
	Last   *int // latest rating, nil if never rated
	SeenAt time.Time
}

// pickCandidates chooses up to n candidates and returns them in random order. In srs mode items are drawn without replacement
// with probability proportional to their weight (Efraimidis-Spirakis: key = u^(1/w), take the n largest keys).
func pickCandidates(cands []candidate, n int, srs bool, now time.Time, rng *rand.Rand) []candidate {
	if n > len(cands) {
		n = len(cands)
	}
	if n <= 0 {
		return nil
	}
	type keyed struct {
		c   candidate
		key float64
	}
	ks := make([]keyed, len(cands))
	for i, c := range cands {
		key := rng.Float64()
		if srs {
			key = math.Pow(rng.Float64(), 1/srsWeight(c.Last, c.SeenAt, now))
		}
		ks[i] = keyed{c, key}
	}
	sort.Slice(ks, func(i, j int) bool { return ks[i].key > ks[j].key })
	out := make([]candidate, n)
	for i := range out {
		out[i] = ks[i].c
	}
	rng.Shuffle(n, func(i, j int) { out[i], out[j] = out[j], out[i] })
	return out
}
