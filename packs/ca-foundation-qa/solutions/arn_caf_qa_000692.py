def solve():
    # Identify the non-probability sampling method
    # Simple random: probability - every unit equal chance
    # Stratified random: probability - each stratum randomly sampled
    # Judgment sampling: NON-probability - based on researcher's subjective choice
    # Systematic: probability - every k-th unit with random start
    correct_option = 3
    return {"value": "judgment_sampling", "option_key": correct_option}

if __name__ == "__main__":
    print(solve())
