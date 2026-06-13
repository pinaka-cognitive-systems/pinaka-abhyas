def solve():
    # Population divided into mutually exclusive groups (strata) + independent random samples from each
    # This is stratified random sampling
    # Option 1: Cluster sampling - wrong
    # Option 2: Stratified random sampling - correct
    # Option 3: Systematic sampling - wrong
    # Option 4: Convenience sampling - wrong
    correct_option = 2
    return {"value": "stratified_random_sampling", "option_key": correct_option}

if __name__ == "__main__":
    print(solve())
