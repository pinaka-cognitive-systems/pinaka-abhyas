def solve():
    grades = [1, 2, 3, 4, 5]
    freqs = [4, 6, 8, 5, 7]
    N = sum(freqs)

    # Expand to full sorted list
    expanded = []
    for g, f in zip(grades, freqs):
        expanded.extend([g] * f)
    expanded.sort()

    # Median for even N: average of N/2 th and N/2+1 th (1-indexed)
    mid1 = expanded[N // 2 - 1]
    mid2 = expanded[N // 2]
    median = (mid1 + mid2) / 2

    # options: 1->2, 2->3, 3->3.5, 4->4
    options = {1: 2, 2: 3, 3: 3.5, 4: 4}
    option_key = [k for k, v in options.items() if abs(v - median) < 0.01][0]
    return {"value": median, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
