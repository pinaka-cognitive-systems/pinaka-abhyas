def solve():
    # Systematic sampling verification
    N = 1200      # total invoices
    k = 40        # sampling interval (every 40th)
    start = 8     # random start
    n = N // k    # sample size

    # Verify the series: 8, 48, 88, 128, ...
    series = list(range(start, N + 1, k))
    assert len(series) == n
    assert n == 30
    assert series[0] == 8
    assert series[1] == 48

    # Option 3 states: systematic sampling, interval=40, sample size=30 - correct
    correct_option = 3
    return {"value": n, "option_key": correct_option}

if __name__ == "__main__":
    print(solve())
