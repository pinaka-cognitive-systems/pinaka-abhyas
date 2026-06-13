"""Executable solution for arn_caf_qa_000905.

Maximize P = 40x + 30y subject to 2x+y<=100, x+y<=80, x>=0, y>=0.
Options: 1=2600  2=2400  3=2000  4=3200
"""


def solve():
    def feasible(x, y):
        return (2 * x + y <= 100 + 1e-9 and x + y <= 80 + 1e-9
                and x >= -1e-9 and y >= -1e-9)

    # candidate corners
    corners = [(0, 0), (50, 0), (0, 80), (20, 60)]  # (20,60) = 2x+y=100 & x+y=80
    best = None
    for (x, y) in corners:
        if feasible(x, y):
            p = 40 * x + 30 * y
            if best is None or p > best:
                best = p
    return {"value": best, "option_key": 1}


if __name__ == "__main__":
    print(solve())
