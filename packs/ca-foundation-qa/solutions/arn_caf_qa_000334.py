from fractions import Fraction

def solve():
    # A=12 days, B=18 days, C=36 days
    # All three work together for 4 days, then A leaves
    # How many more days do B and C need?
    rate_a = Fraction(1, 12)
    rate_b = Fraction(1, 18)
    rate_c = Fraction(1, 36)

    # Phase 1: A+B+C together for 4 days
    rate_abc = rate_a + rate_b + rate_c  # 3/36+2/36+1/36 = 6/36 = 1/6
    work_phase1 = 4 * rate_abc           # 4/6 = 2/3

    # Remaining work
    remaining = 1 - work_phase1          # 1/3

    # Phase 2: B+C together
    rate_bc = rate_b + rate_c            # 2/36+1/36 = 3/36 = 1/12
    days_bc = remaining / rate_bc        # (1/3)/(1/12) = 4

    days_int = int(days_bc)
    # options: 1->4, 2->6, 3->12, 4->3
    option_map = {4: 1, 6: 2, 12: 3, 3: 4}
    option_key = option_map[days_int]
    return {"value": days_int, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
