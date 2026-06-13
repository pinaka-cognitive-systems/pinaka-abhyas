def solve():
    # R(x) = 200x - 4x^2
    # MR = 200 - 8x = 0 => x = 25
    x_opt = 25
    R = lambda x: 200*x - 4*x**2
    value = R(x_opt)
    # Options: 1->2500, 2->0, 3->2496, 4->5000
    option_map = {2500: 1, 0: 2, 2496: 3, 5000: 4}
    return {"value": value, "option_key": option_map[value]}

if __name__ == "__main__":
    print(solve())
