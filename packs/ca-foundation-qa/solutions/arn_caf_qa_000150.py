"""Executable solution for arn_caf_qa_000150.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Time reversal test  2=Circular test  3=Unit test  4=Factor reversal test

Time reversal test: P01 * P10 = 1 (base-current swap product equals 1).
"""


def solve():
    # The time reversal test is defined as P01 * P10 = 1.
    
    option_key = 1
    return {"value": option_key, "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
