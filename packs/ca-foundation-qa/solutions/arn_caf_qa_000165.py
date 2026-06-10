"""Executable solution for arn_caf_qa_000165.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=1  2=9  3=4  4=5
T5 = a + 4d = 17, T9 = a + 8d = 33. d = (33-17)/(9-5) = 4. a = 17 - 16 = 1.
"""


def solve():
    t5 = 17
    t9 = 33
    # Common difference: (T9 - T5) / (9 - 5)
    d = (t9 - t5) / (9 - 5)  # = 16 / 4 = 4
    # First term: T5 = a + 4d => a = T5 - 4d
    a = t5 - 4 * d  # = 17 - 16 = 1
    a = int(a)
    # option 1 = 1
    option_key = 1
    return {"value": a, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
