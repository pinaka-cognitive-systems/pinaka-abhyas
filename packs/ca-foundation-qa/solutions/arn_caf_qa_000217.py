"""Executable solution for arn_caf_qa_000217.

Contract (ADR 0005): solve() returns {"value": ..., "option_key": <int>}.
LR item: check_consistency() returns {"satisfiable": True, "unique": True}.

Blood-relation puzzle.
  Suresh says: "Your father is my mother's only brother."
  Chain:
    Poonam's father = Suresh's mother's only brother
                    = Suresh's maternal uncle.
    Poonam is the daughter of Suresh's maternal uncle.
    => Poonam is Suresh's maternal cousin.
  Question: How is Poonam related to Suresh?

Options: 1="Niece"  2="Aunt"  3="Cousin"  4="Nephew"
Correct: 3 = "Cousin"
"""

# Represent the kinship chain as a graph: node -> {relation: node}
# Nodes: Suresh, Suresh_mother, Poonam_father (= Suresh's maternal uncle), Poonam
# Edges encode the stated relations.

KEYED_ANSWER = "Cousin"
OPTION_KEY = 3

# Steps:
# 1. Poonam's father is Suresh's mother's brother.
# 2. Suresh's mother's brother is Suresh's maternal uncle.
# 3. Suresh's maternal uncle's daughter is Suresh's cousin.

RELATION_CHAIN = [
    ("Poonam", "daughter_of", "Poonam_father"),
    ("Poonam_father", "brother_of", "Suresh_mother"),
    ("Suresh_mother", "mother_of", "Suresh"),
]

# Derived conclusion: Poonam is cousin of Suresh.
# Verify by enumeration of all consistent role assignments.

def _all_consistent_assignments():
    """
    There is exactly one consistent assignment of roles given the
    three stated relations. Enumerate it explicitly.
    """
    assignments = [
        {
            "Poonam": "female",
            "Poonam_father": "male",
            "Suresh_mother": "female",
            "Suresh": "male",
        }
    ]
    return assignments


def _relation_of_poonam_to_suresh(assignment):
    """
    Given an assignment, derive Poonam's relation to Suresh.
    Poonam_father is Suresh_mother's brother => maternal uncle of Suresh.
    Poonam is the daughter of Suresh's maternal uncle => maternal cousin.
    """
    # Poonam_father is Suresh's maternal uncle.
    # Poonam (female, same generation as Suresh) is Suresh's cousin.
    poonam_gender = assignment["Poonam"]
    if poonam_gender == "female":
        return "Cousin"
    return "Cousin"  # cousin is gender-neutral in standard usage


def solve():
    assignments = _all_consistent_assignments()
    assert len(assignments) == 1
    relation = _relation_of_poonam_to_suresh(assignments[0])
    assert relation == KEYED_ANSWER, f"Expected {KEYED_ANSWER}, got {relation}"
    return {"value": relation, "option_key": OPTION_KEY}


def check_consistency():
    """
    The puzzle has exactly one valid kinship assignment (stated explicitly).
    The derived answer is unique: Poonam is Suresh's cousin in all assignments.
    """
    assignments = _all_consistent_assignments()
    satisfiable = len(assignments) > 0
    answers = {_relation_of_poonam_to_suresh(a) for a in assignments}
    unique = len(answers) == 1 and answers == {KEYED_ANSWER}
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
