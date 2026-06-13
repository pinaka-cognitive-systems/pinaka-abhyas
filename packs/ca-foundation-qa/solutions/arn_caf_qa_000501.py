def solve():
    # integral of 4x^3 from x=1 to x=2
    # antiderivative = x^4
    antideriv = lambda x: x**4
    value = antideriv(2) - antideriv(1)
    # Options: 1->15, 2->60, 3->16, 4->80
    option_map = {15: 1, 60: 2, 16: 3, 80: 4}
    return {"value": value, "option_key": option_map[value]}

if __name__ == "__main__":
    print(solve())
