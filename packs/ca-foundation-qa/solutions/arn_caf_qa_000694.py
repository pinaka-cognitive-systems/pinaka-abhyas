def solve():
    # Sampling error = difference between sample statistic and population parameter
    # Option 1: Non-sampling error - wrong (recording/processing defects)
    # Option 2: Sampling error - correct
    # Option 3: Standard error - wrong (variability measure across samples)
    # Option 4: Bias - wrong (systematic directional error)
    correct_option = 2
    return {"value": "sampling_error", "option_key": correct_option}

if __name__ == "__main__":
    print(solve())
