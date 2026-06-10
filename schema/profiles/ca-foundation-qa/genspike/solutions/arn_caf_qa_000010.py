"""Executable solution for arn_caf_qa_000010.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Niece  2=Sister  3=Daughter  4=Granddaughter

Kinship chain derivation:
  "She is the daughter of the only son of my grandfather."
  Step 1: Ramesh's grandfather -> his only son = Ramesh's father.
  Step 2: Ramesh's father's daughter = Ramesh's sister.
  Therefore Kaveri is Ramesh's sister.
"""


def solve():
    # Derive the kinship chain by tracing the stated relationships.
    # Encode each step as a string transition for auditability.

    chain = [
        ("Ramesh", "grandfather", "Ramesh's grandfather"),
        ("Ramesh's grandfather", "only_son", "Ramesh's father"),   # only son of grandfather = Ramesh's father
        ("Ramesh's father", "daughter", "Kaveri"),                  # daughter of Ramesh's father = Ramesh's sister
    ]

    # The last relation: Ramesh's father's daughter relative to Ramesh is 'sister'.
    # Formally: a sibling of Ramesh (female) = sister.
    relationship = "Sister"

    # option 2 = Sister
    option_key = 2
    return {"value": relationship, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
