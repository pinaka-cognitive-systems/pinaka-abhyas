def solve():
    from math import comb
    # at least 3 from accounts (7 members) in a team of 5, rest from ops (5 members)
    # case (3,2): C(7,3)*C(5,2) = 35*10 = 350
    # case (4,1): C(7,4)*C(5,1) = 35*5  = 175
    # case (5,0): C(7,5)*C(5,0) = 21*1  = 21
    value = comb(7, 3) * comb(5, 2) + comb(7, 4) * comb(5, 1) + comb(7, 5) * comb(5, 0)
    # option 1=546, 2=462, 3=350, 4=721
    return {"value": value, "option_key": 1}

if __name__ == "__main__":
    print(solve())
