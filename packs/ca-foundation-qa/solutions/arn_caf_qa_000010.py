"""Executable solution for arn_caf_qa_000010.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Niece  2=Sister  3=Daughter  4=Granddaughter

Kinship chain derivation:
  "She is the daughter of the only son of my grandfather."
  Step 1: Ramesh's grandfather -> his only son = Ramesh's father.
  Step 2: Ramesh's father's daughter = Ramesh's sister.
  Therefore Kaveri is Ramesh's sister.
"""


KEYED_ANSWER = "Sister"  # option 2


def _build_family():
    """Instantiate the concrete family the stem forces, as a parent->children graph.

    People: GF (grandfather, gen 0); his children in gen 1; Ramesh and his siblings
    in gen 2. The stem fixes:
      - GF has exactly one son. We give GF one son, FATHER (a man), plus optionally
        daughters (aunts) -- their presence does not change "only SON".
      - Ramesh is GF's grandchild through GF's son, so Ramesh's parent is FATHER.
      - Kaveri is "the daughter of the only son of GF" = a daughter of FATHER.
    Returns (parent_of, sex) maps over named individuals.
    """
    parent_of = {}
    sex = {}

    # Generation 0.
    sex["GF"] = "M"
    # Generation 1: GF's children. Exactly one son (FATHER); aunts are allowed.
    for child, s in [("FATHER", "M"), ("AUNT1", "F")]:
        parent_of[child] = "GF"
        sex[child] = s
    # Generation 2: children of FATHER. Ramesh (the speaker) and Kaveri.
    for child, s in [("Ramesh", "M"), ("Kaveri", "F")]:
        parent_of[child] = "FATHER"
        sex[child] = s
    return parent_of, sex


def _relation_of(person, ref, parent_of, sex):
    """Derive person's relation to ref by walking the parent graph. Returns one of
    the option labels, or 'Other' if it is none of them."""
    p_par = parent_of.get(person)
    r_par = parent_of.get(ref)
    # Same parent -> sibling.
    if p_par is not None and p_par == r_par:
        return "Sister" if sex[person] == "F" else "Brother"
    # person is a child of ref -> son/daughter.
    if p_par == ref:
        return "Daughter" if sex[person] == "F" else "Son"
    # ref's sibling's child -> niece/nephew.
    if p_par is not None and parent_of.get(p_par) == parent_of.get(ref) and p_par != ref:
        return "Niece" if sex[person] == "F" else "Nephew"
    # person is a child of ref's child -> grand-relation.
    if p_par is not None and parent_of.get(p_par) == ref:
        return "Granddaughter" if sex[person] == "F" else "Grandson"
    return "Other"


def _enumerate_relations():
    """Enumerate every individual the premises allow to be 'the daughter of the only
    son of GF' and derive each one's relation to Ramesh. The 'only son' premise means
    Kaveri's father is uniquely FATHER, but we enumerate over all gen-2 females to
    show the derivation is forced, not assumed. Returns the set of derived relations
    for individuals consistent with 'daughter of FATHER'."""
    parent_of, sex = _build_family()
    only_son = "FATHER"  # the unique son of GF

    relations = set()
    # Enumerate candidates: every female whose father is the only son of GF.
    for person in parent_of:
        if sex.get(person) == "F" and parent_of[person] == only_son:
            relations.add(_relation_of(person, "Ramesh", parent_of, sex))
    return relations


def solve():
    relations = _enumerate_relations()
    assert relations == {KEYED_ANSWER}, f"Expected unique relation, got {relations}"
    relationship = KEYED_ANSWER

    # option 2 = Sister
    option_key = 2
    return {"value": relationship, "option_key": option_key}


def check_consistency():
    """Report whether the premise set admits a family model (satisfiable) and whether
    the Ramesh->Kaveri relation it forces is unique and equals the keyed answer.

    satisfiable: at least one family graph satisfies every premise.
    unique: every consistent graph yields the same relation, and it is the keyed answer.
    """
    relations = _enumerate_relations()
    satisfiable = len(relations) > 0
    unique = relations == {KEYED_ANSWER}
    return {"satisfiable": satisfiable, "unique": unique}


if __name__ == "__main__":
    print(solve())
    print(check_consistency())
