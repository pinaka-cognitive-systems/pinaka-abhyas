def solve():
    candidates = [
        {"key": 1, "value": 6},
        {"key": 2, "value": 28},
        {"key": 3, "value": 36},
        {"key": 4, "value": 496}
    ]
    def is_perfect(n):
        divisors = [i for i in range(1, n) if n % i == 0]
        return sum(divisors) == n

    non_perfect = [c for c in candidates if not is_perfect(c["value"])]
    assert len(non_perfect) == 1, f"Expected exactly one non-perfect number, got {[c['value'] for c in non_perfect]}"
    result = non_perfect[0]
    return {"value": result["value"], "option_key": result["key"]}

if __name__ == "__main__":
    print(solve())
