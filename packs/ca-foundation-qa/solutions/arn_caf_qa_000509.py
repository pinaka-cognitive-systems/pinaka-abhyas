def solve():
    # D(p) = 400 - 5p
    # dD/dp = -5
    # At p = 40: D(40) = 400 - 200 = 200
    # E = (dD/dp) * (p / D) = (-5) * (40/200) = -1
    p = 40
    D = 400 - 5*p   # = 200
    dD_dp = -5
    E = dD_dp * p / D  # = -1.0
    value = int(E)  # -1
    # Options: 1->-1, 2->-5, 3: 1/5 (stored as fraction text, match by -1), 4->5
    # Note: option 3 text is "1/5" = 0.2, option 4 text is "5"
    # Map by computed value
    option_map = {-1: 1, -5: 2, 5: 4}
    return {"value": value, "option_key": option_map[value]}

if __name__ == "__main__":
    print(solve())
