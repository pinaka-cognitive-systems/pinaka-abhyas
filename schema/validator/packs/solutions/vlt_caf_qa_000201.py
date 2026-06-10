"""Executable solution for vlt_caf_qa_000201 (good-pack exemplar).

Contract (ADR 0005, harness lands at W3-1): solve() returns a dict with
"value" (the computed answer) and "option_key" (the matching option, or None
for numeric_entry). The harness asserts these against answer_key.
"""


def solve():
    principal = 10_000
    rate = 0.05
    years = 2
    simple_interest = principal * rate * years
    return {"value": simple_interest, "option_key": None}


if __name__ == "__main__":
    print(solve())
