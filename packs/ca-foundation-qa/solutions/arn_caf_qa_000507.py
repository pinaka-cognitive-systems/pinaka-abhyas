def solve():
    # R(x) = 40x - x^2, C(x) = x^2 + 4x + 5
    # P(x) = -2x^2 + 36x - 5
    # P'(x) = -4x + 36 = 0 => x = 9
    x_opt = 9
    P = lambda x: -2*x**2 + 36*x - 5
    value = P(x_opt)
    # Options: 1->157, 2->139, 3->155, 4->279
    option_map = {157: 1, 139: 2, 155: 3, 279: 4}
    return {"value": value, "option_key": option_map[value]}

if __name__ == "__main__":
    print(solve())
