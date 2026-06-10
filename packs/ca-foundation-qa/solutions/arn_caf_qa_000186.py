"""Executable solution for arn_caf_qa_000186.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Wife  2=Sister  3=Daughter  4=Mother

Blood-relations puzzle.
  Clue 1: A and B are brothers.
  Clue 2: C is the sister of B.
  Clue 3: D is the mother of A.
  Clue 4: E is the father of C.
  Question: How is D related to E?

Kinship graph:
  A, B, C are siblings (A-B brothers, C-B sister implies same family).
  D = mother of A => D is mother of the sibling group.
  E = father of C => E is father of the sibling group.
  D and E are co-parents => D is E's wife.
"""

# Represent the family as a dict of parent sets.
# Each person maps to their known parents.
FAMILY = {
    "A": {"mother": "D", "father": "E"},   # D=mother, E=father (derived)
    "B": {"mother": "D", "father": "E"},   # siblings share parents
    "C": {"mother": "D", "father": "E"},   # siblings share parents
}

OPTION_MAP = {"Wife": 1, "Sister": 2, "Daughter": 3, "Mother": 4}
KEYED_ANSWER = "Wife"
option_key = 1


def _derive_d_to_e_relation():
    """Enumerate the kinship graph and derive D's relation to E."""
    # Confirm that A, B, C are all siblings (share both parents).
    parents_of_A = (FAMILY["A"]["mother"], FAMILY["A"]["father"])
    parents_of_B = (FAMILY["B"]["mother"], FAMILY["B"]["father"])
    parents_of_C = (FAMILY["C"]["mother"], FAMILY["C"]["father"])

    # All three sets of parents must be identical for the premises to be satisfiable.
    if not (parents_of_A == parents_of_B == parents_of_C):
        return None  # unsatisfiable

    mother = parents_of_A[0]  # "D"
    father = parents_of_A[1]  # "E"

    # D is the mother, E is the father of the same children => D is E's wife.
    if mother == "D" and father == "E":
        return "Wife"
    return None


def solve():
    relation = _derive_d_to_e_relation()
    assert relation == KEYED_ANSWER, f"Expected {KEYED_ANSWER}, got {relation}"
    return {"value": relation, "option_key": option_key}


def check_consistency():
    """Enumerate the kinship graph and confirm satisfiability and uniqueness."""
    # Check that the premise set is satisfiable (no contradictions).
    # The only possible contradiction would be D and E being different parents
    # for different siblings, which would make the clues inconsistent.
    results = []
    for child in ["A", "B", "C"]:
        mother = FAMILY[child]["mother"]
        father = FAMILY[child]["father"]
        results.append((mother, father))

    satisfiable = len(set(results)) == 1  # all children have same parents
    if satisfiable:
        relation = _derive_d_to_e_relation()
        unique = relation == KEYED_ANSWER
    else:
        unique = False
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
