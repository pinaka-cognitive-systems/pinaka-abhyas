def solve():
    # Time-series data over 24 months -> line graph (time-series graph)
    # option 1: line graph - correct
    # option 2: pie chart - shows parts of whole, not time trend
    # option 3: histogram - for frequency distributions
    # option 4: bar chart - less ideal than line graph for time series
    correct = 1
    return {"value": "line graph for time-series data", "option_key": correct}

if __name__ == "__main__":
    print(solve())
