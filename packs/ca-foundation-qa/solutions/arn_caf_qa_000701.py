def solve():
    n1, x1 = 30, 72
    n2, x2 = 20, 83
    combined_mean = (n1 * x1 + n2 * x2) / (n1 + n2)
    # options: 1->76.4, 2->77.0, 3->77.5, 4->78.0
    options = {1: 76.4, 2: 77.0, 3: 77.5, 4: 78.0}
    option_key = [k for k, v in options.items() if abs(v - combined_mean) < 0.01][0]
    return {"value": combined_mean, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
