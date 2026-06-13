def solve():
    salaries = [18000, 24000, 31000, 27000, 21000]
    increment = 3000
    # Range is invariant under shift
    # Original range = max - min
    orig_range = max(salaries) - min(salaries)
    # After adding 3000 to each, range is unchanged
    new_salaries = [s + increment for s in salaries]
    new_range = max(new_salaries) - min(new_salaries)
    assert new_range == orig_range
    # 31000 - 18000 = 13000 => option 1
    return {"value": new_range, "option_key": 1}

if __name__ == "__main__":
    print(solve())
