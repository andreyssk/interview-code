package main

func sort012(colors []int) []int {
	// индекс: число, значение: кол-во повторений
	count := make([]int, 3)
	// делаем подсчет
	for _, num := range colors {
		count[num]++
	}

	// сортируем
	i := 0
	for j := 0; j < 3; j++ {
		for ; count[j] > 0; count[j]-- {
			colors[i] = j
			i++
		}
	}
	return colors
}
