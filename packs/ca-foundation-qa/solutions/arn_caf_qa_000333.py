from fractions import Fraction

def solve():
    # Pipe A fills in 6 hours, Pipe B empties in 10 hours
    fill_rate = Fraction(1, 6)
    drain_rate = Fraction(1, 10)
    net_rate = fill_rate - drain_rate  # 5/30 - 3/30 = 2/30 = 1/15
    hours = 1 / net_rate  # 15
    hours_int = int(hours)
    # options: 1->4, 2->16, 3->8, 4->15
    option_map = {4: 1, 16: 2, 8: 3, 15: 4}
    option_key = option_map[hours_int]
    return {"value": hours_int, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
