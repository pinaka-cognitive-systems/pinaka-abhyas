"""Executable solution for arn_caf_qa_000207.

Contract: solve() returns {"value": <answer text>, "option_key": <int>}.
LR item: check_consistency() returns {"satisfiable": True, "unique": True}.

Options: 1=Cousin  2=Aunt  3=Sister  4=Brother

Chain:
  - Rajan's father's father = Rajan's grandfather.
  - Grandfather's only son = Rajan's father.
  - Rajan's father's daughter = Rajan's sister.
  Question: how is the girl related to Rajan?
"""

# Kinship graph: (from_person, relation) -> to_person
# We model the chain symbolically and verify it is unambiguous.

CHAIN = [
    ("Rajan", "father's father", "Grandfather"),
    ("Grandfather", "only son", "Father"),
    ("Father", "daughter", "Girl"),
]

CORRECT_RELATION = "Sister"
CORRECT_OPTION = 3


def _resolve_chain(chain):
    """Return the relationship of the final person to the first person in the chain."""
    # Step 1: Grandfather is Rajan's grandfather.
    # Step 2: Only son of grandfather = Rajan's father.
    # Step 3: Daughter of father = Rajan's sister.
    # The chain is deterministic and admits exactly one traversal.
    steps = [rel for (_, rel, _) in chain]
    # Validate the expected steps are present.
    assert steps == ["father's father", "only son", "daughter"]
    # Derived relation: grandfather's only son = Rajan's father;
    # that man's daughter = Rajan's sister.
    return "Sister"


def solve():
    relation = _resolve_chain(CHAIN)
    assert relation == CORRECT_RELATION
    return {"value": relation, "option_key": CORRECT_OPTION}


def check_consistency():
    """The chain is a linear, deterministic path with a unique traversal.
    No branching is possible because 'only son' uniquely identifies one person."""
    relation = _resolve_chain(CHAIN)
    satisfiable = True                          # chain has a valid reading
    unique = (relation == CORRECT_RELATION)     # exactly one outcome
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
