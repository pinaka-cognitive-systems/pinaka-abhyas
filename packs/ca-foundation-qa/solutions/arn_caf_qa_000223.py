"""Executable solution for arn_caf_qa_000223.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

Scenario: population divided into 8 geographic zones (clusters).
Three zones are randomly selected; every person in those zones is surveyed.
This is cluster sampling: entire groups (clusters) are selected at random.

Correct option: 1 (text "Cluster sampling").
"""

# Sampling method lookup: identify by key structural feature.
_METHODS = {
    "cluster": "Zones are clusters. Random zones selected. All members within surveyed.",
    "stratified": "Would require random sample from WITHIN each zone, not whole zones.",
    "systematic": "Would require fixed interval selection, e.g. every k-th person.",
    "simple_random": "Would require each individual to have equal direct chance of selection.",
}


def solve():
    # The structural cue is: groups formed -> entire groups randomly selected -> all members surveyed.
    # This uniquely identifies cluster sampling.
    correct_method = "cluster"
    option_key = 1  # "Cluster sampling"
    return {"value": correct_method, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
