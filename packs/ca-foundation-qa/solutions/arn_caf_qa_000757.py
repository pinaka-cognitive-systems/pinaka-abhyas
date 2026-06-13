def solve():
    wages = [80, 90, 100, 110, 120]
    n = len(wages)
    mean = sum(wages) / n
    variance = sum((x - mean) ** 2 for x in wages) / n
    sd = variance ** 0.5
    # sd = sqrt(200) = 14.142...
    # Option 1: 14.14 (correct)
    # Option 2: 15.81 (sample SD, n-1)
    # Option 3: 200 (variance)
    # Option 4: 20 (half range or range/2)
    return {"value": round(sd, 2), "option_key": 1}

if __name__ == "__main__":
    print(solve())
