def solve():
    # Simple Aggregative Price Index
    # Commodity P: p0=20, p1=26
    # Commodity Q: p0=30, p1=36
    # Commodity R: p0=50, p1=63
    p0 = [20, 30, 50]
    p1 = [26, 36, 63]

    index = round(sum(p1) / sum(p0) * 100, 2)
    # (26+36+63)/(20+30+50)*100 = 125/100*100 = 125.00
    assert index == 125.0, f"Got {index}"
    return {"value": index, "option_key": 3}

if __name__ == "__main__":
    print(solve())
