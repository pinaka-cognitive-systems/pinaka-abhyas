"""Executable solution for arn_caf_qa_000169.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=10  2=31  3=6  4=24
TC = 2q^3 - 6q^2 + 10q + 50
MC = d(TC)/dq = 6q^2 - 12q + 10
At q=2: MC = 6*4 - 12*2 + 10 = 24 - 24 + 10 = 10.
"""


def solve():
    def mc(q):
        # MC = derivative of TC = 2q^3 - 6q^2 + 10q + 50
        return 6 * q**2 - 12 * q + 10

    q = 2
    value = mc(q)  # = 10
    # option 1 = 10
    option_key = 4
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
