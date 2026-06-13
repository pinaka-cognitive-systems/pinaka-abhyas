import math

def solve():
    n = 10
    sum_x = 100
    sum_x2 = 1090
    mean = sum_x / n
    variance = sum_x2 / n - mean ** 2
    sd = math.sqrt(variance)
    # mean=10, variance=9, sd=3
    # Options: 1->3, 2->3.16, 3->10.44, 4->9.95
    options = {1: 3, 2: 3.16, 3: 10.44, 4: 9.95}
    correct = min(options, key=lambda k: abs(options[k] - sd))
    return {"value": sd, "option_key": correct}

if __name__ == "__main__":
    print(solve())
