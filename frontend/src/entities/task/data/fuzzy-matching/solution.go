package main

func fuzzyMatch(s string, t string) bool {
	p1 := 0
	p2 := 0

	// Пока не достигли конца хотя бы одной из строк
	for p1 < len(s) && p2 < len(t) {
		if s[p1] == t[p2] {
			// Если символы совпадают — продвигаем указатель по s
			p1++
		}
		// Всегда двигаем указатель по t
		p2++
	}
	return p1 == len(s)
}
