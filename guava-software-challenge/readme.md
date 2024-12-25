---

# Guava Software Challenge - Treasure Troll Solution

## Overview

This repository contains the solution to the Guava Software Challenge, which involves programming the decision-making system for a "Treasure Troll." The troll must navigate a randomly generated map, collect stackable blocks, and construct a staircase to a golden treasure at the top of a tower. 

This solution demonstrates advanced pathfinding and strategic planning through an implementation of the A* algorithm, dynamic map tracking, and an efficient staircase-building strategy that minimizes unnecessary moves while ensuring success.

---

## Challenge Mechanics

### Map Elements
- **Tiles:**
  - `0 (empty)` - Ground level tile.
  - `1 (wall)` - Impassable obstacle.
  - `2 (block)` - Stackable block for building.
  - `3 (gold)` - Goal tile with the treasure.
- **Levels:**
  - Tiles have a `level` representing elevation, starting at 0.
  - The troll can only move between tiles with a height difference of at most 1.

### Valid Moves
The troll can perform the following actions:
- `"left"`, `"up"`, `"right"`, `"down"` - Move to adjacent tiles.
- `"pickup"` - Pick up a block from the current tile.
- `"drop"` - Place a block on the current tile.

---

## Solution Design

### High-Level Approach
The solution is divided into three main phases:

1. **Exploration Phase:**
   - The troll navigates the map using a modified A* algorithm to locate the gold tile.
   - Simultaneously collects information about blocks and obstacles, building a comprehensive map of the environment.

2. **Planning Phase:**
   - Once the gold is located, and enough blocks are discovered, the troll plans a staircase to reach the treasure.
   - The staircase plan is optimized to avoid inaccessible paths and ensure a clear route.

3. **Building Phase:**
   - The troll constructs the staircase layer by layer, ensuring each block placement aligns with the plan.
   - The final step is handled separately to reach the gold efficiently.

---

## Code Implementation

### Core Class: `Stacker`

The `Stacker` class encapsulates all the troll's logic, including state management, pathfinding, and building. 

#### Key Components:

1. **State Management:**
   - **Map Tracking:**
     - A `map` object tracks the state of each discovered tile (`type`, `level`, `visited`).
     - Keeps track of donor blocks (`donorBlocks`) for construction and ensures their availability.
   - **Staircase Planning:**
     - A `staircase` array stores the planned steps, including the coordinates and target levels for each step.
   - **Dynamic Variables:**
     - `carryingBlock`: Indicates whether the troll is holding a block.
     - `goldLocation`: Stores the coordinates and elevation of the treasure.
     - `currentLayer`: Tracks the layer of the staircase currently being built.

2. **Pathfinding with A*:**
   - Implements a modified A* algorithm to navigate the map efficiently.
   - Cost function:
     - `f(n) = g(n) + h(n)`
     - `g(n)`: Actual cost to reach a tile (`1` for flat moves, `2` for vertical moves).
     - `h(n)`: Heuristic estimate (Manhattan distance to the treasure).
   - Tracks visited tiles to avoid revisits and ensures valid moves based on height differences.

3. **Exploration:**
   - Uses BFS logic to discover the map row by row, skipping every other row for efficiency.
   - Prioritizes unvisited tiles to maximize coverage while minimizing redundant moves.

4. **Staircase Planning:**
   - Plans a staircase with `N-2` levels, ensuring the troll can reach the gold without overbuilding.
   - Verifies that the first step is accessible and open to avoid getting blocked.

5. **Building:**
   - Executes the staircase plan layer by layer.
   - Combines logic for placing blocks (`drop`) and finding new blocks (`pickup`).
   - Final step logic ensures precise placement of the last block to reach the treasure.

---

## Enhanced Staircase Planning

Secondary level one blocks have been introduced, ensuring redundancy and flexibility in the staircase base.

These additional level one blocks help mitigate issues where the staircase starts in an isolated area or near map borders, providing alternate options for staircase construction. However, this approach is not entirely foolproof and may still encounter challenges in highly constrained environments.

---

## N-2 Staircase Strategy

The staircase building strategy ensures the troll reaches the treasure efficiently while minimizing resource waste.

### Key Points:
- The staircase is built to `N-2` levels (`N` = treasure height). 
- For example, if the treasure is on level 5:
  ```
  1 1 1 5
  1 2 2 5
  1 2 3 5
  1 2 4 5
  ```
  The last constructed step is level `3` (`5 - 2`).
- The troll then adds the final block to `N-1` (level 4) and steps onto the treasure.

### Why N-2 Works:
- **Prevents Overbuilding:** Stops before reaching the treasure height to ensure no unnecessary blocks are placed.
- **Ensures Accessibility:** The troll can move from `N-1` to `N` directly, aligning with movement constraints.

---

## Total Blocks Used

The total blocks required for construction now include an additional secondary level one block, ensuring better coverage and handling of potential pitfalls. The updated minimum required blocks are reflected in the planning logic.

---

## How It Works

### Game Loop:
1. **Initialization:**
   - The `turn()` method is invoked every game tick with the current tile’s data.
   - Updates the troll’s map and state based on visible surroundings.

2. **Exploration Phase:**
   - The troll navigates until it locates the treasure and enough blocks.

3. **Planning Phase:**
   - Plans an optimal staircase using discovered blocks.
   - Verifies accessibility of the first step and adjusts the plan if necessary.

4. **Building Phase:**
   - Builds the staircase one layer at a time.
   - Adds the final block to complete the path to the treasure.

---

## Strengths of the Solution

1. **Efficiency:**
   - The A* algorithm ensures minimal moves and optimal paths.
   - Row-skipping BFS accelerates map exploration on large grids.

2. **Robustness:**
   - Dynamically adapts to map layouts, including obstacles and block scarcity.
   - Recalculates plans if blocks are obstructed or missing.

3. **Clarity:**
   - Modular code design with clear separation of logic for exploration, planning, and building.
   - Console logs provide detailed insights into the troll’s decision-making.

4. **Scalability:**
   - Can handle larger maps or additional constraints with minor adjustments.

## Limitations
### Isolated Staircase Areas Near Map Borders
The solution encounters issues when the staircase or the treasure is located near the map borders, particularly when the staircase starts in an area surrounded by walls or other obstacles. Although this issue could result in a failed trial, tests reveal that this issue is very rare and as such a challange to debug, but better initial pathing and map awareness could solve it and decrease turn count. 

---

## Future Improvements

### Staircase Planning
1. **Force Staircase Away from Borders:**
   - Use map dimensions (16x16) and coordinate-based border detection to prevent staircase steps from being placed at the edges.
   - This is a future enhancement to ensure no edge case causes the staircase to block access to the treasure.

### Other Enhancements
2. **Combine Build Functions:**
   - Merge `buildLevelOne` and `buildLaterLevels` functions to reduce redundancy and simplify code maintenance.

3. **Dynamic Resource Recovery:**
   - Introduce a more dynamic search logic for exploring the map to recover additional blocks if initial estimates fall short. (Logic was implemented but scrapped from earlier versions (old.js) due to inconsistent behavior.)

---

## Running the Solution

1. Open the `index.html` file in a browser.
2. Ensure the `solution.js` file is in the same directory.
3. Use the simulator to observe the troll’s performance.

---

### Help and References

Red Blob Games A* Pathfinding Introduction: This resource provided a helpful refresh on the A* algorithm fundamentals.
LLMs were used as code review assistants (debugging, commenting) and helped with the writing of this README.