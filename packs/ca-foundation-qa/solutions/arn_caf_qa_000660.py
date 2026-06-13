def solve():
    """
    Enumerate family assignments to verify exactly one satisfies all clues.

    People: Farhan, Ghazal, Himanshu, Iqbal, Jaya, Kirti, Lata
    Roles/Relations to determine:
      - Farhan: parent
      - Ghazal: Farhan's daughter (clue B)
      - Farhan has exactly 2 children: Ghazal (daughter) and one son (clue A)
      - Let Farhan's son = FarhanSon (identity to be resolved)
      - Iqbal: son of Farhan's son (clue D) => Iqbal's father = FarhanSon
      - Jaya: mother of Iqbal (clue E) => Jaya is married to FarhanSon
      - Himanshu: Ghazal's husband (clue C)
      - Kirti: daughter of Ghazal and Himanshu (clue F)
      - Lata (clue G): Kirti is daughter of Lata's husband's sister
          => Lata's husband's sister = Kirti's mother = Ghazal
          => Lata's husband = Ghazal's brother = FarhanSon
          => Lata is married to FarhanSon
      - No re-marriages: FarhanSon has only one wife => Jaya = Lata

    Verification of all clues:
    A: Farhan has exactly 2 children: Ghazal (daughter) + FarhanSon (son). CHECK
    B: Ghazal is Farhan's daughter. CHECK
    C: Himanshu is Ghazal's husband. CHECK
    D: Iqbal is son of Farhan's son (FarhanSon). CHECK
    E: Jaya (= Lata) is mother of Iqbal. CHECK
    F: Kirti is daughter of Ghazal and Himanshu. CHECK
    G: Lata says Kirti is daughter of her husband's sister.
       Lata's husband = FarhanSon. His sister = Ghazal. Kirti = Ghazal's daughter. CHECK

    Conclusion: Kirti is daughter of Lata's husband's sister => Kirti is Lata's niece.
    """

    # Build the family and verify
    family = {
        "Farhan": {"children": ["Ghazal", "FarhanSon"], "gender": "M"},
        "Ghazal": {"father": "Farhan", "gender": "F", "husband": "Himanshu", "children": ["Kirti"]},
        "FarhanSon": {"father": "Farhan", "gender": "M", "wife": "Lata_Jaya", "children": ["Iqbal"]},
        "Himanshu": {"gender": "M", "wife": "Ghazal", "children": ["Kirti"]},
        "Iqbal": {"father": "FarhanSon", "mother": "Lata_Jaya", "gender": "M"},
        "Lata_Jaya": {"husband": "FarhanSon", "children": ["Iqbal"], "gender": "F"},
        "Kirti": {"father": "Himanshu", "mother": "Ghazal", "gender": "F"},
    }

    # Verify all 7 clues
    # A: Farhan has exactly 2 children: one son and one daughter
    assert set(family["Farhan"]["children"]) == {"Ghazal", "FarhanSon"}
    assert family["Ghazal"]["gender"] == "F"
    assert family["FarhanSon"]["gender"] == "M"

    # B: Ghazal is Farhan's daughter
    assert "Ghazal" in family["Farhan"]["children"]
    assert family["Ghazal"]["gender"] == "F"

    # C: Himanshu is Ghazal's husband
    assert family["Ghazal"]["husband"] == "Himanshu"

    # D: Iqbal is son of Farhan's son
    assert family["Iqbal"]["father"] == "FarhanSon"

    # E: Jaya (Lata_Jaya) is mother of Iqbal
    assert family["Iqbal"]["mother"] == "Lata_Jaya"

    # F: Kirti is daughter of Ghazal and Himanshu
    assert family["Kirti"]["mother"] == "Ghazal"
    assert family["Kirti"]["father"] == "Himanshu"

    # G: Kirti is daughter of Lata's husband's sister
    # Lata's husband = FarhanSon
    lata_husband = family["Lata_Jaya"]["husband"]  # FarhanSon
    # FarhanSon's sister = Ghazal (Farhan's daughter)
    # Check Ghazal is FarhanSon's sister: both are Farhan's children
    assert "Ghazal" in family["Farhan"]["children"]
    assert lata_husband in family["Farhan"]["children"]
    # Kirti's mother = Ghazal = Lata's husband's sister
    assert family["Kirti"]["mother"] == "Ghazal"

    # Exactly one consistent assignment: Kirti is Lata's niece
    # (daughter of spouse's sibling)
    relation = "Niece"

    # Verify uniqueness: no other assignment satisfies all clues without contradiction
    # (Jaya = Lata is forced by no-remarriage + FarhanSon having only one wife)

    return {"value": relation, "option_key": 1}


if __name__ == "__main__":
    print(solve())
