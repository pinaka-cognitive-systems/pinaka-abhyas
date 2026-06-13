def solve():
    # Sita faces East at sunrise (sun in East), shadow falls West.
    # She turns 90 degrees right from East.
    # Clockwise: North=0, East=1, South=2, West=3
    dirs = ["North", "East", "South", "West"]
    facing = 1  # East
    facing = (facing + 1) % 4  # right turn -> South=2
    assert dirs[facing] == "South"
    # Shadow is always West (opposite of sun direction East=1)
    shadow_dir = (1 + 2) % 4  # opposite of East = West=3
    assert dirs[shadow_dir] == "West"
    # Relative to South-facing person: right is West
    # When facing South(2): front=S(2), back=N(0), left=E(1), right=W(3)
    # Shadow (West=3) == right(3): to her right
    # Option 1 = "To her right"
    return {"value": dirs[shadow_dir], "option_key": 1}

if __name__ == "__main__":
    print(solve())
