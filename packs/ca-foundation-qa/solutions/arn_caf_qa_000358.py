def solve():
    # (2x-3)/(x-5) < 1 for x > 5, x integer, x <= 12
    # Rearrange: (x+2)/(x-5) < 0
    # For x>5: x-5>0 and x+2>0, so ratio >0, never <0
    count = 0
    for x in range(6, 13):  # integers strictly greater than 5, at most 12
        numerator = 2*x - 3
        denominator = x - 5
        # denominator guaranteed > 0 since x > 5
        assert denominator > 0
        # check if (2x-3)/(x-5) < 1, i.e. (x+2)/(x-5) < 0
        ratio_num = x + 2
        ratio_den = x - 5
        if ratio_num * ratio_den < 0:  # safe sign check (den>0, so just check num<0)
            count += 1
    # count should be 0
    assert count == 0, f"Expected 0 but got {count}"
    # option mapping: 1->0, 2->3, 3->5, 4->7
    options = {1: 0, 2: 3, 3: 5, 4: 7}
    for k, v in options.items():
        if v == count:
            return {"value": count, "option_key": k}

if __name__ == "__main__":
    print(solve())
