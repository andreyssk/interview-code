package main

func intersect(nums1 []int, nums2 []int) []int {
	p1 := 0
	p2 := 0
	var res []int

	// Т.к. мы можем иметь дубликаты, на каждой итерации сравниваем на равенство
	// и если равны - двигаем оба указателя и добавляем в результат.
	// Иначе двигаем указатель, который указывает на меньшее значение.
	for p1 < len(nums1) && p2 < len(nums2) {
		if nums1[p1] > nums2[p2] {
			p2++
		} else if nums1[p1] < nums2[p2] {
			p1++
		} else {
			res = append(res, nums1[p1])
			p1++
			p2++
		}
	}

	return res
}
