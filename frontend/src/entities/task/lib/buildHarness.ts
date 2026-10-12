import type { Signature, TestCase } from '../model/types'

const exported = (name: string) => name[0].toUpperCase() + name.slice(1)

// JSON has no runes, so []rune is written in tests as an array of one-character strings.
const RUNES = '[]rune'
const goType = (type: string) => (type === RUNES ? 'harnessRunes' : type)

const RUNES_HELPER = `
// harnessRunes reads and writes []rune as a JSON array of one-character strings.
type harnessRunes []rune

func (r *harnessRunes) UnmarshalJSON(b []byte) error {
	var items []string
	if err := json.Unmarshal(b, &items); err != nil {
		return err
	}
	out := make([]rune, 0, len(items))
	for _, item := range items {
		rs := []rune(item)
		if len(rs) != 1 {
			return fmt.Errorf("%q is not a single character", item)
		}
		out = append(out, rs[0])
	}
	*r = out
	return nil
}

func (r harnessRunes) MarshalJSON() ([]byte, error) {
	items := make([]string, len(r))
	for i, c := range r {
		items[i] = string(c)
	}
	return json.Marshal(items)
}
`

const SAME_EXACT = `
// harnessSame compares via JSON; nil and empty slices/maps count as equal.
func harnessSame(a, b any) bool {
	ja, _ := json.Marshal(a)
	jb, _ := json.Marshal(b)
	if string(ja) == string(jb) {
		return true
	}
	empty := func(s string) bool { return s == "null" || s == "[]" || s == "{}" }
	return empty(string(ja)) && empty(string(jb))
}
`

// For answers that may be returned "in any order": every array is sorted (recursively) before comparing.
const SAME_UNORDERED = `
// harnessNormalize sorts every array, at every depth, so the order of elements does not matter.
func harnessNormalize(v any) any {
	switch x := v.(type) {
	case []any:
		for i := range x {
			x[i] = harnessNormalize(x[i])
		}
		sort.Slice(x, func(i, j int) bool {
			a, _ := json.Marshal(x[i])
			b, _ := json.Marshal(x[j])
			return string(a) < string(b)
		})
		return x
	case map[string]any:
		for k := range x {
			x[k] = harnessNormalize(x[k])
		}
		return x
	}
	return v
}

// harnessSame compares via JSON ignoring the order of elements; nil and empty slices/maps count as equal.
func harnessSame(a, b any) bool {
	canon := func(v any) string {
		raw, _ := json.Marshal(v)
		var decoded any
		_ = json.Unmarshal(raw, &decoded)
		out, _ := json.Marshal(harnessNormalize(decoded))
		return string(out)
	}
	ja, jb := canon(a), canon(b)
	if ja == jb {
		return true
	}
	empty := func(s string) bool { return s == "null" || s == "[]" || s == "{}" }
	return empty(ja) && empty(jb)
}
`

/**
 * Generates the Go test program from a signature and its JSON test cases.
 * Everything is prefixed with "harness" so it can't clash with names in the user's solution.
 */
export function buildHarness(sig: Signature, tests: TestCase[]): string {
  const json = JSON.stringify(tests)
  if (json.includes('`')) throw new Error(`Test data for ${sig.name} must not contain backticks`)

  const mutated = sig.mutates ? sig.params.find((p) => p.name === sig.mutates) : undefined
  if (sig.mutates && !mutated) throw new Error(`${sig.name}: "mutates" must name a parameter`)
  const expectedType = mutated ? mutated.type : sig.returns
  if (!expectedType) throw new Error(`${sig.name}: set "returns" or "mutates"`)

  const fields = sig.params.map((p) => `\t${exported(p.name)} ${goType(p.type)} \`json:"${p.name}"\``).join('\n')
  const call = `${sig.name}(${sig.params.map((p) => `c.Input.${exported(p.name)}`).join(', ')})`
  const usesRunes = sig.params.some((p) => p.type === RUNES) || expectedType === RUNES
  const result = !mutated && sig.returns === RUNES ? `harnessRunes(${call})` : call
  const got = mutated ? `${call}\n\t\tgot := c.Input.${exported(mutated.name)}` : `got := ${result}`
  const unordered = sig.compare === 'unordered'

  return `package main

import (
	"encoding/json"
	"fmt"
	"os"${unordered ? '\n\t"sort"' : ''}
)

type harnessInput struct {
${fields}
}

type harnessCase struct {
	Name     string       \`json:"name"\`
	Input    harnessInput \`json:"input"\`
	Expected ${goType(expectedType)} \`json:"expected"\`
}

const harnessCasesJSON = \`${json}\`
${usesRunes ? RUNES_HELPER : ''}
func harnessLoad() []harnessCase {
	var cases []harnessCase
	if err := json.Unmarshal([]byte(harnessCasesJSON), &cases); err != nil {
		panic(err)
	}
	return cases
}
${unordered ? SAME_UNORDERED : SAME_EXACT}
func main() {
	want, runs := harnessLoad(), harnessLoad() // runs get fresh inputs in case the solution mutates them
	failed := 0
	for i, c := range runs {
		name := want[i].Name
		if name == "" {
			name = fmt.Sprintf("case %d", i+1)
		}
		${got}
		if harnessSame(got, want[i].Expected) {
			fmt.Printf("PASS  %s\\n", name)
			continue
		}
		failed++
		in, _ := json.Marshal(want[i].Input)
		g, _ := json.Marshal(got)
		w, _ := json.Marshal(want[i].Expected)
		fmt.Printf("FAIL  %s\\n      input: %s\\n      got:   %s\\n      want:  %s\\n", name, in, g, w)
	}
	if failed > 0 {
		fmt.Printf("\\n%d of %d tests failed\\n", failed, len(runs))
		os.Exit(1)
	}
	fmt.Printf("\\nAll %d tests passed\\n", len(runs))
}
`
}
