def solve():
    # For a normal distribution, median = mean = mu
    mean = 50
    median = mean  # by symmetry property of normal distribution
    # Options: 1->40, 2->50, 3->60, 4->45
    options = {1: 40, 2: 50, 3: 60, 4: 45}
    for k, v in options.items():
        if v == median:
            return {"value": median, "option_key": k}

if __name__ == "__main__":
    print(solve())
