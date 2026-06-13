import math

def solve():
    data = [2, 5, 8, 11, 14, 17, 20]
    n = len(data)
    mean = sum(data) / n
    variance = sum((x - mean) ** 2 for x in data) / n
    sd = math.sqrt(variance)
    # mean=11, variance=36, sd=6
    # Options: 1->6, 2->6.48, 3->36, 4->4.5
    options = {1: 6, 2: 6.48, 3: 36, 4: 4.5}
    correct = min(options, key=lambda k: abs(options[k] - sd))
    return {"value": sd, "option_key": correct}

if __name__ == "__main__":
    print(solve())
