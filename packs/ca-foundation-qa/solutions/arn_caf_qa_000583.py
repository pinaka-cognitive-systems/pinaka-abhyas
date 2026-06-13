def solve():
    # Odd man out: 8, 27, 64, 100, 125
    # 8=2^3, 27=3^3, 64=4^3, 125=5^3 are perfect cubes
    # 100=10^2 is a perfect square but NOT a perfect cube
    # Options: 1->8, 2->27, 3->100, 4->125
    # Correct: option 3 (100)

    def is_perfect_cube(n):
        cbrt = round(n ** (1/3))
        return cbrt ** 3 == n

    candidates = {1: 8, 2: 27, 3: 100, 4: 125}
    not_cube = [k for k, v in candidates.items() if not is_perfect_cube(v)]
    assert not_cube == [3], f"Got {not_cube}"
    return {"value": 100, "option_key": 3}

if __name__ == "__main__":
    print(solve())
