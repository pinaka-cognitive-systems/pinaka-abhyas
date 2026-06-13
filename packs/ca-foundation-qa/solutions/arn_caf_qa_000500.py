def solve():
    # f(x) = (2x + 3)(x^2 - 1)
    # f'(x) = 2*(x^2-1) + (2x+3)*(2x)   [product rule]
    x = 2
    fp = 2 * (x**2 - 1) + (2*x + 3) * (2*x)
    # Options: 1->34, 2->8, 3->20, 4->31
    option_map = {34: 1, 8: 2, 20: 3, 31: 4}
    return {"value": fp, "option_key": option_map[fp]}

if __name__ == "__main__":
    print(solve())
