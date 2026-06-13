def solve():
    # For histogram with equal class widths:
    # bar height is directly proportional to frequency (not cumulative, not sqrt)
    # option 1: proportional to frequency - CORRECT for equal class widths
    # option 2: proportional to cumulative frequency - this is an ogive
    # option 3: equals frequency density - technically general, but option 1 is the specific correct answer
    # option 4: proportional to sqrt(frequency) - wrong
    correct = 1
    return {"value": "proportional to frequency for equal class widths", "option_key": correct}

if __name__ == "__main__":
    print(solve())
