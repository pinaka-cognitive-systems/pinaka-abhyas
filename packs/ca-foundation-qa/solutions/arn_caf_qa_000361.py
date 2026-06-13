def solve():
    # Model: 3x + 2y <= 24 and y <= 2x
    # Verify the correct option is 1 by checking a feasible and an infeasible point
    def check_opt1(x, y):
        return 3*x + 2*y <= 24 and y <= 2*x
    def check_opt2(x, y):
        return 3*x + 2*y <= 24 and y >= 2*x
    # P needs 3 sqm, Q needs 2 sqm; Q <= 2P
    # Option 1 matches: key=1
    # Validate with (4, 6): space=12+12=24<=24 OK; ratio=6<=8 OK
    assert check_opt1(4, 6) == True
    # Option 2 would require y >= 2x; at (4,6): 6 >= 8 is False
    assert check_opt2(4, 6) == False
    return {"value": 1, "option_key": 1}

if __name__ == "__main__":
    print(solve())
