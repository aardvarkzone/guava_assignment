function Stacker() {
    // Save original console.log and create a prefixed logger
    const originalLog = console.log;
    console.log = function(msg) {
        originalLog(msg);
    };

    const EMPTY = 0, WALL = 1, BLOCK = 2, GOLD = 3;

    const directions = [
        {dx: -1, dy: 0, move: "left"},
        {dx: 1, dy: 0, move: "right"},
        {dx: 0, dy: -1, move: "up"},
        {dx: 0, dy: 1, move: "down"}
    ];

    // Position tracking
    this.x = 0;
    this.y = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.lastMove = null;
    this.phase = "explore";
    this.staircasePlanned = false;
    this.currentBuildingStep = 0;  // Index into staircasePath
    this.currentStepLevel = 0;     // Current level we're building at current step
    this.buildPhase = "getblock";  // getblock or placeblock
    this.pathToTarget = null;      // Path to either donor or building location

    // Add these state management properties to the constructor
    this.state = "building";  // Possible states: building, descending_staircase, exploring_for_blocks, returning_to_build
    this.baseLevel = 0;       // Track the base level for returning
    this.baseX = 0;          // Store base position for returning after exploration
    this.baseY = 0;

    // Map storage
    this.map = {};
    this.donorBlocks = [];
    this.goldLocation = null;
    this.frontier = [];
    this.targetDonorBlock = null;
    this.pathToDonor = null;
    this.carryingBlock = false;
    this.firstBlockSeen = false;
    this.pathToDropLocation = null;
    this.firstBlockDropped = false;

    function setCell(x, y, type, level) {
        const key = `${x},${y}`;
        const existingCell = this.map[key];
        const visitCount = existingCell ? existingCell.visitCount : 0;

        this.map[key] = {
            type: type,
            level: level,
            visited: (x === this.x && y === this.y),
            visitCount: visitCount + (x === this.x && y === this.y ? 1 : 0)
        };

        // Only add to donorBlocks if it's a new block discovery
        if (type === BLOCK && level >= 1 && !existingCell) {
            this.donorBlocks.push({x, y, level});
            
            // If this is the first block we've ever seen, move to it
            if (this.donorBlocks.length === 1 && !this.firstBlockSeen) {
                console.log(`Found first block ever at (${x}, ${y}), moving to collect it`);
                this.pathToFirstBlock = findShortestPath.call(this, this.x, this.y, x, y);
                this.firstBlockSeen = true;
            }
        }

        if (type !== BLOCK) {
            this.donorBlocks = this.donorBlocks.filter(b => b.x !== x || b.y !== y);
        }
    }

    function exploreForBlocks(cell) {
        const key = `${this.x},${this.y}`;
        const currentCell = this.map[key];
        
        // Check if this is a staircase cell by level and position
        const isPartOfStaircase = this.staircase && this.staircase.some(step => {
            if (step.x === this.x && step.y === this.y) {
                console.log(`WARNING: At staircase cell (${this.x},${this.y}) level ${currentCell?.level}`);
                return true;
            }
            return false;
        });

        if (isPartOfStaircase) {
            console.log("On staircase cell during exploration - moving away");
            // Find nearest non-staircase cell
            for (let dir of directions) {
                const nx = this.x + dir.dx;
                const ny = this.y + dir.dy;
                if (!this.staircase.some(s => s.x === nx && s.y === ny)) {
                    updatePosition.call(this, dir.move);
                    return dir.move;
                }
            }
        }
        // First check if we found a block
        if (
            cell.type === BLOCK &&
            cell.level > 0 &&
            !isStaircaseCell.call(this, this.x, this.y)
          ) {
              // Are we in the final phase of building?
              if (this.finalPhase) {
                  // 1) Check if final step is already tall enough
                  if (this.finalStepLocation) {
                      const finalStepKey = `${this.finalStepLocation.x},${this.finalStepLocation.y}`;
                      const currentFinalLevel = this.map[finalStepKey]?.level || 0;
                      if (currentFinalLevel >= (this.goldLocation.level - 1)) {
                          console.log("Block found, but final step is already tall enough. Skipping pickup.");
                          // Just ignore this block. Maybe do a normal explore move.
                      }
                      // 2) If we already carry a block, no need to pick up another
                      else if (this.carryingBlock) {
                          console.log("Block found, but we are already carrying one in final phase. Skipping pickup.");
                          // Again, do a normal exploration move
                      }
                      // 3) Otherwise, we do actually need this block
                      else {
                          console.log(`Found verified block at (${this.x}, ${this.y}), returning to build for final step`);
                          this.state = "returning_to_build";
                          return "pickup";
                      }
                  } else {
                      // finalPhase is true, but we never set finalStepLocation? 
                      // You might handle that scenario, or just do the standard logic below:
                      console.log(`Found verified block at (${this.x}, ${this.y}), returning to build`);
                      this.state = "returning_to_build";
                      return "pickup";
                  }
              }
              // Not final phase => normal logic
              else {
                  console.log(`Found verified block at (${this.x}, ${this.y}), returning to build`);
                  this.state = "returning_to_build";
                  return "pickup";
              }
          }
    
        // Get possible moves that avoid the staircase
        const moves = [];
        const validDirections = [
            {dir: "left", dx: -1, dy: 0},
            {dir: "right", dx: 1, dy: 0},
            {dir: "up", dx: 0, dy: -1},
            {dir: "down", dx: 0, dy: 1}
        ];
    
        for (let {dir, dx, dy} of validDirections) {
            const newX = this.x + dx;
            const newY = this.y + dy;
            // Check if direction is valid and not a staircase cell
            if (cell[dir] && cell[dir].type !== WALL && !isStaircaseCell.call(this, newX, newY)) {
                moves.push({
                    direction: dir,
                    x: newX,
                    y: newY,
                    visitCount: this.map[`${newX},${newY}`]?.visitCount || 0
                });
            }
        }
    
        // First priority: unexplored cells (frontiers)
        for (let move of moves) {
            if (this.frontier.some(f => f.x === move.x && f.y === move.y)) {
                updatePosition.call(this, move.direction);
                return move.direction;
            }
        }
    
        // Second priority: least visited cells
        let bestMove = null;
        let lowestVisits = Infinity;
        for (let move of moves) {
            if (move.visitCount < lowestVisits) {
                lowestVisits = move.visitCount;
                bestMove = move;
            }
        }
    
        if (bestMove) {
            updatePosition.call(this, bestMove.direction);
            return bestMove.direction;
        }
    
        // If stuck, try to return to base rather than making random moves
        if (this.x !== this.baseX || this.y !== this.baseY) {
            const pathToBase = findShortestPath.call(this, this.x, this.y, this.baseX, this.baseY);
            if (pathToBase && pathToBase.length > 0) {
                const nextMove = pathToBase[0];
                updatePosition.call(this, nextMove);
                return nextMove;
            }
        }
    
        // Last resort: if truly stuck
        console.log("No good exploration moves found, attempting to move up");
        return "up";
    }

    function descendStaircase(cell) {
        // First reverse the staircase path
        console.log(`Descending from position (${this.x},${this.y})`);
        if (!this.staircasePath || this.staircasePath.length === 0) {
            console.log("ERROR: Lost staircase path information");
            this.state = "building";
            return buildLaterLevels.call(this, cell);
        }
        const reversedPath = this.staircasePath.slice().reverse();
        
        // Find our current position in the reversed path
        const currentStepIndex = reversedPath.findIndex(step => 
            step.x === this.x && step.y === this.y
        );
    
        // If we're not on the staircase, first get to the nearest step
        if (currentStepIndex === -1) {
            const nearestStep = reversedPath[0];  // Start with highest step
            const path = findShortestPath.call(this, this.x, this.y, nearestStep.x, nearestStep.y);
            if (path && path.length > 0) {
                const nextMove = path[0];
                updatePosition.call(this, nextMove);
                return nextMove;
            }
        }
    
        // Move down the reversed path
        for (let i = currentStepIndex + 1; i < reversedPath.length; i++) {
            const nextStep = reversedPath[i];
            const path = findShortestPath.call(this, this.x, this.y, nextStep.x, nextStep.y);
            
            if (path && path.length > 0) {
                // If this is the bottom step
                if (i === reversedPath.length - 1) {
                    console.log("Reached base of staircase, starting exploration");
                    this.state = "exploring_for_blocks";
                    this.baseX = nextStep.x;
                    this.baseY = nextStep.y;
                    this.baseLevel = this.map[`${nextStep.x},${nextStep.y}`]?.level || 0;
                }
                
                const nextMove = path[0];
                updatePosition.call(this, nextMove);
                return nextMove;
            }
        }
    
        console.log("Unable to descend staircase, attempting general move");
        return getNextMove.call(this, cell);
    }

    function recordVisibleCells(cell) {
        setCell.call(this, this.x, this.y, cell.type, cell.level);

        if (cell.left) {
            setCell.call(this, this.x - 1, this.y, cell.left.type, cell.left.level);
            if (cell.left.type === GOLD && !this.goldLocation) {
                this.goldLocation = {x: this.x - 1, y: this.y, level: cell.left.level};
                console.log(`Currently at (${this.x}, ${this.y}), level ${cell.level}`);
                console.log(`Found gold at (${this.x - 1}, ${this.y}), level ${cell.left.level}`);
            }
        }
        if (cell.right) {
            setCell.call(this, this.x + 1, this.y, cell.right.type, cell.right.level);
            if (cell.right.type === GOLD && !this.goldLocation) {
                this.goldLocation = {x: this.x + 1, y: this.y, level: cell.right.level};
                console.log(`Currently at (${this.x}, ${this.y}), level ${cell.level}`);
                console.log(`Found gold at (${this.x + 1}, ${this.y}), level ${cell.right.level}`);
            }
        }
        if (cell.up) {
            setCell.call(this, this.x, this.y - 1, cell.up.type, cell.up.level);
            if (cell.up.type === GOLD && !this.goldLocation) {
                this.goldLocation = {x: this.x, y: this.y - 1, level: cell.up.level};
                console.log(`Currently at (${this.x}, ${this.y}), level ${cell.level}`);
                console.log(`Found gold at (${this.x}, ${this.y - 1}), level ${cell.up.level}`);
            }
        }
        if (cell.down) {
            setCell.call(this, this.x, this.y + 1, cell.down.type, cell.down.level);
            if (cell.down.type === GOLD && !this.goldLocation) {
                this.goldLocation = {x: this.x, y: this.y + 1, level: cell.down.level};
                console.log(`Currently at (${this.x}, ${this.y}), level ${cell.level}`);
                console.log(`Found gold at (${this.x}, ${this.y + 1}), level ${cell.down.level}`);
            }
        }

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const key = `${this.x + dx},${this.y + dy}`;
                if (!this.map[key] && !this.frontier.some(f => f.x === this.x + dx && f.y === this.y + dy)) {
                    this.frontier.push({x: this.x + dx, y: this.y + dy});
                }
            }
        }

        this.frontier = this.frontier.filter(f => !this.map[`${f.x},${f.y}`]);
    }

    function findShortestPath(fromX, fromY, toX, toY) {
        let queue = [{ x: fromX, y: fromY, path: [] }];
        let visited = {};
        visited[`${fromX},${fromY}`] = true;
      
        while (queue.length > 0) {
          let current = queue.shift();
          if (current.x === toX && current.y === toY) {
            return current.path;
          }
      
          // get the current cell's level from your map
          let currentKey = `${current.x},${current.y}`;
          let currentCell = this.map[currentKey] || { type: 0, level: 0 };
          let currentLevel = currentCell.level || 0;
      
          for (let dir of directions) {
            const nextX = current.x + dir.dx;
            const nextY = current.y + dir.dy;
            const nextKey = `${nextX},${nextY}`;
      
            const nextCell = this.map[nextKey];
            // If we have no data about it or it's a wall, skip
            if (!nextCell || nextCell.type === WALL) {
              continue;
            }
            if (visited[nextKey]) {
              continue;
            }
      
            // CHECK LEVEL DIFFERENCE
            let nextLevel = nextCell.level || 0;
            if (Math.abs(nextLevel - currentLevel) > 1) {
              continue;  // can't climb/jump more than 1 level difference
            }
      
            visited[nextKey] = true;
            queue.push({
              x: nextX,
              y: nextY,
              path: [...current.path, dir.move]
            });
          }
        }
        return null;
      }
      

    function getNextMove(cell) {
        const moves = [];
        
        if (cell.left && cell.left.type !== WALL) {
            moves.push({direction: "left", x: this.x - 1, y: this.y});
        }
        if (cell.right && cell.right.type !== WALL) {
            moves.push({direction: "right", x: this.x + 1, y: this.y});
        }
        if (cell.up && cell.up.type !== WALL) {
            moves.push({direction: "up", x: this.x, y: this.y - 1});
        }
        if (cell.down && cell.down.type !== WALL) {
            moves.push({direction: "down", x: this.x, y: this.y + 1});
        }

        for (let move of moves) {
            if (this.frontier.some(f => f.x === move.x && f.y === move.y)) {
                return move.direction;
            }
        }

        let bestMove = null;
        let lowestVisits = Infinity;
        
        for (let move of moves) {
            const key = `${move.x},${move.y}`;
            const visitCount = this.map[key] ? this.map[key].visitCount : 0;
            if (visitCount < lowestVisits) {
                lowestVisits = visitCount;
                bestMove = move.direction;
            }
        }

        if (bestMove) {
            return bestMove;
        }

        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        return randomMove ? randomMove.direction : "up";
    }

    function updatePosition(direction) {
        this.lastX = this.x;
        this.lastY = this.y;
        
        switch(direction) {
            case "left": this.x--; break;
            case "right": this.x++; break;
            case "up": this.y--; break;
            case "down": this.y++; break;
        }
    }

    function isStaircaseValid() {
        if (!this.staircasePath || this.staircasePath.length === 0) {
            return false;
        }
    
        // Check last step has at least 2 open cells around it
        const lastStep = this.staircasePath[this.staircasePath.length - 1];
        let openCells = 0;
    
        for (let dir of directions) {
            const nx = lastStep.x + dir.dx;
            const ny = lastStep.y + dir.dy;
            const key = `${nx},${ny}`;
            const cell = this.map[key];
    
            // Count as open if it's either unexplored or not a wall
            if (!cell || cell.type !== WALL) {
                openCells++;
            }
        }
    
        return openCells >= 2;
    }

    function planStaircase() {
        let attempts = 0;
        const MAX_ATTEMPTS = 20;
    
        while (attempts < MAX_ATTEMPTS) {
            console.log(`Planning staircase attempt ${attempts + 1}`);
    
            let startX = this.goldLocation.x;
            let startY = this.goldLocation.y;
            let goldLevel = this.goldLocation.level;
            let targetLevel = goldLevel - 2;
    
            this.staircasePath = [];
            let visited = new Set();
            let queue = [];
    
            // Keep track of used levels to ensure proper sequence
            let usedLevels = new Set();
            let currentPath = [];
    
            // Start from cells adjacent to the gold
            for (let dir of directions) {
                let nextX = startX + dir.dx;
                let nextY = startY + dir.dy;
                let nextKey = `${nextX},${nextY}`;
                let cell = this.map[nextKey];
    
                if (cell && cell.type !== WALL && cell.type !== GOLD) {
                    queue.push({ 
                        x: nextX, 
                        y: nextY, 
                        level: targetLevel,
                        parent: null 
                    });
                }
            }
    
            let validPathFound = false;
            while (queue.length > 0 && targetLevel > 0) {
                let current = queue.shift();
                let key = `${current.x},${current.y}`;
    
                if (visited.has(key)) continue;
                visited.add(key);
    
                // Only add this step if we haven't used this level yet
                if (!usedLevels.has(current.level)) {
                    usedLevels.add(current.level);
                    currentPath.push({ 
                        x: current.x, 
                        y: current.y, 
                        level: current.level 
                    });
                    targetLevel--; // Decrease target level after successfully placing a step
    
                    // If we've reached level 1, verify the final position
                    if (targetLevel < 1) {
                        // Check if last step has enough open spaces
                        let openSpaces = 0;
                        for (let dir of directions) {
                            let checkX = current.x + dir.dx;
                            let checkY = current.y + dir.dy;
                            let checkKey = `${checkX},${checkY}`;
                            let checkCell = this.map[checkKey];
                            if (!checkCell || checkCell.type !== WALL) {
                                openSpaces++;
                            }
                        }
    
                        if (openSpaces >= 2) {
                            this.staircasePath = currentPath;
                            validPathFound = true;
                            break;
                        } else {
                            console.log("Last step does not have enough open spaces, retrying");
                        }
                    }
    
                    // Add adjacent cells for next level
                    for (let dir of directions) {
                        let nextX = current.x + dir.dx;
                        let nextY = current.y + dir.dy;
                        let nextKey = `${nextX},${nextY}`;
                        let cell = this.map[nextKey];
    
                        if (cell && cell.type !== WALL && cell.type !== GOLD && !visited.has(nextKey)) {
                            queue.push({ 
                                x: nextX, 
                                y: nextY, 
                                level: targetLevel,
                                parent: current 
                            });
                        }
                    }
                }
            }
    
            // If we found a valid path, sort it and return
            if (validPathFound) {
                // Sort path by level to ensure proper building order
                this.staircasePath.sort((a, b) => a.level - b.level);
    
                console.log("=== Staircase Plan ===");
                this.staircasePath.forEach((step) =>
                    console.log(`Step at (${step.x}, ${step.y}): Level = ${step.level}`)
                );
                console.log("=== End Staircase Plan ===");
                
                return this.staircasePath;
            }
    
            // If no valid path found, clear everything and try again
            attempts++;
            visited.clear();
            usedLevels.clear();
            currentPath = [];
            
            // Slightly randomize the queue order for next attempt
            queue = [];
            let startPositions = directions.slice();
            startPositions.sort(() => Math.random() - 0.5);
            
            for (let dir of startPositions) {
                let nextX = startX + dir.dx;
                let nextY = startY + dir.dy;
                let nextKey = `${nextX},${nextY}`;
                let cell = this.map[nextKey];
    
                if (cell && cell.type !== WALL && cell.type !== GOLD) {
                    queue.push({ 
                        x: nextX, 
                        y: nextY, 
                        level: goldLevel - 2,
                        parent: null 
                    });
                }
            }
        }
    
        console.log("Failed to find valid staircase plan after", MAX_ATTEMPTS, "attempts");
        return null;
    }

    function findSafeDonorBlock() {
        this.donorBlocks = this.donorBlocks.filter(block => {
            const key = `${block.x},${block.y}`;
            const cell = this.map[key];
            // Keep only blocks that still exist and have the correct level
            return cell && cell.type === BLOCK && cell.level === block.level;
        });
        // Filter out blocks that are part of our staircase
        const usableBlocks = this.donorBlocks.filter(block => {
            return !this.staircase || !this.staircase.some(step => 
                step.x === block.x && step.y === block.y
            );
        });

        if (usableBlocks.length === 0) {
            console.log("No safe donor blocks available!");
            return null;
        }

        // Find closest usable block
        let closest = null;
        let shortestPath = null;
        let minDistance = Infinity;

        for (let block of usableBlocks) {
            const path = findShortestPath.call(this, this.x, this.y, block.x, block.y);
            if (path && path.length < minDistance) {
                minDistance = path.length;
                shortestPath = path;
                closest = block;
            }
        }

        return closest ? { block: closest, path: shortestPath } : null;
    }

    function markStaircaseCells() {
        this.staircaseCells = new Set();
        for (let step of this.staircase) {
            this.staircaseCells.add(`${step.x},${step.y}`);
        }
    }

    function isStaircaseCell(x, y) {
        if (!this.staircaseCells) return false;
        return this.staircaseCells.has(`${x},${y}`);
    }
            
    this.turn = function (cell) {
        // First update our knowledge of the world
        const exploredCellCount = Object.keys(this.map).length;
        recordVisibleCells.call(this, cell);

        if (
            this.carryingBlock &&
            this.level === this.goldLevel - 1 &&
            Math.abs(this.x - this.goldLocation?.x) + Math.abs(this.y - this.goldLocation?.y) === 1
        ) {
            console.log("Next to gold! Moving to the final step position.");
        
            // Find the exact direction to the final step
            const dx = this.goldLocation.x - this.x;
            const dy = this.goldLocation.y - this.y;
        
            if (dx === 1) return "right"; // Gold is to the right
            if (dx === -1) return "left"; // Gold is to the left
            if (dy === 1) return "down"; // Gold is below
            if (dy === -1) return "up"; // Gold is above
        
            console.log("Error: Could not determine movement direction to final step.");
            return "none"; // Fallback (should not occur if logic is correct)
        }

        if (this.x === this.goldLocation?.x && this.y === this.goldLocation?.y && this.type === GOLD) {
            console.log("Reached gold! Success!");
            return "none";
        }

        
    
        // If we haven't found gold yet, keep exploring
        if (!this.goldLocation) {
            // console.log("Gold not found yet, exploring...");
            return exploreUntilGold.call(this, cell);
        }

        if (this.finalPhase) {
            const finalStepX = this.finalStepLocation?.x;
            const finalStepY = this.finalStepLocation?.y;
            if (finalStepX !== undefined && finalStepY !== undefined) {
                const finalStepLevel = this.map[`${finalStepX},${finalStepY}`]?.level || 0;
                if (finalStepLevel >= this.goldLocation.level - 1) {
                    // BFS to gold
                    console.log("Final step is tall enough, let's try BFS to gold now.");
                    const pathToGold = findShortestPath.call(this, this.x, this.y, 
                        this.goldLocation.x, this.goldLocation.y
                    );
                    if (pathToGold && pathToGold.length > 0) {
                        // Make the move
                        const nextMove = pathToGold[0];
                        updatePosition.call(this, nextMove);
                        return nextMove;
                    } else {
                        console.log("No direct path to gold, keep exploring...");
                    }
                }
            }
        }

        const neededBlocks = 0;  // Height needed
        const knownBlocks = this.donorBlocks.reduce((sum, block) => sum + block.level, 0);

        if (knownBlocks < neededBlocks) {
            if (this.carryingBlock && this.finalPhase) {
                const finalStep = this.staircase.find(step => 
                    Math.abs(step.x - this.goldLocation.x) + Math.abs(step.y - this.goldLocation.y) === 1
                );
            
                if (finalStep) {
                    const pathToFinalStep = findShortestPath.call(this, this.x, this.y, finalStep.x, finalStep.y);
                    
                    if (pathToFinalStep && pathToFinalStep.length > 0) {
                        const nextMove = pathToFinalStep[0];
                        console.log(`Moving towards final step at (${finalStep.x}, ${finalStep.y}). Next move: ${nextMove}`);
                        updatePosition.call(this, nextMove);
                        return nextMove;
                    } else {
                        console.log(`ERROR: Unable to find a path to the final step at (${finalStep.x}, ${finalStep.y}).`);
                        return "none";
                    }
                } else {
                    console.log("ERROR: Final step on staircase not found!");
                    return "none";
                }
            }            
            console.log(`Need more blocks: have ${knownBlocks}, need ${neededBlocks}`);
            return exploreForBlocks.call(this, cell);
        }

        if (this.state === "building") {
            // Store current progress before switching to exploration
            // console.log("safe donor check");
            safeDonor = findSafeDonorBlock.call(this);
            if (!safeDonor) {
                this.lastBuildLevel = this.currentLayer;
                this.state = "exploring_for_blocks";
            }
        }
        
        // When returning to building
        if (this.state === "returning_to_build") {
            this.currentLayer = this.lastBuildLevel; // Resume at correct level
        }
    
        // If we found gold but haven't explored enough, continue exploring
        const minimumExploredCells = this.goldLocation.level * 3; // Require more exploration for higher gold
        if (exploredCellCount < minimumExploredCells) {
            console.log(`Need more exploration. Explored: ${exploredCellCount}, Required: ${minimumExploredCells}`);
            return exploreUntilGold.call(this, cell);
        }
    
        // Main state machine
        switch(this.state) {
            case "building":
                // First time in building state, plan the staircase
                if (!this.staircasePlanned) {
                    console.log(`Planning staircase with ${exploredCellCount} cells explored.`);
                    this.staircasePlanned = true;
                    this.staircase = planStaircase.call(this);
                    
                    // If staircase planning failed, return to exploration
                    if (!this.staircase || this.staircase.length === 0) {
                        console.log("Staircase planning failed, need more exploration");
                        this.staircasePlanned = false;
                        return exploreUntilGold.call(this, cell);
                    }
                    
                    markStaircaseCells.call(this); // Mark staircase cells after planning
                    this.currentLayer = 1;  // Initialize starting layer
                    this.layerStartX = this.staircase[0].x;
                    this.layerStartY = this.staircase[0].y;
                    console.log(`Starting staircase build at (${this.layerStartX}, ${this.layerStartY})`);
                }
    
                // Build the staircase layer by layer
                if (this.currentLayer === 1) {
                    return buildLevelOne.call(this, cell);
                } else {
                    return buildLaterLevels.call(this, cell);
                }
            
            case "descending_staircase":
                console.log("Descending staircase to explore for more blocks");
                return descendStaircase.call(this, cell);
    
            case "exploring_for_blocks":
                console.log("Exploring for additional blocks");
                return exploreForBlocks.call(this, cell);
                
            case "returning_to_build":
                console.log("Returning to continue staircase construction");
                // If we're not carrying a block yet, pick up the one we found

                if (!this.staircase || this.staircase.length === 0) {
                    console.log("No staircase yet—planning now.");
                    this.staircase = planStaircase.call(this);
                    if (!this.staircase || this.staircase.length === 0) {
                        console.log("Staircase planning failed. Continuing exploration instead.");
                        this.state = "exploring_for_blocks";
                        return exploreForBlocks.call(this, cell);
                    } else {
                        markStaircaseCells.call(this);
                        if (!this.currentLayer || !this.lastBuildLevel) {
                            this.currentLayer     = 1;
                            this.lastBuildLevel  = 1;
                        }
                    }
                }


                if (!this.carryingBlock && cell.type === BLOCK && cell.level > 0 && !isStaircaseCell.call(this, this.x, this.y)) {
                    console.log("Picking up block to return to staircase");
                    this.carryingBlock = true;
                    this.map[`${this.x},${this.y}`].type = EMPTY;
                    this.map[`${this.x},${this.y}`].level = 0;
                    return "pickup";
                }
                
                // Once we have a block, focus ONLY on returning to drop it
                if (this.carryingBlock) {
                    const targetCell = this.staircase.find(step => {
                        const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
                        return step.level >= this.currentLayer && currentLevel < this.currentLayer;
                    });
                    
                    if (targetCell) {
                        // If at target location, drop block and return to building
                        if (this.x === targetCell.x && this.y === targetCell.y) {
                            console.log(`Returning to building state and dropping block at (${this.x}, ${this.y})`);
                            this.state = "building";
                            return "drop";
                        }
                        
                        // Move towards target drop location
                        const path = findShortestPath.call(this, this.x, this.y, targetCell.x, targetCell.y);
                        if (path && path.length > 0) {
                            const nextMove = path[0];
                            updatePosition.call(this, nextMove);
                            return nextMove;
                        }
                
                        // If we can't find a path, something is wrong with our map knowledge
                        console.log(`WARNING: No path found while carrying block. Current pos=(${this.x},${this.y}), ` +
                                   `Target=(${targetCell.x},${targetCell.y}), Layer=${this.currentLayer}`);
                        
                        // Verify our map still has correct staircase information
                        let stairKey = `${targetCell.x},${targetCell.y}`;
                        console.log(`Staircase cell status: type=${this.map[stairKey]?.type}, level=${this.map[stairKey]?.level}`);
                        
                        // Return to building state to reevaluate targets
                        this.state = "building";
                        return buildLaterLevels.call(this, cell);
                    }
                }
                
                // If we get here, something went wrong - no block to pick up or path to target
                console.log("Failed to pick up or return block, resuming exploration");
                this.state = "exploring_for_blocks";
                return exploreForBlocks.call(this, cell);
    
            default:
                console.log(`Unknown state: ${this.state}, defaulting to exploration`);
                this.state = "exploring_for_blocks";
                return exploreForBlocks.call(this, cell);
        }
    };

    function exploreUntilGold(cell) {
        // If we're heading to our first block and haven't found it yet
        if (!this.carryingBlock && this.pathToFirstBlock && this.pathToFirstBlock.length > 0) {
            console.log("Moving to first donor.");
            const nextMove = this.pathToFirstBlock.shift();
            updatePosition.call(this, nextMove);
            return nextMove;
        }

        // If we're at the first block we found and haven't picked it up yet
        if (
            !this.carryingBlock &&
            cell.type === BLOCK &&
            cell.level >= 1 &&
            this.firstBlockSeen &&
            !this.firstBlockDropped &&
            this.donorBlocks.some((b) => b.x === this.x && b.y === this.y)
        ) {
            console.log(`Picking up first block at (${this.x}, ${this.y})`);
            this.carryingBlock = true;
            this.map[`${this.x},${this.y}`].type = EMPTY;
            this.map[`${this.x},${this.y}`].level = 0;
            return "pickup";
        }

        // Default exploration behavior if no other actions are pending
        const move = getNextMove.call(this, cell);
        updatePosition.call(this, move);
        return move;
    }

    function buildLevelOne(cell) {
        const targetCell = this.staircase.find(step => {
            const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
            return step.level >= this.currentLayer && currentLevel < this.currentLayer;
        });

        if (!targetCell) {
            // Current layer is complete, move to next
            this.currentLayer++;
            console.log(`Layer ${this.currentLayer - 1} complete, moving to layer ${this.currentLayer}`);
            
            // Reset position to the starting point of the staircase
            const pathToStart = findShortestPath.call(this, this.x, this.y, this.layerStartX, this.layerStartY);
            if (pathToStart && pathToStart.length > 0) {
                const nextMove = pathToStart[0];
                updatePosition.call(this, nextMove);
                return nextMove;
            }
            return getNextMove.call(this, cell); // Default move when moving to the next layer
        }

        if (this.carryingBlock) {
            // If at target location, drop block
            if (this.x === targetCell.x && this.y === targetCell.y) {
                console.log(`Dropping block at (${this.x}, ${this.y}) for layer ${this.currentLayer}`);
                this.carryingBlock = false;
                this.map[`${this.x},${this.y}`].type = BLOCK;
                this.map[`${this.x},${this.y}`].level = this.currentLayer; // Update the level after dropping
                return "drop";
            }

            // Move towards target
            const path = findShortestPath.call(this, this.x, this.y, targetCell.x, targetCell.y);
            if (path && path.length > 0) {
                const nextMove = path[0];
                updatePosition.call(this, nextMove);
                return nextMove;
            }
        } else {
            // Find a donor block that isn't part of our staircase
            const safeDonor = findSafeDonorBlock.call(this);
            if (safeDonor) {
                const { block, path } = safeDonor;

                // If at donor location, pick up block
                if (this.x === block.x && this.y === block.y && !isStaircaseCell.call(this, block.x, block.y)) {
                    console.log(`Picking up block at (${this.x}, ${this.y})`);
                    this.carryingBlock = true;
                    this.map[`${this.x},${this.y}`].type = EMPTY;
                    this.map[`${this.x},${this.y}`].level = 0;
                    return "pickup";
                }

                // Move towards donor
                if (path && path.length > 0) {
                    const nextMove = path[0];
                    updatePosition.call(this, nextMove);
                    return nextMove;
                }
            } else {
                console.log("No safe donor blocks available, descending staircase to explore");
                this.state = "descending_staircase";
                return descendStaircase.call(this, cell);
            }
        }
    }

    this.finalPhase = false

    function buildLaterLevels(cell) {
        const allStepsComplete = this.staircase.every(step => {
            const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
            return currentLevel >= step.level;
        });
    
        if (allStepsComplete && !this.finalPhase) {
            console.log("N-2 staircase complete, moving to final phase");
            this.finalPhase = true;
            // Find the highest step (should be n-2) adjacent to gold
            const finalStep = this.staircase.find(step => {
                return Math.abs(step.x - this.goldLocation.x) + Math.abs(step.y - this.goldLocation.y) === 1;
            });
            this.finalStepLocation = finalStep;
            return buildFinalStep.call(this, cell);
        }
    
        if (this.finalPhase) {
            return buildFinalStep.call(this, cell);
        }

        const targetCell = this.staircase.find(step => {
            const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
            return step.level >= this.currentLayer && currentLevel < this.currentLayer;
        });

        if (!targetCell) {
            // Current layer is complete, move to next
            this.currentLayer++;
            console.log(`Layer ${this.currentLayer - 1} complete, moving to layer ${this.currentLayer}`);
            
            // Reset position to the starting point of the staircase
            const pathToStart = findShortestPath.call(this, this.x, this.y, this.layerStartX, this.layerStartY);
            if (pathToStart && pathToStart.length > 0) {
                const nextMove = pathToStart[0];
                updatePosition.call(this, nextMove);
                return nextMove;
            }
            return getNextMove.call(this, cell); // Default move when moving to the next layer
        }

        if (this.carryingBlock) {
            // If at target location, drop block
            if (this.x === targetCell.x && this.y === targetCell.y) {
                console.log(`Dropping block at (${this.x}, ${this.y}) for layer ${this.currentLayer}`);
                this.carryingBlock = false;
                this.map[`${this.x},${this.y}`].type = BLOCK;
                this.map[`${this.x},${this.y}`].level = this.currentLayer; // Update the level after dropping
                return "drop";
            }

            // Move towards target
            const path = findShortestPath.call(this, this.x, this.y, targetCell.x, targetCell.y);
            if (path && path.length > 0) {
                const nextMove = path[0];
                updatePosition.call(this, nextMove);
                return nextMove;
            }
        } else {
            // Find a donor block that isn't part of our staircase
            const safeDonor = findSafeDonorBlock.call(this);
            if (safeDonor) {
                const { block, path } = safeDonor;

                // If at donor location, pick up block
                if (this.x === block.x && this.y === block.y && !isStaircaseCell.call(this, block.x, block.y)) {
                    console.log(`Picking up block at (${this.x}, ${this.y})`);
                    this.carryingBlock = true;
                    this.map[`${this.x},${this.y}`].type = EMPTY;
                    this.map[`${this.x},${this.y}`].level = 0;
                    return "pickup";
                }

                // Move towards donor
                if (path && path.length > 0) {
                    const nextMove = path[0];
                    updatePosition.call(this, nextMove);
                    return nextMove;
                }
            } else {
                console.log("No safe donor blocks available, descending staircase to explore");
                this.state = "descending_staircase";
                return descendStaircase.call(this, cell);
            }
        }
    }

    function buildFinalStep(cell) {
        if (!this.finalStepLocation) {
            console.log("Error: No final step location found!");
            return "none";
        }
    
        // If we're at gold level, we're done
        if (this.type === GOLD && this.x === this.goldLocation.x && this.y === this.goldLocation.y) {
            console.log("Reached gold! Success!");
            return "none";
        }
    
        const finalStepKey = `${this.finalStepLocation.x},${this.finalStepLocation.y}`;
        const currentFinalLevel = this.map[finalStepKey]?.level || 0;
    
        if (currentFinalLevel >= this.goldLocation.level - 1) {
            console.log("Final step is tall enough to climb to gold. Attempting to move onto gold.");
            const pathToGold = findShortestPath.call(this, this.x, this.y, this.goldLocation.x, this.goldLocation.y);
            if (pathToGold && pathToGold.length > 0) {
                const nextMove = pathToGold[0];
                updatePosition.call(this, nextMove);
                return nextMove;
            }
            // If BFS fails, you'll do something else or keep exploring
            console.log("No path to gold found, continuing exploration");
            this.state = "exploring_for_blocks";
            return exploreForBlocks.call(this, cell);
        }
    
        if (this.carryingBlock) {
            // If at final step location, drop block
            if (this.x === this.finalStepLocation.x && this.y === this.finalStepLocation.y) {
                console.log(`Dropping final block to reach level ${this.goldLocation.level - 1}`);
                this.carryingBlock = false;
                this.map[finalStepKey].type = BLOCK;
                this.map[finalStepKey].level = this.goldLocation.level - 1;
                return "drop";
            }
    
            // Move towards final step location
            const pathToFinal = findShortestPath.call(this, this.x, this.y, 
                this.finalStepLocation.x, this.finalStepLocation.y);
            if (pathToFinal && pathToFinal.length > 0) {
                const nextMove = pathToFinal[0];
                updatePosition.call(this, nextMove);
                return nextMove;
            }
        } else {
            // Find a donor block for the final step
            const safeDonor = findSafeDonorBlock.call(this);
            if (safeDonor) {
                const { block, path } = safeDonor;
    
                if (this.x === block.x && this.y === block.y) {
                    console.log("Picking up block for final step");
                    this.carryingBlock = true;
                    this.map[`${this.x},${this.y}`].type = EMPTY;
                    this.map[`${this.x},${this.y}`].level = 0;
                    return "pickup";
                }
    
                if (path && path.length > 0) {
                    const nextMove = path[0];
                    updatePosition.call(this, nextMove);
                    return nextMove;
                }
            } else {
                console.log("No safe donor blocks available, descending staircase to explore");
                this.state = "descending_staircase";
                return descendStaircase.call(this, cell);
            }
        }
    
        return "none";
    }
}