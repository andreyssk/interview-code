package main

func groupAnagrams(strs []string) [][]string {
	anagramGroups := make(map[[26]int][]string)

	for _, anagram := range strs {
		// индекс - соответствует букве (0 - 'a', 1 - 'b', ...)
		// значение - сколько раз встретили букву
		countChars := [26]int{}
		for _, ch := range anagram {
			countChars[ch-'a']++
		}

		// добавляем анаграмму в группу
		anagramGroups[countChars] = append(anagramGroups[countChars], anagram)
	}

	result := make([][]string, 0, len(anagramGroups))
	for _, group := range anagramGroups {
		result = append(result, group)
	}

	return result
}
