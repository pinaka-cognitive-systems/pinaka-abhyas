def solve():
    # Ravi's grandfather's only daughter = Ravi's mother
    # Son of Ravi's mother = Ravi's brother
    # Options: 1=Son, 2=Nephew, 3=Cousin, 4=Brother
    answer = "Brother"
    option_key = 4
    return {"value": answer, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
