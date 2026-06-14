def solve():
    # Legend: '#' north, '$' south, '@' east, '&' west (X op Y => X is op of Y, one unit).
    # east = +x, north = +y
    pos = {}
    pos["Q"] = (0, 0)
    pos["P"] = (pos["Q"][0], pos["Q"][1] + 1)   # P # Q  (P north of Q)
    pos["O"] = (pos["P"][0] + 1, pos["P"][1])   # O @ P  (O east of P)
    pos["N"] = (pos["O"][0], pos["O"][1] + 1)   # N # O  (N north of O)
    pos["M"] = (pos["N"][0] + 1, pos["N"][1])   # M @ N  (M east of N)
    pos["R"] = (pos["Q"][0], pos["Q"][1] - 1)   # R $ Q  (decoy)

    qx, qy = pos["Q"]
    mx, my = pos["M"]
    dx = qx - mx  # Q relative to M
    dy = qy - my

    ew = "East" if dx > 0 else ("West" if dx < 0 else "")
    ns = "North" if dy > 0 else ("South" if dy < 0 else "")
    assert ns and ew and abs(dx) == abs(dy), "expected a clean diagonal"
    direction = ns + "-" + ew
    assert direction == "South-West"

    option_for = {
        "South-West": 1,
        "North-East": 2,
        "South-East": 3,
        "North-West": 4,
    }
    return {"value": direction, "option_key": option_for[direction]}


if __name__ == "__main__":
    print(solve())
