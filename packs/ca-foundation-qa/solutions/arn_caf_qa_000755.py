import math

def solve():
    n1, mean1, sd1 = 40, 30, 6
    n2, mean2, sd2 = 60, 40, 8
    var1, var2 = sd1 ** 2, sd2 ** 2
    N = n1 + n2
    combined_mean = (n1 * mean1 + n2 * mean2) / N
    d1 = mean1 - combined_mean
    d2 = mean2 - combined_mean
    combined_var = (n1 * var1 + n2 * var2 + n1 * d1 ** 2 + n2 * d2 ** 2) / N
    combined_sd = math.sqrt(combined_var)
    # combined_mean=36, combined_var=76.8, combined_sd=8.763
    # Options (in thousands): 1->8.763, 2->7.0, 3->7.265, 4->7.071
    options = {1: 8.763, 2: 7.0, 3: 7.265, 4: 7.071}
    correct = min(options, key=lambda k: abs(options[k] - combined_sd))
    return {"value": round(combined_sd, 3), "option_key": correct}

if __name__ == "__main__":
    print(solve())
