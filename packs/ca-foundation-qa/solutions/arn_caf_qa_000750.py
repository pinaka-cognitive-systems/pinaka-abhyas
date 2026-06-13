def solve():
    known = [5, 10, 15, 20, 25]
    target_md = 7

    # Try all integer values of k from -100 to 200
    solutions = []
    for k in range(-100, 201):
        data = known + [k]
        n = len(data)
        mean = sum(data) / n
        md = sum(abs(x - mean) for x in data) / n
        if abs(md - target_md) < 1e-9:
            solutions.append(k)

    # Expect exactly two solutions: 3 and 27
    assert len(solutions) == 2, f"Expected 2 solutions, got {solutions}"
    total = sum(solutions)

    # Options: 1->30, 2->27, 3->3, 4->24
    options = {1: 30, 2: 27, 3: 3, 4: 24}
    correct = min(options, key=lambda key: abs(options[key] - total))
    return {"value": total, "option_key": correct}

if __name__ == "__main__":
    print(solve())
