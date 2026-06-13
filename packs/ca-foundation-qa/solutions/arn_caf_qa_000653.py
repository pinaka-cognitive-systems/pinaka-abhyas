def solve():
    # Suresh's sister = Nandini
    # Nandini's husband = Kapoor => Kapoor is Suresh's brother-in-law (uncle to Suresh's children)
    # Rohit = Suresh's son => Rohit is Kapoor's nephew
    # Nephew = option 1
    return {"value": "Nephew", "option_key": 1}

if __name__ == "__main__":
    print(solve())
