def solve():
    # Coordinate plane: +x = East, +y = North. A person walks/points are
    # placed relative to earlier points. Distances in metres. The query is
    # REVERSED: it asks the direction of M with respect to N, while every
    # clue is phrased in the forward direction.
    pts = {}
    pts["P"] = (0, 0)  # anchor
    # C1: Q is 10 m to the east of P.
    pts["Q"] = (pts["P"][0] + 10, pts["P"][1])
    # C2: R is 6 m to the north of Q.
    pts["R"] = (pts["Q"][0], pts["Q"][1] + 6)
    # C3: M is 14 m to the west of R.
    pts["M"] = (pts["R"][0] - 14, pts["R"][1])
    # C4: N is 4 m to the south of P.
    pts["N"] = (pts["P"][0], pts["P"][1] - 4)

    # Reversed query: direction of M with respect to N.
    mx, my = pts["M"]
    nx, ny = pts["N"]
    dx = mx - nx
    dy = my - ny

    def label(dx, dy):
        ew = "east" if dx > 0 else ("west" if dx < 0 else "")
        ns = "north" if dy > 0 else ("south" if dy < 0 else "")
        if ew and ns:
            return ns + "-" + ew
        return ns or ew or "same point"

    answer = label(dx, dy)  # M relative to N
    options = {1: "north-east", 2: "south-west", 3: "north-west", 4: "south-east"}
    option_key = [k for k, v in options.items() if v == answer][0]
    return {"value": answer, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
