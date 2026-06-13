def solve():
    corners = [(0, 4), (3, 0), (1, 2)]
    z_values = {pt: 3*pt[0] + 5*pt[1] for pt in corners}
    min_pt = min(z_values, key=lambda k: z_values[k])
    min_z = z_values[min_pt]
    assert min_pt == (3, 0) and min_z == 9
    # option key 1 text is "(3, 0); Z = 9"
    return {"value": min_z, "option_key": 1}

if __name__ == "__main__":
    print(solve())
