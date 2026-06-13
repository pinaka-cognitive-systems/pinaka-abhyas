def solve():
    wages = [100, 150, 200, 250]
    freqs = [4, 6, 7, 3]
    weighted_sum = sum(w * f for w, f in zip(wages, freqs))
    n = sum(freqs)
    mean = weighted_sum / n
    # options: 1->167.50, 2->172.50, 3->175.00, 4->180.00
    options = {1: 167.50, 2: 172.50, 3: 175.00, 4: 180.00}
    option_key = [k for k, v in options.items() if abs(v - mean) < 0.01][0]
    return {"value": mean, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
