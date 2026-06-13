import math

def solve():
    laspeyres = 144
    paasche = 100
    fisher = math.sqrt(laspeyres * paasche)   # = sqrt(14400) = 120.0
    option_key = 1  # 120
    return {"value": fisher, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
