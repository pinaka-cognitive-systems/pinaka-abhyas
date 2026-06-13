def solve():
    sample_space = [1, 2, 3, 4, 5, 6]
    favourable = [x for x in sample_space if x > 4]  # [5, 6]
    prob = len(favourable) / len(sample_space)  # 2/6 = 1/3
    assert len(favourable) == 2
    assert abs(prob - 1/3) < 1e-10
    return {"value": prob, "option_key": 1}

if __name__ == "__main__":
    print(solve())
