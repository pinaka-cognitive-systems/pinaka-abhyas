import math


def solve():
    # Corrected SD after one observation was wrongly recorded.
    n = 100
    mean_w = 40.0   # incorrect mean
    sd_w = 5.1      # incorrect SD
    wrong = 50      # value used in error
    correct = 40    # value that should have been used
    # Back-calculate the (incorrect) sums.
    Sx_w = n * mean_w
    Sx2_w = n * (sd_w ** 2 + mean_w ** 2)
    # Correct both sums by swapping the wrong observation for the right one.
    Sx_c = Sx_w - wrong + correct
    Sx2_c = Sx2_w - wrong ** 2 + correct ** 2
    # Recompute mean and SD from the corrected sums.
    mean_c = Sx_c / n
    var_c = Sx2_c / n - mean_c ** 2
    sd_c = math.sqrt(var_c)
    return {"value": round(sd_c, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
