def solve():
    # -2x + 5 > 1 and x >= 0; find integer solutions
    solutions = [x for x in range(0, 20) if -2*x + 5 > 1]
    # Should be [0, 1]
    assert solutions == [0, 1]
    # option key 1 text is "x = 0, 1"
    return {"value": solutions, "option_key": 1}

if __name__ == "__main__":
    print(solve())
