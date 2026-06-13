import math

def solve():
    # Fisher Ideal Index = sqrt(Laspeyres * Paasche)
    laspeyres = 130
    paasche = 120
    fisher = round(math.sqrt(laspeyres * paasche), 2)
    # sqrt(15600) = 124.899... -> 124.90
    assert fisher == 124.9, f"Got {fisher}"
    return {"value": fisher, "option_key": 2}

if __name__ == "__main__":
    print(solve())
