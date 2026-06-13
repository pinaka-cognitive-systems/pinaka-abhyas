def solve():
    # Pavan = Qira's father
    # Qira married Raj
    # Raj's parents: Sona (mother) and Tarun (father)
    # Usha = Tarun's sister = Raj's paternal aunt
    # By marriage: Usha is Qira's husband's aunt = Qira's aunt (in Indian family convention)
    # Options: 1=Sister-in-law, 2=Aunt, 3=Mother-in-law, 4=Cousin
    answer = "Aunt"
    option_key = 2
    return {"value": answer, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
