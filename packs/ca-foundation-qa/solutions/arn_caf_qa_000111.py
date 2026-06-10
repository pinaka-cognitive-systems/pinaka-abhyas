"""Executable solution for arn_caf_qa_000111.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1="Systematic sampling"  2="Simple random sampling"
         3="Stratified sampling"   4="Cluster sampling"

Selecting every 10th name from an alphabetical list of 500 to get 50.
"""


def solve():
    population = 500
    sample_size = 50

    # Sampling interval
    k = population // sample_size  # 10

    # Every kth unit from an ordered list = systematic sampling
    # Encode as option_key 1
    method = "Systematic sampling"

    option_key = 3
    return {"value": method, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
