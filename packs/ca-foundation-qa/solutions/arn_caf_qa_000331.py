from fractions import Fraction

def solve():
    # A completes in 10 days, B in 15 days
    rate_a = Fraction(1, 10)
    rate_b = Fraction(1, 15)
    combined_rate = rate_a + rate_b  # 1/6
    days = 1 / combined_rate  # 6
    days_int = int(days)
    # options: 1->6, 2->8, 3->5, 4->25
    option_map = {6: 1, 8: 2, 5: 3, 25: 4}
    option_key = option_map[days_int]
    return {"value": days_int, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
