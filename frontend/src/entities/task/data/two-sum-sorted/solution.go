package main

func twoSum(nums []int, target int) []int {
	l := 0
	r := len(nums) - 1
	for l < r {
		currSum := nums[l] + nums[r]
		// если текущая сумма равна target
		// -> возвращаем индексы пары чисел
		if currSum == target {
			return []int{l + 1, r + 1}
		}
		// если текущая сумма больше target
		// -> сдвигаем правый указатель чтобы уменьшить общую сумму
		if currSum > target {
			r--
		} else {
			// если текущая сумма меньше target
			// -> сдвигаем левый указатель чтобы увеличить общую сумму
			l++
		}
	}

	return []int{-1, -1}
}
