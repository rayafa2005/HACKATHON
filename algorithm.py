import heapq

def astar(grid, start, target):
    """
    Finds the shortest path from start to target on a grid.
    Obstacles (value 1) are never entered.
    Returns a list of [row, col] steps, or None if no path exists.
    """
    rows = len(grid)
    cols = len(grid[0])

    sr, sc = start[0], start[1]
    tr, tc = target[0], target[1]

    # Already there
    if sr == tr and sc == tc:
        return [[sr, sc]]

    # Manhattan distance — how many steps away is the target, ignoring walls?
    def h(r, c):
        return abs(r - tr) + abs(c - tc)

    # Priority queue: (priority, steps_taken, row, col, path_so_far)
    # Always pop the cell with the LOWEST priority first
    heap = [(h(sr, sc), 0, sr, sc, [[sr, sc]])]

    visited = set()  # cells we have already found the best path to

    while heap:
        priority, steps, r, c, path = heapq.heappop(heap)

        # Skip if we already processed this cell
        if (r, c) in visited:
            continue
        visited.add((r, c))

        # Reached the target — return the path
        if r == tr and c == tc:
            return path

        # Try all 4 neighbours: up, down, left, right
        for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
            nr, nc = r + dr, c + dc

            # Out of bounds — skip
            if not (0 <= nr < rows and 0 <= nc < cols):
                continue

            # Wall — skip
            if grid[nr][nc] == 1:
                continue

            # Already visited with a shorter path — skip
            if (nr, nc) in visited:
                continue

            new_steps    = steps + 1
            new_priority = new_steps + h(nr, nc)  # actual steps + estimated remaining
            heapq.heappush(heap, (new_priority, new_steps, nr, nc, path + [[nr, nc]]))

    # Heap is empty, target was never reached
    return None