def solve():
    # Ravi starts North, turns 90 degrees clockwise.
    # Clockwise order: N(0) -> E(1) -> S(2) -> W(3)
    directions = ["North", "East", "South", "West"]
    start_index = 0  # North
    clockwise_turns = 1  # 90 degrees clockwise = 1 step
    final_index = (start_index + clockwise_turns) % 4
    final_direction = directions[final_index]
    # final_direction == "East" which is option key 1
    return {"value": final_index, "option_key": 1}

if __name__ == "__main__":
    print(solve())
