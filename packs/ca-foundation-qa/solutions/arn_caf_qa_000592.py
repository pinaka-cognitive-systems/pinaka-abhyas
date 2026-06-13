def solve():
    import math
    candidates = [
        {"key": 1, "value": 121},
        {"key": 2, "value": 169},
        {"key": 3, "value": 196},
        {"key": 4, "value": 225}
    ]
    def sqrt_is_odd(n):
        r = int(math.isqrt(n))
        return r * r == n and r % 2 == 1

    # Three have odd square root; one has even square root
    odd_root = [c for c in candidates if sqrt_is_odd(c["value"])]
    even_root = [c for c in candidates if not sqrt_is_odd(c["value"])]
    assert len(even_root) == 1, f"Expected exactly one with even/non-odd sqrt, got {[c['value'] for c in even_root]}"
    result = even_root[0]
    return {"value": result["value"], "option_key": result["key"]}

if __name__ == "__main__":
    print(solve())
