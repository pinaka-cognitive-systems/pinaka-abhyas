def solve():
    # east = +x, north = +y
    pos = {}
    pos["A"] = (0, 0)
    pos["B"] = (pos["A"][0] + 6, pos["A"][1])      # 6 km east of A
    pos["C"] = (pos["B"][0], pos["B"][1] + 8)      # 8 km north of B
    pos["D"] = (pos["C"][0] - 6, pos["C"][1])      # 6 km west of C
    pos["E"] = (pos["D"][0], pos["D"][1] - 3)      # 3 km south of D
    pos["F"] = (pos["E"][0] - 5, pos["E"][1])      # 5 km west of E

    ax, ay = pos["A"]
    fx, fy = pos["F"]
    dx = ax - fx  # A relative to F, east-west
    dy = ay - fy  # A relative to F, north-south

    ew = "East" if dx > 0 else ("West" if dx < 0 else "")
    ns = "South" if dy < 0 else ("North" if dy > 0 else "")
    assert ns and ew and abs(dx) == abs(dy), "expected a clean diagonal"
    direction = ns + "-" + ew
    assert direction == "South-East"

    option_for = {
        "South-East": 1,
        "North-West": 2,
        "North-East": 3,
        "South-West": 4,
    }
    return {"value": direction, "option_key": option_for[direction]}


if __name__ == "__main__":
    print(solve())
