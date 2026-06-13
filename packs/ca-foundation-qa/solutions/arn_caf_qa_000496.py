def solve():
    # f(x) = 4x^3 + 3x^2 - 2x + 5
    # f'(x) = 12x^2 + 6x - 2
    x = 1
    f_prime = 12 * x**2 + 6 * x - 2
    assert f_prime == 16
    return {"value": f_prime, "option_key": 1}

if __name__ == "__main__":
    print(solve())
