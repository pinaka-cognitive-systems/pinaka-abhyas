def solve():
    # b_yx = r*(Sy/Sx), b_xy = r*(Sx/Sy)
    # b_yx * b_xy = r^2 * (Sy/Sx) * (Sx/Sy) = r^2
    # So r^2 = b_yx * b_xy  => option 2
    return {"value": "r^2 = b_yx * b_xy", "option_key": 2}

if __name__ == "__main__":
    print(solve())
