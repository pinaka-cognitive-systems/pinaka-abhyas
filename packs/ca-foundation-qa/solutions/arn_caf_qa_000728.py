def solve():
    import math
    data = [2, 4, 8, 16, 32]
    n = len(data)
    gm = math.prod(data) ** (1/n)
    # gm = (2*4*8*16*32)^(1/5) = (32768)^(1/5) = 8
    return {"value": round(gm, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
