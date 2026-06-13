def solve():
    # 3x - 6 > 0 => x > 2; option key 1 text is "x > 2"
    # Verify by checking boundary
    assert not (3*2 - 6 > 0)   # x=2 is NOT in solution (strict)
    assert 3*3 - 6 > 0         # x=3 IS in solution
    assert not (3*1 - 6 > 0)   # x=1 is NOT in solution
    return {"value": 2, "option_key": 1}

if __name__ == "__main__":
    print(solve())
