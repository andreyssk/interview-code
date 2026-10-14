package api

import (
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/app/interview-prep/internal/store"
)

var (
	slugRe = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	// Names and types are not tied to one language: Go and Java identifiers (letters, digits, _ and $), and types such as
	// []int, map[string][]int, int[], List<Integer> or Map<String, List<Integer>>.
	identRe = regexp.MustCompile(`^[\p{L}_$][\p{L}\p{N}_$]*$`)
	typeRe  = regexp.MustCompile(`^[\p{L}\p{N}_$\[\]*.<>,? ]+$`)
	toneRe  = regexp.MustCompile(`^neon-[a-z]+$`)
)

const (
	maxSlugLen   = 100
	maxTitleLen  = 200
	maxTextLen   = 200_000
	maxSolution  = 100_000
	maxTestCases = 500
)

func checkSlug(what, s string) error {
	if len(s) == 0 || len(s) > maxSlugLen || !slugRe.MatchString(s) {
		return fmt.Errorf("%s slug: lowercase letters, digits and dashes only (max %d)", what, maxSlugLen)
	}
	return nil
}

func checkText(what, s string, max int) error {
	s = strings.TrimSpace(s)
	if s == "" {
		return fmt.Errorf("%s is required", what)
	}
	if utf8.RuneCountInString(s) > max {
		return fmt.Errorf("%s is too long (max %d characters)", what, max)
	}
	return nil
}

// validateBlocks checks rich text: an array of {p|h|pre|note: string} or {ul: [string]} objects.
func validateBlocks(what string, raw json.RawMessage, required bool) error {
	if len(raw) == 0 || string(raw) == "null" {
		if required {
			return fmt.Errorf("%s is required", what)
		}
		return nil
	}
	if len(raw) > maxTextLen {
		return fmt.Errorf("%s is too long", what)
	}
	var blocks []map[string]json.RawMessage
	if err := json.Unmarshal(raw, &blocks); err != nil {
		return fmt.Errorf("%s must be an array of blocks", what)
	}
	if required && len(blocks) == 0 {
		return fmt.Errorf("%s must have at least one block", what)
	}
	for i, b := range blocks {
		if len(b) != 1 {
			return fmt.Errorf("%s block %d: exactly one of p, h, pre, ul, note", what, i+1)
		}
		for k, v := range b {
			switch k {
			case "p", "h", "pre", "note":
				var s string
				if json.Unmarshal(v, &s) != nil {
					return fmt.Errorf("%s block %d (%s) must be a string", what, i+1, k)
				}
			case "ul":
				var items []string
				if json.Unmarshal(v, &items) != nil {
					return fmt.Errorf("%s block %d (ul) must be an array of strings", what, i+1)
				}
			default:
				return fmt.Errorf("%s block %d: unknown block type %q", what, i+1, k)
			}
		}
	}
	return nil
}

func validateTask(t *store.Task) error {
	if err := checkSlug("task", t.Slug); err != nil {
		return err
	}
	t.Title = strings.TrimSpace(t.Title)
	if err := checkText("title", t.Title, maxTitleLen); err != nil {
		return err
	}
	switch t.Difficulty {
	case "easy", "medium", "hard":
	default:
		return fmt.Errorf("difficulty must be easy, medium or hard")
	}
	if t.Number < 0 {
		return fmt.Errorf("number must be positive")
	}
	if err := validateBlocks("description", t.Description, true); err != nil {
		return err
	}
	if err := validateBlocks("solutionNotes", t.SolutionNotes, false); err != nil {
		return err
	}
	if err := validateBlocks("commonMistakes", t.CommonMistakes, false); err != nil {
		return err
	}
	if t.TimeLimitSec != nil && (*t.TimeLimitSec < 1 || *t.TimeLimitSec > maxRunSeconds) {
		return fmt.Errorf("timeLimitSec must be between 1 and %d seconds (or empty for the default of %d)", maxRunSeconds, defaultRunSeconds)
	}
	if t.Solution != nil && len(*t.Solution) > maxSolution {
		return fmt.Errorf("solution is too long")
	}
	if t.LeetcodeURL != nil && *t.LeetcodeURL != "" && !validURL(*t.LeetcodeURL) {
		return fmt.Errorf("leetcodeUrl must be an http(s) link")
	}
	if t.LeetcodeURL != nil && *t.LeetcodeURL == "" {
		t.LeetcodeURL = nil
	}
	if t.Solution != nil && strings.TrimSpace(*t.Solution) == "" {
		t.Solution = nil
	}
	if t.Template != nil && strings.TrimSpace(*t.Template) == "" {
		t.Template = nil
	}
	if t.Section != "" {
		if err := checkSlug("section", t.Section); err != nil {
			return err
		}
	}
	if t.Categories == nil {
		t.Categories = []string{}
	}
	if t.Companies == nil {
		t.Companies = []string{}
	}
	for _, c := range t.Categories {
		if err := checkSlug("category", c); err != nil {
			return err
		}
	}
	for _, c := range t.Companies {
		if err := checkSlug("company", c); err != nil {
			return err
		}
	}
	if len(t.Complexity) > 0 && string(t.Complexity) != "null" {
		var c struct{ Time, Space string }
		if json.Unmarshal(t.Complexity, &c) != nil || c.Time == "" || c.Space == "" {
			return fmt.Errorf("complexity must be {\"time\": \"…\", \"space\": \"…\"}")
		}
	}
	return validateSignatureAndTests(&t.Signature, &t.Tests)
}

// validateSignatureAndTests checks the function signature and the test cases.
//
// Both are optional: a task that is not "write a function" (a SQL question, a code review, a free-form exercise) has
// neither, stored as {} and []. Such a task is shown and its code can be run, but not submitted. Tests need a signature, which names the parameters.
func validateSignatureAndTests(sigRaw, testsRaw *json.RawMessage) error {
	if len(*testsRaw) == 0 || string(*testsRaw) == "null" {
		*testsRaw = json.RawMessage("[]")
	}
	var probe struct {
		Name    string            `json:"name"`
		Params  []json.RawMessage `json:"params"`
		Returns string            `json:"returns"`
		Mutates string            `json:"mutates"`
		Compare string            `json:"compare"`
	}
	if len(*sigRaw) == 0 || string(*sigRaw) == "null" {
		*sigRaw = json.RawMessage("{}")
	}
	if err := json.Unmarshal(*sigRaw, &probe); err != nil {
		return fmt.Errorf("signature must be an object: {name, params:[{name,type}], returns?, mutates?, compare?}")
	}
	if probe.Name == "" && len(probe.Params) == 0 && probe.Returns == "" && probe.Mutates == "" && probe.Compare == "" {
		*sigRaw = json.RawMessage("{}")
		var tests []json.RawMessage
		if json.Unmarshal(*testsRaw, &tests) != nil {
			return fmt.Errorf("tests must be an array of {name?, input, expected}")
		}
		if len(tests) > 0 {
			return fmt.Errorf("tests need a signature: add signature.name and params so the test inputs have parameters to fill")
		}
		return nil
	}
	return checkSignatureAndTests(*sigRaw, *testsRaw)
}

func checkSignatureAndTests(sigRaw, testsRaw json.RawMessage) error {
	var sig struct {
		Name    string                        `json:"name"`
		Params  []struct{ Name, Type string } `json:"params"`
		Returns string                        `json:"returns"`
		Mutates string                        `json:"mutates"`
		Compare string                        `json:"compare"`
	}
	if json.Unmarshal(sigRaw, &sig) != nil || len(sigRaw) == 0 {
		return fmt.Errorf("signature is required: {name, params:[{name,type}], returns?, mutates?, compare?}")
	}
	if !identRe.MatchString(sig.Name) {
		return fmt.Errorf("signature.name %q must be an identifier: letters, digits, _ or $, not starting with a digit", sig.Name)
	}
	names := map[string]bool{}
	for _, p := range sig.Params {
		if !identRe.MatchString(p.Name) || names[p.Name] {
			return fmt.Errorf("signature.params: %q is not a unique identifier (letters, digits, _ or $)", p.Name)
		}
		if p.Type == "" || len(p.Type) > 100 || !typeRe.MatchString(p.Type) {
			return fmt.Errorf("signature.params: invalid type %q", p.Type)
		}
		names[p.Name] = true
	}
	if sig.Returns != "" && (len(sig.Returns) > 100 || !typeRe.MatchString(sig.Returns)) {
		return fmt.Errorf("signature.returns: invalid type %q", sig.Returns)
	}
	if sig.Mutates != "" && !names[sig.Mutates] {
		return fmt.Errorf("signature.mutates must name one of the params")
	}
	if sig.Returns == "" && sig.Mutates == "" {
		return fmt.Errorf("signature needs either returns or mutates")
	}
	if sig.Compare != "" && sig.Compare != "exact" && sig.Compare != "unordered" {
		return fmt.Errorf("signature.compare must be exact or unordered")
	}

	var tests []map[string]json.RawMessage
	if json.Unmarshal(testsRaw, &tests) != nil {
		return fmt.Errorf("tests must be an array of {name?, input, expected}")
	}
	// A task may have no tests yet; its code can be run but not submitted until it has some.
	if len(tests) > maxTestCases {
		return fmt.Errorf("tests: at most %d cases", maxTestCases)
	}
	for i, tc := range tests {
		exp, ok := tc["expected"]
		if !ok || len(exp) == 0 {
			return fmt.Errorf("test %d: expected is missing", i+1)
		}
		var in map[string]json.RawMessage
		if json.Unmarshal(tc["input"], &in) != nil {
			return fmt.Errorf("test %d: input must be an object keyed by parameter name", i+1)
		}
		for n := range names {
			if _, ok := in[n]; !ok {
				return fmt.Errorf("test %d: input is missing %q", i+1, n)
			}
		}
		for n := range in {
			if !names[n] {
				return fmt.Errorf("test %d: input has unknown parameter %q", i+1, n)
			}
		}
	}
	return nil
}

func validURL(s string) bool {
	u, err := url.Parse(s)
	return err == nil && (u.Scheme == "http" || u.Scheme == "https") && u.Host != ""
}

func validateArticle(a *store.Article) error {
	if err := checkSlug("article", a.Slug); err != nil {
		return err
	}
	a.Title = strings.TrimSpace(a.Title)
	a.Summary = strings.TrimSpace(a.Summary)
	if err := checkText("title", a.Title, maxTitleLen); err != nil {
		return err
	}
	if utf8.RuneCountInString(a.Summary) > 500 {
		return fmt.Errorf("summary is too long (max 500 characters)")
	}
	if err := validateBlocks("content", a.Content, true); err != nil {
		return err
	}
	if a.SourceName != nil && strings.TrimSpace(*a.SourceName) == "" {
		a.SourceName = nil
	}
	if a.SourceURL != nil && strings.TrimSpace(*a.SourceURL) == "" {
		a.SourceURL = nil
	}
	if a.SourceURL != nil && !validURL(*a.SourceURL) {
		return fmt.Errorf("sourceUrl must be an http(s) link")
	}
	if a.Section != "" {
		if err := checkSlug("section", a.Section); err != nil {
			return err
		}
	}
	if a.Category != nil && *a.Category == "" {
		a.Category = nil
	}
	if a.Category != nil {
		if err := checkSlug("category", *a.Category); err != nil {
			return err
		}
	}
	for _, c := range a.Categories {
		if err := checkSlug("category", c); err != nil {
			return err
		}
	}
	if a.Categories == nil {
		a.Categories = []string{}
	}
	if a.Tasks == nil {
		a.Tasks = []string{}
	}
	return nil
}

func validateQuestion(q *store.Question) error {
	q.Title = strings.TrimSpace(q.Title)
	if err := checkText("title", q.Title, maxTitleLen); err != nil {
		return err
	}
	if err := validateBlocks("answer", q.Answer, true); err != nil {
		return err
	}
	if q.Category != nil && *q.Category == "" {
		q.Category = nil
	}
	if q.Category != nil {
		if err := checkSlug("category", *q.Category); err != nil {
			return err
		}
	}
	if q.Companies == nil {
		q.Companies = []string{}
	}
	for _, c := range q.Companies {
		if err := checkSlug("company", c); err != nil {
			return err
		}
	}
	return nil
}
