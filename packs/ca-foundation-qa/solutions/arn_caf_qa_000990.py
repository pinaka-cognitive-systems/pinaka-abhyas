"""Executable solution for arn_caf_qa_000990.

Odds in favour 2:3, 1:4, 3:7 -> p = a/(a+b) = 0.4, 0.2, 0.3.
Independent; P(at least one) = 1 - product of complements.
Options: 1=0.664  2=0.900  3=0.336  4=0.024
"""


def solve():
    odds = [(2, 3), (1, 4), (3, 7)]
    p = [a / (a + b) for a, b in odds]          # 0.4, 0.2, 0.3
    none = 1.0
    for pi in p:
        none *= (1 - pi)                          # 0.336
    at_least_one = 1 - none                       # 0.664
    value = round(at_least_one, 3)
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
