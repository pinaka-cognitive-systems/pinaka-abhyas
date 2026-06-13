def solve():
    # Identify sampling method:
    # - City divided into 80 wards (clusters)
    # - 8 wards randomly selected
    # - ALL households in selected wards surveyed
    # This is CLUSTER SAMPLING
    # Option 1: Stratified - wrong (not sampling from every group)
    # Option 2: Systematic - wrong (not interval-based individual selection)
    # Option 3: Cluster sampling - correct
    # Option 4: Simple random - wrong (entire groups selected, not individuals)
    correct_option = 3
    return {"value": "cluster_sampling", "option_key": correct_option}

if __name__ == "__main__":
    print(solve())
