def solve():
    candidates = [
        {"key": 1, "value": 16},
        {"key": 2, "value": 64},
        {"key": 3, "value": 81},
        {"key": 4, "value": 100}
    ]
    def is_perfect_cube(n):
        r = round(n ** (1/3))
        # check r-1, r, r+1 to avoid floating point issues
        for candidate in [r-1, r, r+1]:
            if candidate >= 0 and candidate ** 3 == n:
                return True
        return False

    # The odd-one-out is the only perfect cube
    cubes = [c for c in candidates if is_perfect_cube(c["value"])]
    non_cubes = [c for c in candidates if not is_perfect_cube(c["value"])]
    # If exactly one is a cube, it's the odd one out
    assert len(cubes) == 1, f"Expected exactly one perfect cube, got {[c['value'] for c in cubes]}"
    result = cubes[0]
    return {"value": result["value"], "option_key": result["key"]}

if __name__ == "__main__":
    print(solve())
