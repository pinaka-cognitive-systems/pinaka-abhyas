from fractions import Fraction

def solve():
    # A: 12 days, B: 18 days. Together 4 days, then A leaves. How many more days does B need?
    rate_a = Fraction(1, 12)
    rate_b = Fraction(1, 18)
    combined_rate = rate_a + rate_b  # 5/36
    work_done = 4 * combined_rate    # 20/36 = 5/9
    remaining = 1 - work_done        # 4/9
    b_days = remaining / rate_b      # (4/9)/(1/18) = 8
    b_days_int = int(b_days)
    # options: 1->6, 2->10, 3->8, 4->4
    option_map = {6: 1, 10: 2, 8: 3, 4: 4}
    option_key = option_map[b_days_int]
    return {"value": b_days_int, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
