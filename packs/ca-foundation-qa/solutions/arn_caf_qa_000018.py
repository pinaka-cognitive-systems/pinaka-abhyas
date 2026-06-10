"""Executable solution for arn_caf_qa_000018.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Symmetric and reflexive  2=Transitive but not symmetric
         3=An equivalence relation  4=Antisymmetric only

Relation: a <= b on integers.
  Check reflexive: a <= a  -> True for all integers.
  Check symmetric: a <= b implies b <= a?  Counter-example: 1 <= 2 but NOT 2 <= 1. -> NOT symmetric.
  Check transitive: a <= b and b <= c implies a <= c? -> True. -> Transitive.
  "Transitive but not symmetric" is the correct characterisation among the options.
"""


def solve():
    # Enumerate small integer pairs to verify properties.
    sample = range(-3, 4)  # integers from -3 to 3

    # Check reflexivity: a R a for all a
    reflexive = all(a <= a for a in sample)
    assert reflexive

    # Check symmetry: if a R b then b R a?
    symmetric = all((not (a <= b)) or (b <= a) for a in sample for b in sample)
    assert not symmetric  # 1<=2 but not 2<=1

    # Check transitivity: a R b and b R c implies a R c?
    transitive = all(
        (not (a <= b and b <= c)) or (a <= c)
        for a in sample for b in sample for c in sample
    )
    assert transitive

    description = "Transitive but not symmetric"

    # option 2 = "Transitive but not symmetric"
    option_key = 2
    return {"value": description, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
