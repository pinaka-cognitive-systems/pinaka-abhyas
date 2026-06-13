def solve():
    marks = [48, 56, 62, 70, 84]
    mean = sum(marks) / len(marks)
    # options: 1->60, 2->62, 3->64, 4->66
    options = {1: 60, 2: 62, 3: 64, 4: 66}
    option_key = [k for k, v in options.items() if abs(v - mean) < 0.01][0]
    return {"value": mean, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
