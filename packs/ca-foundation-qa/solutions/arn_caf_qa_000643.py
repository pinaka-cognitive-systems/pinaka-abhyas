def solve():
    # Anita says to Priya: "Your mother's husband's sister is my mother."
    # Priya's mother's husband = Priya's father
    # Priya's father's sister = Priya's paternal aunt
    # That aunt = Anita's mother
    # Therefore Anita is the daughter of Priya's paternal aunt
    # => Anita is Priya's cousin
    # From Priya's perspective: Anita is Priya's cousin
    # Options: 1=Cousin, 2=Niece, 3=Aunt, 4=Sister
    answer = "Cousin"
    option_key = 1
    return {"value": answer, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
