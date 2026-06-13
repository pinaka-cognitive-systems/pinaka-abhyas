def solve():
    # F'(x) = 5x^4 - 6x^2 + 1, F(0) = 3
    # integrate: F(x) = x^5 - 2x^3 + x + C
    # F(0) = 3 => C = 3
    # F(2) = 32 - 16 + 2 + 3 = 21
    C = 3  # from F(0) = 3
    F = lambda x: x**5 - 2*x**3 + x + C
    value = F(2)
    # Options: 1->21, 2->18, 3->29, 4->60
    option_map = {21: 1, 18: 2, 29: 3, 60: 4}
    return {"value": value, "option_key": option_map[value]}

if __name__ == "__main__":
    print(solve())
