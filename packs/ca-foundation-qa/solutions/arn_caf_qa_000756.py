import math

def solve():
    sd_x = 5
    # Transformation: y = 3x - 4
    a = 3
    b = -4
    # SD(y) = |a| * SD(x)
    sd_y = abs(a) * sd_x
    # sd_y = 15
    # Options: 1->15, 2->11, 3->14.46, 4->8.66
    options = {1: 15, 2: 11, 3: 14.46, 4: 8.66}
    correct = min(options, key=lambda k: abs(options[k] - sd_y))
    return {"value": sd_y, "option_key": correct}

if __name__ == "__main__":
    print(solve())
