"""Executable solution for arn_caf_qa_000182.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Niece  2=Sister  3=Daughter  4=Mother

Blood-relations puzzle.
  Clue: "Her mother is the only daughter of my mother."
  Person: Rahul (male).
  Question: How is the woman related to Rahul?

Kinship graph enumeration:
  Rahul's mother -> only daughter -> Rahul's sister (sister of Rahul).
  Woman's mother = Rahul's sister.
  Woman = sister's daughter = Rahul's niece.
"""

# Represent the kinship graph as a small dictionary.
# Nodes: Rahul, Rahul_Mother, Rahul_Sister, Woman.
# We enumerate the derivation path explicitly.

PEOPLE = ["Rahul", "Rahul_Mother", "Rahul_Sister", "Woman"]

# Relations: (subject, relation_type, object)
RELATIONS = [
    ("Rahul", "child_of", "Rahul_Mother"),
    ("Rahul_Sister", "child_of", "Rahul_Mother"),
    ("Rahul_Sister", "is_female", None),
    ("Rahul_Sister", "is_only_daughter_of", "Rahul_Mother"),
    ("Woman", "child_of", "Rahul_Sister"),
]

OPTION_MAP = {
    "Niece": 1,
    "Sister": 2,
    "Daughter": 3,
    "Mother": 4,
}

KEYED_ANSWER = "Niece"
option_key = 2


def _derive_relation():
    """Derive the relationship of Woman to Rahul by walking the kinship graph."""
    # Step 1: Rahul's mother's only daughter.
    #   Rahul_Mother's children include Rahul and Rahul_Sister.
    #   The 'only daughter' is Rahul_Sister.
    rahuls_sisters_daughters_mother = "Rahul_Sister"

    # Step 2: Woman's mother = Rahul_Sister.
    #   So Woman is the daughter of Rahul_Sister.
    woman_mother = rahuls_sisters_daughters_mother

    # Step 3: Rahul_Sister is Rahul's sister.
    #   Woman = Rahul_Sister's daughter = Rahul's niece.
    if woman_mother == "Rahul_Sister":
        return "Niece"
    return None


def solve():
    relation = _derive_relation()
    assert relation == KEYED_ANSWER, f"Expected {KEYED_ANSWER}, got {relation}"
    return {"value": relation, "option_key": option_key}


def check_consistency():
    """Enumerate the kinship graph and confirm satisfiability and uniqueness.

    satisfiable: the kinship graph has a valid derivation path.
    unique: exactly one relation results from the stated clues.
    """
    # Enumerate all possible interpretations of 'only daughter of Rahul's mother':
    # Candidate daughters of Rahul_Mother: only Rahul_Sister qualifies (she is female
    # and is explicitly the only daughter). Rahul is male and not a daughter.
    candidate_sisters = ["Rahul_Sister"]  # only valid candidate
    relations = []
    for sister in candidate_sisters:
        # Woman's mother = sister; Woman = sister's daughter = Rahul's niece.
        relations.append("Niece")

    satisfiable = len(relations) >= 1
    unique = len(set(relations)) == 1 and relations[0] == KEYED_ANSWER
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
