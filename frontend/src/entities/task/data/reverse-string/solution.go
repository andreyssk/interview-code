package main

func reverse(chars []rune) []rune {
	p1 := 0
	p2 := len(chars) - 1
	for p1 < p2 {
		chars[p1], chars[p2] = chars[p2], chars[p1]
		p1++
		p2--
	}
	return chars
}
