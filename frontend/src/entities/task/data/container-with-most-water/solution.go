package main

func maxArea(height []int) int {
	l := 0
	r := len(height) - 1
	resultArea := 0

	for l < r {
		// текущая площадь, ограниченная l и r
		currArea := min(height[l], height[r]) * (r - l)
		// обновляем максимальную площадь
		resultArea = max(resultArea, currArea)
		// сдвигаем указатель, который указывает на меньшую высоту
		if height[l] < height[r] {
			l++
		} else {
			r--
		}
	}

	return resultArea
}
