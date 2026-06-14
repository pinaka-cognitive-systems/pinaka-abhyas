"""Executable solution for arn_caf_qa_000977.

Dependent 3x3 system; x, y, z are not individually determined, but
x + y + z is invariant. Recover it from the difference of equations
and verify the invariance across the full solution line.
Options: 1=6  2=12  3=10  4=14
"""


def solve():
    # equations: (coeffs..., rhs)
    eq1 = (1, 2, 3, 14)
    eq2 = (2, 3, 4, 20)
    eq3 = (3, 4, 5, 26)

    # confirm dependence: eq1 + eq3 == 2 * eq2 (componentwise)
    for i in range(4):
        assert eq1[i] + eq3[i] == 2 * eq2[i]

    # eq2 - eq1 yields coefficients (1,1,1) and rhs = sum
    diff = tuple(eq2[i] - eq1[i] for i in range(4))
    assert diff[:3] == (1, 1, 1)
    answer = diff[3]

    # verify invariance: parametrize z = t, solve eq1 & eq2 for x, y, check eq3
    for t in range(-3, 4):
        # x + 2y = 14 - 3t ; 2x + 3y = 20 - 4t
        a1, b1, c1 = 1, 2, 14 - 3 * t
        a2, b2, c2 = 2, 3, 20 - 4 * t
        det = a1 * b2 - a2 * b1
        x = (c1 * b2 - c2 * b1) / det
        y = (a1 * c2 - a2 * c1) / det
        assert abs(3 * x + 4 * y + 5 * t - 26) < 1e-9
        assert abs((x + y + t) - answer) < 1e-9

    return {"value": answer, "option_key": 1}


if __name__ == "__main__":
    print(solve())
