def solve():
    # Clue i: Arun is father of Binu
    # Clue ii: Chetna is sister of Binu => Chetna is Arun's child
    # Clue iii: Dina is mother of Chetna => Dina is Arun's wife
    # Clue iv: Elan = son of Dina's husband's brother = son of Arun's brother
    # Clue v: Elan has no siblings
    # Arun's children: Binu, Chetna
    # Chetna is female (sister), she is a sibling of Arun's family
    # Chetna is the sister of Elan's father's brother (Arun) => Chetna is Elan's aunt
    # Chetna = option 1
    return {"value": "Chetna", "option_key": 1}

if __name__ == "__main__":
    print(solve())
