package api

import (
	"encoding/json"
	"strings"
	"testing"
)

func sigTests(name, ptype, returns string) (json.RawMessage, json.RawMessage) {
	sig := `{"name":"` + name + `","params":[{"name":"nums","type":"` + ptype + `"}],"returns":"` + returns + `"}`
	return json.RawMessage(sig), json.RawMessage(`[{"input":{"nums":[1]},"expected":1}]`)
}

func TestSignatureAcceptsGoAndJava(t *testing.T) {
	cases := []struct{ name, ptype, returns string }{
		{"twoSum", "[]int", "[]int"},                       // Go
		{"groupAnagrams", "[]string", "[][]string"},        // Go
		{"count", "map[string][]int", "int"},               // Go
		{"twoSum", "int[]", "int[]"},                       // Java
		{"maxDepth", "List<Integer>", "int"},               // Java generics
		{"merge", "Map<String, List<Integer>>", "boolean"}, // Java nested generics
		{"solve$1", "String[]", "String"},                  // Java: $ in a name
		{"найти", "[]int", "int"},                          // unicode letters
	}
	for _, c := range cases {
		sig, tests := sigTests(c.name, c.ptype, c.returns)
		if err := checkSignatureAndTests(sig, tests); err != nil {
			t.Errorf("%s(%s) %s: unexpected error: %v", c.name, c.ptype, c.returns, err)
		}
	}
}

func TestSignatureRejectsGarbage(t *testing.T) {
	cases := []struct{ name, ptype, returns, want string }{
		{"", "[]int", "int", "signature.name"},
		{"1abc", "[]int", "int", "signature.name"},
		{"two sum", "[]int", "int", "signature.name"},
		{"a;b", "[]int", "int", "signature.name"},
		{"f", "int;x", "int", "invalid type"},
		{"f", "[]int", "int{}", "invalid type"},
	}
	for _, c := range cases {
		sig, tests := sigTests(c.name, c.ptype, c.returns)
		err := checkSignatureAndTests(sig, tests)
		if err == nil || !strings.Contains(err.Error(), c.want) {
			t.Errorf("%q/%q/%q: want error containing %q, got %v", c.name, c.ptype, c.returns, c.want, err)
		}
	}
}

func TestErrorShowsOffendingName(t *testing.T) {
	sig, tests := sigTests("Solution.twoSum", "[]int", "int")
	err := checkSignatureAndTests(sig, tests)
	if err == nil || !strings.Contains(err.Error(), "Solution.twoSum") {
		t.Fatalf("error should quote the bad name, got %v", err)
	}
}

func TestSignatureAndTestsAreOptional(t *testing.T) {
	for _, sig := range []string{"", "null", "{}", `{"name":"","params":[]}`} {
		raw, tests := json.RawMessage(sig), json.RawMessage(nil)
		if err := validateSignatureAndTests(&raw, &tests); err != nil {
			t.Errorf("signature %q without tests: unexpected error %v", sig, err)
		}
		if string(raw) != "{}" || string(tests) != "[]" {
			t.Errorf("signature %q: stored as %s / %s, want {} / []", sig, raw, tests)
		}
	}
}

func TestTestsNeedASignature(t *testing.T) {
	sig, tests := json.RawMessage(`{}`), json.RawMessage(`[{"input":{},"expected":1}]`)
	if err := validateSignatureAndTests(&sig, &tests); err == nil || !strings.Contains(err.Error(), "need a signature") {
		t.Fatalf("want 'need a signature', got %v", err)
	}
}

func TestPartialSignatureStillRejected(t *testing.T) {
	// parameters without a name is a mistake, not "no signature"
	sig, tests := json.RawMessage(`{"name":"","params":[{"name":"s","type":"string"}],"returns":"int"}`), json.RawMessage(`[]`)
	if err := validateSignatureAndTests(&sig, &tests); err == nil || !strings.Contains(err.Error(), "signature.name") {
		t.Fatalf("want a signature.name error, got %v", err)
	}
}
