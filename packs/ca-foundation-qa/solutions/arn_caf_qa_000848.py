def solve():
    # U = 3X + 2, V = -2Y + 5
    # r(U,V) = sign(a*c) * r(X,Y), where a=3, c=-2
    r_xy = 0.7
    a = 3   # scale for U
    c = -2  # scale for V
    sign_ac = 1 if a * c > 0 else -1
    r_uv = sign_ac * r_xy  # = -0.7
    return {"value": r_uv, "option_key": 1}

if __name__ == "__main__":
    print(solve())
