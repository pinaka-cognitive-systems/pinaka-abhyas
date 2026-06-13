def solve():
    # 2^x = 8^3; 8 = 2^3; 8^3 = (2^3)^3 = 2^9 => x = 9
    base = 2
    rhs_base = 8
    rhs_exp = 3
    import math
    rhs_val = rhs_base ** rhs_exp  # 512
    x = int(math.log(rhs_val, base))  # log base 2 of 512 = 9
    return {"value": x, "option_key": 3}

if __name__ == "__main__":
    print(solve())
