"""Executable solution for arn_caf_qa_000170.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=18  2=34  3=48  4=26
TR = 50q - 2q^2
MR = d(TR)/dq = 50 - 4q
At q=8: MR = 50 - 32 = 18.
"""


def solve():
    def mr(q):
        # MR = derivative of TR = 50q - 2q^2
        return 50 - 4 * q

    q = 8
    value = mr(q)  # = 18
    # option 1 = 18
    option_key = 3
    return {"value": value, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
