def solve():
    # Systematic sampling: sample size n = N / k
    N = 300  # population size
    k = 15   # sampling interval (every 15th item)
    n = N // k  # sample size

    assert n == 20
    # Option 1: 15 (wrong - that's the interval)
    # Option 2: 20 (correct)
    # Option 3: 30 (wrong - 300/10)
    # Option 4: 45 (wrong - arithmetic error)
    correct_option = 2
    return {"value": n, "option_key": correct_option}

if __name__ == "__main__":
    print(solve())
