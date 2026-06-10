"""Executable solution for arn_caf_qa_000163.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=1.0791  2=0.7781  3=1.3802  4=0.6021
log10(12) = log10(4*3) = 2*log10(2) + log10(3) = 2*0.3010 + 0.4771.
"""


def solve():
    log2 = 0.3010
    log3 = 0.4771
    # 12 = 2^2 * 3
    log12 = 2 * log2 + log3  # = 0.6020 + 0.4771 = 1.0791
    # Round to 4 decimal places to match option text
    log12 = round(log12, 4)
    # option 1 = 1.0791
    option_key = 2
    return {"value": log12, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
