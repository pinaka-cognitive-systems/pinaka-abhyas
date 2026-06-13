import math

def solve():
    # Number of digits in 2^50 given log10(2) = 0.3010
    log10_2 = 0.3010
    log10_2_50 = 50 * log10_2  # 15.05
    num_digits = math.floor(log10_2_50) + 1  # 16
    # options: 1->15, 2->16, 3->17, 4->14
    option_map = {15: 1, 16: 2, 17: 3, 14: 4}
    option_key = option_map[num_digits]
    return {"value": num_digits, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
