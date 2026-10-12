package main

import (
	"strings"
)

func isPalindrome(s string) bool {
	l := 0
	r := len(s) - 1

	for l < r {
		// переходим к следующей букве пока l и r
		// не будут указывать на буквы или цифры
		for l < r && !isAlnum(s[l]) {
			l++
		}
		for l < r && !isAlnum(s[r]) {
			r--
		}
		// оба символа - буквы или цифры
		if strings.ToLower(string(s[l])) != strings.ToLower(string(s[r])) {
			return false
		}
		l++
		r--
	}
	return true
}

func isAlnum(c byte) bool {
	return ('a' <= c && c <= 'z') || ('A' <= c && c <= 'Z') || ('0' <= c && c <= '9')
}
