"""Executable solution for arn_caf_qa_000211.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

The population is split into 5 non-overlapping strata (production shifts).
A random lottery draw is made within each stratum.
This matches the definition of stratified random sampling.
Correct option: 1 (text "Stratified sampling").
"""


def solve():
    # Identify sampling method from structural cues:
    # - population divided into strata (shifts)
    # - random draw within each stratum
    # => stratified random sampling
    method = "Stratified sampling"
    option_key = 1
    return {"value": method, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
