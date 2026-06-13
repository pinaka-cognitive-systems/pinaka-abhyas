def solve():
    # Symbol-coded directions over a 4-entity expression. In "X x Y" the
    # symbol x tells how Y stands relative to X, and the number after the
    # symbol is the distance in metres.
    #   @  Y is to the NORTH of X
    #   #  Y is to the SOUTH of X
    #   &  Y is to the EAST of X
    #   %  Y is to the WEST of X
    # +x = East, +y = North.
    unit = {"@": (0, 1), "#": (0, -1), "&": (1, 0), "%": (-1, 0)}

    def step(point, sym, dist):
        ux, uy = unit[sym]
        return (point[0] + ux * dist, point[1] + uy * dist)

    # Expression: A &9 B @6 C %9 D
    #   B is 9 m east of A
    #   C is 6 m north of B
    #   D is 9 m west of C
    A = (0, 0)
    B = step(A, "&", 9)
    C = step(B, "@", 6)
    D = step(C, "%", 9)

    # Query: direction of D with respect to A.
    vx = D[0] - A[0]
    vy = D[1] - A[1]

    def label(vx, vy):
        ew = "east" if vx > 0 else ("west" if vx < 0 else "")
        ns = "north" if vy > 0 else ("south" if vy < 0 else "")
        if ew and ns:
            return ns + "-" + ew
        return ns or ew or "same point"

    answer = label(vx, vy)  # east 9 then west 9 cancel -> D is due north of A
    options = {1: "north", 2: "north-east", 3: "east", 4: "north-west"}
    option_key = [k for k, v in options.items() if v == answer][0]
    return {"value": answer, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
