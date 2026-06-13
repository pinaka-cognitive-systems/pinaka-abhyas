def solve():
    from math import comb
    # C(10,4) + C(10,6); by symmetry C(10,6)=C(10,4)=210
    value = comb(10, 4) + comb(10, 6)
    # option 1=420, 2=210, 3=462, 4=840
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
