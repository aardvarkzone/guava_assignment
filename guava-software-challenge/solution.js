function Stacker() {
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

    // Core state
    this.x = 0;
    this.y = 0;
    this.currentLayer = 1;
    this.readyToBuild = false;
    this.blocksSeen = 0;
    this.finalPhase = false;
    this.carryingBlock = false;
    this.turnCount = 0;
    this.failedmove = 0;
    this.prevCell = null;

    // Map data
    this.map = {};
    this.donorBlocks = [];
    this.goldLocation = null;
    this.frontier = [];
    this.staircase = null;
    this.staircaseCells = null;
    this.finalStepLocation = null;

    this.setCell = function (x, y, type, level) {
        const key = `${x},${y}`;
        const existingCell = this.map[key];
        const visitCount = existingCell ? existingCell.visitCount : 0;
    
        // Update the map with new cell information
        this.map[key] = {
            type: type,
            level: level,
            visited: (x === this.x && y === this.y),
            visitCount: visitCount + (x === this.x && y === this.y ? 1 : 0)
        };
    
        // Only add to donorBlocks if it's a new block discovery
        if (type === BLOCK && level > 0 && !existingCell) {
            // Check if this block is already in donorBlocks
            const alreadyTracked = this.donorBlocks.some(b => b.x === x && b.y === y);
            if (!alreadyTracked) {
                this.donorBlocks.push({x, y, level});
                // console.log(`Added new block at (${x}, ${y}), total blocks: ${this.donorBlocks.length}`);
            }
        }
    
        if (existingCell && existingCell.type === BLOCK && type !== BLOCK) {
            // Only remove if we're at that location and performing a pickup
            if (x === this.x && y === this.y && this.carryingBlock) {
                this.donorBlocks = this.donorBlocks.filter(b => b.x !== x || b.y !== y);
                console.log(`Removed block at (${x}, ${y}), total blocks: ${this.donorBlocks.length}`);
            }
        }
    }

    this.recordVisibleCells = function (cell) {
        this.setCell.call(this, this.x, this.y, cell.type, cell.level);

        if (cell.left) {
            this.setCell.call(this, this.x - 1, this.y, cell.left.type, cell.left.level);
            if (cell.left.type === GOLD && !this.goldLocation) {
                this.goldLocation = {x: this.x - 1, y: this.y, level: cell.left.level};
                console.log(`Currently at (${this.x}, ${this.y}), level ${cell.level}`);
                console.log(`Found gold at (${this.x - 1}, ${this.y}), level ${cell.left.level}`);
            }
        }
        if (cell.right) {
            this.setCell.call(this, this.x + 1, this.y, cell.right.type, cell.right.level);
            if (cell.right.type === GOLD && !this.goldLocation) {
                this.goldLocation = {x: this.x + 1, y: this.y, level: cell.right.level};
                console.log(`Currently at (${this.x}, ${this.y}), level ${cell.level}`);
                console.log(`Found gold at (${this.x + 1}, ${this.y}), level ${cell.right.level}`);
            }
        }
        if (cell.up) {
            this.setCell.call(this, this.x, this.y - 1, cell.up.type, cell.up.level);
            if (cell.up.type === GOLD && !this.goldLocation) {
                this.goldLocation = {x: this.x, y: this.y - 1, level: cell.up.level};
                console.log(`Currently at (${this.x}, ${this.y}), level ${cell.level}`);
                console.log(`Found gold at (${this.x}, ${this.y - 1}), level ${cell.up.level}`);
            }
        }
        if (cell.down) {
            this.setCell.call(this, this.x, this.y + 1, cell.down.type, cell.down.level);
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

    this.findShortestPath = function (fromX, fromY, toX, toY) {
        let queue = [{ x: fromX, y: fromY, path: [] }];
        let visited = {};
        visited[`${fromX},${fromY}`] = true;
      
        while (queue.length > 0) {
          let current = queue.shift();
          if (current.x === toX && current.y === toY) {
            return current.path;
          }
      
          // get the current cell's level from map
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
      
            let nextLevel = nextCell.level || 0;
            if (Math.abs(nextLevel - currentLevel) > 1) {
              continue;  // can't climb more than 1 level difference
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

    this.updatePosition = function (direction) {
        switch(direction) {
            case "left": this.x--; break;
            case "right": this.x++; break;
            case "up": this.y--; break;
            case "down": this.y++; break;
        }
    }

    this.planStaircase = function () {
        console.log("=== Starting Enhanced Staircase Planning ===");
        
        if (!this.goldLocation) {
            console.log("Error: Gold location not found!");
            return null;
        }
        
        // Helper function to check if a cell is accessible
        this.isAccessibleLocation = function(x, y) {
            let openNeighbors = 0;
            let wallCount = 0;
            
            for (let dir of directions) {
                const nx = x + dir.dx;
                const ny = y + dir.dy;
                const cell = this.map[`${nx},${ny}`];
                
                if (!cell || cell.type === EMPTY) {
                    openNeighbors++;
                } else if (cell.type === WALL) {
                    wallCount++;
                }
            }
            
            return openNeighbors >= 2 && wallCount <= 1;
        };
    
        // Helper for level one blocks
        this.isValidLevelOneLocation = function(x, y) {
            const cell = this.map[`${x},${y}`];
            if (!cell) return false;
            if (cell.type === WALL) console.log("Invalid level 1 location: wall");
            if (cell && cell.type === WALL) return false;
            return this.isAccessibleLocation(x, y);
        };
    
        // Track used positions to prevent reuse
        const usedPositions = new Set();
        // Add gold location to used positions
        usedPositions.add(`${this.goldLocation.x},${this.goldLocation.y}`);
    
        // Helper to check if a position is already used
        const isPositionUsed = (x, y) => usedPositions.has(`${x},${y}`);
        const markPositionUsed = (x, y) => usedPositions.add(`${x},${y}`);
    
        // Find valid cells adjacent to gold for Level 6
        const potentialLevel6Steps = [];
        const goldX = this.goldLocation.x;
        const goldY = this.goldLocation.y;
        
        for (let dir of directions) {
            const x = goldX + dir.dx;
            const y = goldY + dir.dy;
            const key = `${x},${y}`;
            const cell = this.map[key];
            
            // Skip if this is the gold location or already used
            if (isPositionUsed(x, y)) {
                continue;
            }
            
            if (cell && cell.type !== WALL && this.isAccessibleLocation(x, y)) {
                potentialLevel6Steps.push({ x, y, level: 6 });
            }
        }
    
        if (potentialLevel6Steps.length === 0) {
            console.log("No valid locations found for Level 6 step!");
            return null;
        }
    
        // Try each potential level 6 location
        for (let level6Step of potentialLevel6Steps) {
            console.log(`Attempting staircase from Level 6 at (${level6Step.x}, ${level6Step.y})`);
            
            // Reset used positions for each new attempt, keeping only gold position
            usedPositions.clear();
            usedPositions.add(`${this.goldLocation.x},${this.goldLocation.y}`);
            
            // Mark level 6 position as used
            markPositionUsed(level6Step.x, level6Step.y);
            
            // Try to build a path down from level 6
            let staircase = [level6Step];
            let currentX = level6Step.x;
            let currentY = level6Step.y;
            
            // Build levels 5 through 2
            for (let level = 5; level >= 2; level--) {
                let bestNextStep = null;
                let bestScore = -Infinity;
                
                for (let dir of directions) {
                    const x = currentX + dir.dx;
                    const y = currentY + dir.dy;
                    const key = `${x},${y}`;
                    const cell = this.map[key];
                    
                    // Skip if cell is invalid, already used, or is the gold location
                    if (!cell || cell.type === WALL || isPositionUsed(x, y)) {
                        continue;
                    }
                    
                    let score = 0;
                    
                    // Check accessibility
                    if (this.isAccessibleLocation(x, y)) {
                        score += 10;
                    }
                    
                    // For level 2, check adjacent spaces but allow single spot as fallback
                    if (level === 2) {
                        let adjacentSpots = [];
                        for (let checkDir of directions) {
                            const nx = x + checkDir.dx;
                            const ny = y + checkDir.dy;
                            // Must share a side (be directly adjacent)
                            if (Math.abs(checkDir.dx) + Math.abs(checkDir.dy) === 1 && 
                                this.isValidLevelOneLocation(nx, ny) &&
                                !isPositionUsed(nx, ny)) {
                                adjacentSpots.push({x: nx, y: ny});
                            }
                        }
                        
                        // Strongly prefer positions with 2 or more spots
                        if (adjacentSpots.length >= 2) {
                            score += 1000;  // Much higher score for 2+ spots
                            score += (adjacentSpots.length - 2) * 5;
                        } else if (adjacentSpots.length === 1) {
                            score += 1;  // Very low score for single spot - last resort
                        } else {
                            continue;  // Must have at least one spot
                        }
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestNextStep = { x, y, level };
                    }
                }
                
                if (!bestNextStep) {
                    console.log(`Failed to find valid location for level ${level}`);
                    break;
                }
                
                markPositionUsed(bestNextStep.x, bestNextStep.y);
                staircase.push(bestNextStep);
                currentX = bestNextStep.x;
                currentY = bestNextStep.y;
            }
            
            // If we have all levels 6 through 2, try to add level 1 blocks
            if (staircase.length === 5) {  // 6,5,4,3,2
                const level2Step = staircase[staircase.length - 1];
                let levelOneSteps = [];
                
                // Find spots for level 1 blocks that are directly adjacent to level 2
                for (let dir of directions) {
                    if (Math.abs(dir.dx) + Math.abs(dir.dy) === 1) {
                        const x = level2Step.x + dir.dx;
                        const y = level2Step.y + dir.dy;
                        
                        if (this.isValidLevelOneLocation(x, y) && !isPositionUsed(x, y)) {
                            levelOneSteps.push({ x, y, level: 1 });
                        }
                    }
                }
                
                // Accept either two spots (preferred) or one spot (fallback)
                if (levelOneSteps.length >= 1) {
                    // Only use up to two level 1 blocks
                    levelOneSteps = levelOneSteps.slice(0, Math.min(2, levelOneSteps.length));
                    
                    // Mark level 1 positions as used
                    levelOneSteps.forEach(step => markPositionUsed(step.x, step.y));
                    
                    
                    staircase.push(...levelOneSteps);
                    
                    // Verify we have 7 steps total
                    if (!(staircase.length === 7 || staircase.length === 6)) {
                        console.log(`Invalid staircase length: ${staircase.length}, expected 6 or 7`);
                        continue;
                    }
                    
                    console.log("=== Successfully planned staircase ===");
                    console.log(`Total steps: ${staircase.length}`);
                    staircase.forEach(step => 
                        console.log(`Step at (${step.x}, ${step.y}): Level = ${step.level}`)
                    );
                    
                    // Set both start and end positions with complete coordinates
                    this.finalStepLocation = {
                        x: level6Step.x,
                        y: level6Step.y
                    };
                    
                    this.firstStepLocation = {
                        x: levelOneSteps[0].x,
                        y: levelOneSteps[0].y
                    };
                    
                    // Ensure layer start coordinates are set properly for path finding
                    this.layerStartX = levelOneSteps[0].x;
                    this.layerStartY = levelOneSteps[0].y;
                    
                    // Store the complete staircase for reference
                    this.staircase = staircase;
                    
                    // Sort by level before returning
                    staircase.sort((a, b) => b.level - a.level);
                    return staircase;
                }
            }
        }
        
        console.log("Failed to find valid complete staircase configuration");
        return null;
    };
    

    this.findSafeDonorBlock = function () {
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
            const path = this.findShortestPath.call(this, this.x, this.y, block.x, block.y);
            if (path && path.length < minDistance) {
                minDistance = path.length;
                shortestPath = path;
                closest = block;
            }
        }

        return closest ? { block: closest, path: shortestPath } : null;
    }

    this.markStaircaseCells = function () {
        this.staircaseCells = new Set();
        for (let step of this.staircase) {
            this.staircaseCells.add(`${step.x},${step.y}`);
        }
    }

    this.isStaircaseCell = function (x, y) {
        if (!this.staircaseCells) return false;
        return this.staircaseCells.has(`${x},${y}`);
    }
            
    this.turn = function (cell) {
        this.turnCount++;
        if (this.turnCount > 1500) {
            console.error("Turn limit reached, exiting");
            return "none";
        }

        // 1) Update map info
        this.recordVisibleCells.call(this, cell);
        this.blocksSeen = this.donorBlocks.length;
    
        // 2) Still in exploration mode?
        if (!this.readyToBuild) {
            // Either we haven't found gold or enough blocks
            // min required is 22, but some maybe stuck - lets have buffer
            if (!this.goldLocation || this.blocksSeen < 35) {
                return this.exploreUntilGold.call(this, cell);
            } 
            console.log("Found both gold and enough blocks, ready to build!");
            this.readyToBuild = true;
            
            // Plan the staircase
            const path = this.planStaircase.call(this);
            if (!path || path.length === 0) {
                console.log("PlanStaircase returned no valid path");
                this.readyToBuild = false;
                return this.exploreUntilGold.call(this, cell);
            }
            
            // Save path & mark cells BEFORE finding level 1 blocks
            this.staircase = path;
            this.markStaircaseCells.call(this);
    
            const levelOneBlocks = path.filter(step => step.level === 1);
            if (levelOneBlocks.length === 0) {
                console.log("Error: No level 1 blocks found in staircase!");
                return "none";
            }
    
            this.currentLayer = 1;
            this.layerStartX = levelOneBlocks[0].x;
            this.layerStartY = levelOneBlocks[0].y;
            console.log(`Starting staircase build at level 1 position (${this.layerStartX}, ${this.layerStartY})`);
    
            // Move to the start of the staircase
            const pathToStart = this.findShortestPath(this.x, this.y, this.layerStartX, this.layerStartY);
            if (pathToStart && pathToStart.length > 0) {
                console.log("Moving to start of staircase with first level 1 block");
                const nextMove = pathToStart[0];
                this.updatePosition(nextMove);
                return nextMove;
            }
    
            console.log("No path to start of staircase, trying to find alternative path");
            // Try the other level 1 block if available
            if (levelOneBlocks.length > 1) {
                console.log(`Starting staircase build at level 1 position (${levelOneBlocks[1].x}, ${levelOneBlocks[1].y}), second level 1 block`);
                const altPathToStart = this.findShortestPath(this.x, this.y, levelOneBlocks[1].x, levelOneBlocks[1].y);
                if (altPathToStart && altPathToStart.length > 0) {
                    console.log("Moving to start of staircase with second level 1 block");
                    this.layerStartX = levelOneBlocks[1].x;
                    this.layerStartY = levelOneBlocks[1].y;
                    const nextMove = altPathToStart[0];
                    this.updatePosition(nextMove);
                    return nextMove;
                }
            } else {
                console.log("Trying safe move to secondary level 1 block");
                temp = this.findSafeMoveTowards.call(this, cell, levelOneBlocks[1].x, levelOneBlocks[1].y);
                if (temp && temp !== "none") {
                    this.updatePosition(temp);
                    this.setCell(this.x, this.y, cell.type, cell.level);
                    console.log(`Turn executed: Moved ${nextMove} to (${this.x}, ${this.y})`);
                    this.layerStartX = levelOneBlocks[1].x;
                    this.layerStartY = levelOneBlocks[1].y;
                    return temp
                }
            }
        }
    
        // 3) If we can stand on gold, we're done
        if (
            this.x === this.goldLocation?.x && 
            this.y === this.goldLocation?.y && 
            cell.type === GOLD
        ) {
            console.log("Reached gold! Success!");
            return "none";
        }
    
        // 4) Build logic
        // Check if we've completed the N-2 steps
        const allStepsComplete = this.staircase.every(step => {
            const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
            return currentLevel >= step.level;
        });
    
        // If all steps are done and we're not in finalPhase, go final
        if (allStepsComplete && !this.finalPhase) {
            console.log("N-2 staircase complete, moving to final phase");
            this.finalPhase = true;        
        }
    
        if (this.finalPhase) {
            return buildFinalStep.call(this, cell);
        }
    
        if (this.currentLayer === 1) {
            const result = this.buildLevelOne.call(this, cell);
            if (result === null) {
                // If buildLevelOne failed to find a move, check if we need to explore
                if (!this.carryingBlock && !this.findSafeDonorBlock()) {
                    console.log("No paths to donor blocks during building, exploring for more");
                    return this.exploreUntilGold.call(this, cell);
                }
                // Otherwise continue with normal layer progression
                this.currentLayer = 2;
                return this.buildLaterLevels.call(this, cell);
            }
            return result;
        } else {
            const result = this.buildLaterLevels.call(this, cell);
            if (result === null) {
                // If buildLaterLevels failed to find a move, check if we need to explore
                if (!this.carryingBlock && !this.findSafeDonorBlock()) {
                    console.log("No paths to donor blocks during building, exploring for more");
                    return this.exploreUntilGold.call(this, cell);
                }
                if (this.finalPhase) {
                    return this.buildFinalStep.call(this, cell);
                }
                
                // Try to find a block to pick up or a place to put one
                if (!this.carryingBlock) {
                    const safeDonor = this.findSafeDonorBlock();
                    if (safeDonor && safeDonor.path && safeDonor.path.length > 0) {
                        const nextMove = safeDonor.path[0];
                        this.updatePosition(nextMove);
                        return nextMove;
                    } else {
                        console.log("No safe donor blocks available, moving towards nearest block");
                        temp = this.findSafeMoveTowards.call(this, call, this.layerStartX, this.layerStartY);
                        if (temp && temp !== "none") {
                            this.updatePosition(temp);
                            this.setCell(this.x, this.y, cell.type, cell.level);
                            return temp
                        }
                    }
                }
                
                // If carrying a block or no donor found, move towards next incomplete step
                const nextIncompleteStep = this.staircase.find(step => {
                    const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
                    return currentLevel < step.level;
                });
    
                if (nextIncompleteStep) {
                    const path = this.findShortestPath(this.x, this.y, nextIncompleteStep.x, nextIncompleteStep.y);
                    if (path && path.length > 0) {
                        const nextMove = path[0];
                        this.updatePosition(nextMove);
                        return nextMove;
                    }
                    temp = this.findSafeMoveTowards.call(this, cell, nextIncompleteStep.x, nextIncompleteStep.y);
                    if (temp && temp !== "none") {
                        this.updatePosition(temp);
                        this.setCell(this.x, this.y, cell.type, cell.level);
                        return temp
                    }
                }
                
                // If no incomplete steps found, move towards the start position
                const pathToStart = this.findShortestPath(this.x, this.y, this.layerStartX, this.layerStartY);
                if (pathToStart && pathToStart.length > 0) {
                    const nextMove = pathToStart[0];
                    this.updatePosition(nextMove);
                    return nextMove;
                }
                temp = this.findSafeMoveTowards.call(this, call, this.layerStartX, this.layerStartY);
                if (temp && temp !== "none") {
                    this.updatePosition(temp);
                    this.setCell(this.x, this.y, cell.type, cell.level);
                    return temp
                }
            }
            return result;
        }
    };
    

    this.exploreUntilGold = function (cell) {
        if (this.staircase && this.isStaircaseCell(this.x, this.y)) {
            console.log("Currently on staircase. Attempting to move to a Level 1 spot...");
            levelOneSpots = this.staircase.filter(step => step.level === 1);
            console.log(`Level 1 spots: ${levelOneSpots}`);
            // Find the nearest Level 1 spot
            const currentLevel = this.map[`${this.x},${this.y}`]?.level || 0;
            let nearestLevelOne = null;
            let minDistance = Infinity;
    
            for (let spot of levelOneSpots) {
                const distance = Math.abs(this.x - spot.x) + Math.abs(this.y - spot.y);
                if (distance < minDistance && Math.abs(spot.level - currentLevel) <= 1) {
                    minDistance = distance;
                    nearestLevelOne = spot;
                }
            }
    
            if (nearestLevelOne) {
                console.log(`Moving towards nearest Level 1 spot at (${nearestLevelOne.x}, ${nearestLevelOne.y})`);
                const path = this.findShortestPath(this.x, this.y, nearestLevelOne.x, nearestLevelOne.y);
    
                if (path && path.length > 0) {
                    const nextMove = path[0];
                    this.updatePosition(nextMove);
                    return nextMove;
                }
    
                console.warn("No path found to Level 1 spot. Falling back to safe move.");
                const fallbackMove = this.findSafeMoveTowards(cell, nearestLevelOne.x, nearestLevelOne.y);
                if (fallbackMove && fallbackMove !== "none") {
                    this.updatePosition(fallbackMove);
                    return fallbackMove;
                }
            }
        }
        // console.log(`Blocks seen: ${this.blocksSeen}/25, Gold found: ${this.goldLocation ? 'yes' : 'no'}, First block seen: ${this.firstBlockSeen}`);
    
        if (cell.type === BLOCK && cell.level >= 1 && !this.firstBlockSeen) {
            console.log("Found first block");
            this.firstBlockSeen = true;
            
            if (!this.carryingBlock) {
                console.log(`Picking up first block at (${this.x}, ${this.y})`);
                this.carryingBlock = true;
                this.map[`${this.x},${this.y}`].type = EMPTY;
                this.map[`${this.x},${this.y}`].level = 0;
                return "pickup";
            }
        }
    
        // If we're near gold, force movement away from it
        if (this.goldLocation && 
            Math.abs(this.x - this.goldLocation.x) + Math.abs(this.y - this.goldLocation.y) <= 1) {
            // Find a move that takes us away from gold
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
    
            // Find the move that takes us furthest from gold
            let bestMove = null;
            let maxDistance = -1;
            for (let move of moves) {
                const distance = Math.abs(move.x - this.goldLocation.x) + 
                               Math.abs(move.y - this.goldLocation.y);
                if (distance > maxDistance) {
                    maxDistance = distance;
                    bestMove = move;
                }
            }
    
            if (bestMove) {
                this.updatePosition.call(this, bestMove.direction);
                return bestMove.direction;
            }
        }
    
        // If we've seen the first block but haven't dropped it yet, continue looking for blocks to pick up
        if (this.firstBlockSeen && !this.carryingBlock) {
            if (cell.type === BLOCK && cell.level >= 1) {
                console.log(`Found block to pick up at (${this.x}, ${this.y})`);
                this.carryingBlock = true;
                this.map[`${this.x},${this.y}`].type = EMPTY;
                this.map[`${this.x},${this.y}`].level = 0;
                return "pickup";
            }
        }
    
        // Normal exploration moves
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
    
        // First priority: Check frontier cells
        for (let move of moves) {
            if (this.frontier.some(f => f.x === move.x && f.y === move.y)) {
                this.updatePosition.call(this, move.direction);
                return move.direction;
            }
        }
    
        // Second priority: Least visited cells, but with a bias towards moving away from current position
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (let move of moves) {
            const key = `${move.x},${move.y}`;
            const visitCount = this.map[key] ? this.map[key].visitCount : 0;
            
            // Score includes both visit count and distance from current position
            const distanceFromCurrent = Math.abs(move.x - this.x) + Math.abs(move.y - this.y);
            const score = -visitCount + distanceFromCurrent; // Negative because we want lower visit counts
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
    
        if (bestMove) {
            this.updatePosition.call(this, bestMove.direction);
            return bestMove.direction;
        }
    
        // Last resort: random move from valid moves
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        if (randomMove) {
            this.updatePosition.call(this, randomMove.direction);
            return randomMove.direction;
        }
    
        // Absolute fallback
        this.updatePosition.call(this, "up");
        return "up";
    }

    this.buildLevelOne = function (cell) {        
        const targetCell = this.staircase.find(step => {
            const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
            return step.level >= this.currentLayer && currentLevel < this.currentLayer;
        });
    
        if (!targetCell) {
            // Current layer is complete, move to next
            this.currentLayer++;
            console.log(`Layer ${this.currentLayer - 1} complete, moving to layer ${this.currentLayer}`);
            if (this.x === this.layerStartX && this.y === this.layerStartY) {
                return null;
            }
            
            // Try to move towards the start of the staircase
            const pathToStart = this.findShortestPath.call(this, this.x, this.y, this.layerStartX, this.layerStartY);
            if (pathToStart && pathToStart.length > 0) {
                const nextMove = pathToStart[0];
                this.updatePosition.call(this, nextMove);
                return nextMove;
            }
            console.log("No path to start of layer, moving towards it");
            return this.findSafeMoveTowards.call(this, cell, this.layerStartX, this.layerStartY);
        }
    
        if (this.carryingBlock) {
            // If at target location, drop block
            if (this.x === targetCell.x && this.y === targetCell.y) {
                // console.log(`Dropping block at (${this.x}, ${this.y}) for layer ${this.currentLayer}`);
                this.carryingBlock = false;
                this.map[`${this.x},${this.y}`].type = BLOCK;
                this.map[`${this.x},${this.y}`].level = this.currentLayer;
                return "drop";
            }
    
            // Move towards target
            const path = this.findShortestPath.call(this, this.x, this.y, targetCell.x, targetCell.y);
            if (path && path.length > 0) {
                const nextMove = path[0];
                this.updatePosition.call(this, nextMove);
                return nextMove;
            }
            // If no path found, try to move towards target anyway
            temp = this.findSafeMoveTowards.call(this, cell, targetCell.x, targetCell.y);
            if (temp && temp !== "none") {
                this.updatePosition(temp);
                this.setCell(this.x, this.y, cell.type, cell.level);
                return temp
            }
        } else {
            // Find a donor block
            const safeDonor = this.findSafeDonorBlock.call(this);
            if (safeDonor) {
                const { block, path } = safeDonor;
    
                // If at donor location, pick up block
                if (this.x === block.x && this.y === block.y && !this.isStaircaseCell.call(this, block.x, block.y)) {
                    // console.log(`Picking up block at (${this.x}, ${this.y})`);
                    this.carryingBlock = true;
                    this.map[`${this.x},${this.y}`].type = EMPTY;
                    this.map[`${this.x},${this.y}`].level = 0;
                    return "pickup";
                }
    
                // Move towards donor
                if (path && path.length > 0) {
                    const nextMove = path[0];
                    this.updatePosition.call(this, nextMove);
                    return nextMove;
                }
                // If no path found, try to move towards donor anyway
                temp = this.findSafeMoveTowards.call(this, cell, block.x, block.y);
                if (temp && temp !== "none") {
                    this.updatePosition(temp);
                    this.setCell(this.x, this.y, cell.type, cell.level);
                    return temp
                }
            }
            
            // If no donor found, try to move towards the nearest potential block
            const nearestBlock = this.donorBlocks.reduce((nearest, block) => {
                const dist = Math.abs(block.x - this.x) + Math.abs(block.y - this.y);
                if (!nearest || dist < nearest.dist) {
                    return { block, dist };
                }
                return nearest;
            }, null);
    
            if (nearestBlock) {
                console.log("Moving towards nearest block");
                temp = this.findSafeMoveTowards.call(this, cell, nearestBlock.block.x, nearestBlock.block.y);
                if (temp && temp !== "none") {
                    this.updatePosition(temp);
                    this.setCell(this.x, this.y, cell.type, cell.level);
                    return temp
                }
            }
        }
        
        // If all else fails, move towards the next target cell in the staircase
        const nextTarget = this.staircase.find(step => {
            const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
            return currentLevel < step.level;
        });
        
        if (nextTarget) {
            console.log("Moving towards next incomplete step");
            temp = this.findSafeMoveTowards.call(this, cell, nextTarget.x, nextTarget.y);
            if (temp && temp !== "none") {
                this.updatePosition(temp);
                this.setCell(this.x, this.y, cell.type, cell.level);
                return temp
            }
        }
        
        // Ultimate fallback - move towards start of staircase
        console.log("Moving towards staircase start");
        temp = this.findSafeMoveTowards.call(this, cell, this.layerStartX, this.layerStartY);
        if (temp && temp !== "none") {
            this.updatePosition(temp);
            this.setCell(this.x, this.y, cell.type, cell.level);
            return temp
        }
    }

    this.buildLaterLevels = function (cell) {
        // First check if we've actually completed all planned steps
        const allStepsComplete = this.staircase.every(step => {
            const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
            return currentLevel >= step.level;
        });
    
        if (allStepsComplete && !this.finalPhase) {
            console.log("N-2 staircase complete, moving to final phase");
            this.finalPhase = true;
            return null;  // Signal completion to turn function
        }
    
        // Get the maximum planned height from our staircase plan
        const maxPlannedLayer = Math.max(...this.staircase.map(step => step.level));
    
        // Find cells that need blocks at current layer
        const targetCells = this.staircase.filter(step => {
            const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
            return step.level >= this.currentLayer && currentLevel === this.currentLayer - 1;
        });
    
        // Only increment layer if we're still within planned height
        if (targetCells.length === 0) {
            if (this.currentLayer < maxPlannedLayer) {
                this.currentLayer++;
                console.log(`Layer ${this.currentLayer - 1} complete, moving to layer ${this.currentLayer}`);
                return null;  // Signal to main turn function to handle next step
            }
            
            // Check if any cells still need more layers
            const incompleteCells = this.staircase.filter(step => {
                const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
                return currentLevel < step.level;
            });
            
            if (incompleteCells.length > 0) {
                // Find the cell with the lowest current level that needs work
                let lowestCell = incompleteCells.reduce((lowest, cell) => {
                    const currentLevel = this.map[`${cell.x},${cell.y}`]?.level || 0;
                    if (!lowest || currentLevel < lowest.currentLevel) {
                        return { cell, currentLevel };
                    }
                    return lowest;
                }, null);
    
                const newLayer = lowestCell.currentLevel + 1;
                if (newLayer !== this.currentLayer) {
                    this.currentLayer = newLayer;
                    console.log(`Resetting to layer ${this.currentLayer} to complete missing steps at (${lowestCell.cell.x}, ${lowestCell.cell.y})`);
                    return null;  // Recheck with new layer
                }
            }
            
            console.log("All planned layers complete, moving to final phase");
            this.finalPhase = true;
            return null;
        }
    
        if (this.carryingBlock) {
            // Find the closest target cell that's at the right level
            let bestTarget = null;
            let shortestPath = null;
            let minDistance = Infinity;
    
            for (let target of targetCells) {
                const path = this.findShortestPath.call(this, this.x, this.y, target.x, target.y);
                if (path && path.length < minDistance) {
                    minDistance = path.length;
                    shortestPath = path;
                    bestTarget = target;
                }
            }
    
            if (bestTarget) {
                // If at target location, drop block
                if (this.x === bestTarget.x && this.y === bestTarget.y) {
                    // console.log(`Dropping block at (${this.x}, ${this.y}) for layer ${this.currentLayer}`);
                    this.carryingBlock = false;
                    this.map[`${this.x},${this.y}`].type = BLOCK;
                    this.map[`${this.x},${this.y}`].level = this.currentLayer;
                    return "drop";
                }
    
                // Move towards target
                if (shortestPath && shortestPath.length > 0) {
                    const nextMove = shortestPath[0];
                    this.updatePosition.call(this, nextMove);
                    return nextMove;
                }
            }
        } else {
            // Find a donor block
            const safeDonor = this.findSafeDonorBlock.call(this);
            if (safeDonor) {
                const { block, path } = safeDonor;
    
                // If at donor location, pick up block
                if (this.x === block.x && this.y === block.y && !this.isStaircaseCell.call(this, block.x, block.y)) {
                    // console.log(`Picking up block at (${this.x}, ${this.y})`);
                    this.carryingBlock = true;
                    this.map[`${this.x},${this.y}`].type = EMPTY;
                    this.map[`${this.x},${this.y}`].level = 0;
                    return "pickup";
                }
    
                // Move towards donor
                if (path && path.length > 0) {
                    const nextMove = path[0];
                    this.updatePosition.call(this, nextMove);
                    return nextMove;
                }
            }
        }
    
        // If we need to find a new donor block, we should return null to let the main turn function handle it
        if (!this.carryingBlock && !this.findSafeDonorBlock.call(this)) {
            console.log("No safe donor block available, signaling for alternative strategy");
            return null;
        }
    
        // If we get here and we're carrying a block but can't find a path to any target,
        // we should try to move towards the nearest target
        if (this.carryingBlock && targetCells.length > 0) {
            let nearestTarget = targetCells.reduce((nearest, cell) => {
                const dist = Math.abs(cell.x - this.x) + Math.abs(cell.y - this.y);
                if (!nearest || dist < nearest.dist) {
                    return { cell, dist };
                }
                return nearest;
            }, null);
    
            if (nearestTarget) {
                console.log(`No direct path found, moving towards nearest target at (${nearestTarget.cell.x}, ${nearestTarget.cell.y})`);
                temp = this.findSafeMoveTowards.call(this, cell, nearestTarget.cell.x, nearestTarget.cell.y);
                if (temp && temp !== "none") {
                    this.updatePosition(temp);
                    this.setCell(this.x, this.y, cell.type, cell.level);
                    return temp
                }
            }
        }
    
        // Ultimate fallback - try to move towards any incomplete step
        const nextIncompleteStep = this.staircase.find(step => {
            const currentLevel = this.map[`${step.x},${step.y}`]?.level || 0;
            return currentLevel < step.level;
        });
    
        if (nextIncompleteStep) {
            console.log(`Moving towards incomplete step at (${nextIncompleteStep.x}, ${nextIncompleteStep.y})`);
            temp = this.findSafeMoveTowards.call(this, cell, nextIncompleteStep.x, nextIncompleteStep.y);
            if (temp && temp !== "none") {
                this.updatePosition(temp);
                this.setCell(this.x, this.y, cell.type, cell.level);
                return temp
            }
        }
    
        // If still no valid move found, return null to let main turn function handle it
        return null;
    }
    
    this.findSafeMoveTowards = function (cell, targetX, targetY) {
        if (!cell) {
            console.error("Invalid cell provided");
            return "none";
        }
    
        if (cell === this.prevCell) {
            this.failedmove++;
            console.warn(`Stuck in the same cell. Failed move count: ${this.failedmove}`);
        } else {
            this.failedmove = 0; // Reset failed move count if position changes
        }
        this.prevCell = cell;
    
        if (this.failedmove > 5) {
            console.error("Failed move limit reached. Attempting to break the loop.");
            // Attempt to move in any random safe direction
            const safeMoves = Object.entries({
                right: cell.right && cell.right.type !== WALL,
                left: cell.left && cell.left.type !== WALL,
                up: cell.up && cell.up.type !== WALL,
                down: cell.down && cell.down.type !== WALL,
            })
            .filter(([_, isSafe]) => isSafe)
            .map(([direction]) => direction);
    
            if (safeMoves.length === 0) {
                console.warn("No valid moves even after fallback — staying put");
                console.log("Returning: none");
                return "none";
            }
    
            const randomFallbackMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
            console.log(`Fallback move to break the loop: ${randomFallbackMove}`);
            return randomFallbackMove;
        }
    
        const dx = targetX - this.x;
        const dy = targetY - this.y;
    
        console.log(`Moving towards (${targetX}, ${targetY})`);
        console.log(`Current position: (${this.x}, ${this.y})`);
        console.log(`dx: ${dx}, dy: ${dy}`);
    
        const directions = {
            right: cell.right && cell.right.type !== WALL,
            left: cell.left && cell.left.type !== WALL,
            up: cell.up && cell.up.type !== WALL,
            down: cell.down && cell.down.type !== WALL,
        };
    
        console.log("Available moves:", directions);
    
        const prioritizedMoves = [];
        if (dx > 0 && directions.right) prioritizedMoves.push("right");
        if (dx < 0 && directions.left) prioritizedMoves.push("left");
        if (dy > 0 && directions.down) prioritizedMoves.push("down");
        if (dy < 0 && directions.up) prioritizedMoves.push("up");
    
        console.log("Prioritized moves:", prioritizedMoves);
    
        if (prioritizedMoves.length > 0) {
            const chosenMove = prioritizedMoves[Math.floor(Math.random() * prioritizedMoves.length)];
            console.log(`Returning prioritized move: ${chosenMove}`);
            return chosenMove;
        }
    
        const safeMoves = Object.entries(directions)
            .filter(([_, isSafe]) => isSafe)
            .map(([direction]) => direction);
    
        if (safeMoves.length === 0) {
            console.warn("No valid moves — staying put");
            console.log("Returning: none");
            return "none";
        }
    
        const fallbackMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
        if (fallbackMove) {
            console.log(`Fallback to random safe move: ${fallbackMove}`);
            console.log(`Returning: ${fallbackMove}`);
            this.updatePosition(fallbackMove);
            return fallbackMove;
        }
    };
    
    

    function buildFinalStep(cell) {
        if (!this.finalStepLocation) {
            console.log("Error: No final step location found!");
            temp = this.findSafeMoveTowards.call(this, cell, this.goldLocation.x, this.goldLocation.y);
            if (temp && temp !== "none") {
                this.updatePosition(temp);
                this.setCell(this.x, this.y, cell.type, cell.level);
                return temp
            }
        }
    
        // Success case - reached gold
        if (this.x === this.goldLocation.x && this.y === this.goldLocation.y && cell.type === GOLD) {
            // We need to keep moving to stay alive
            temp = this.findSafeMoveTowards.call(this, cell, this.x + 1, this.y);
            if (temp && temp !== "none") {
                this.updatePosition(temp);
                this.setCell(this.x, this.y, cell.type, cell.level);
                return temp
            }
        }
    
        const finalStepKey = `${this.finalStepLocation.x},${this.finalStepLocation.y}`;
        const currentFinalLevel = this.map[finalStepKey]?.level || 0;
        const targetFinalLevel = this.goldLocation.level - 1;
    
        if (currentFinalLevel >= targetFinalLevel) {
            // Final step is tall enough, try to reach gold
            const pathToGold = this.findShortestPath.call(this, this.x, this.y, 
                this.goldLocation.x, this.goldLocation.y);
            if (pathToGold && pathToGold.length > 0) {
                const nextMove = pathToGold[0];
                this.updatePosition.call(this, nextMove);
                return nextMove;
            }
            // If no path found, try to move towards gold anyway
            temp = this.findSafeMoveTowards.call(this, cell, this.goldLocation.x, this.goldLocation.y);
            if (temp && temp !== "none") {
                this.updatePosition(temp);
                this.setCell(this.x, this.y, cell.type, cell.level);
                return temp
            }
        }
    
        if (this.carryingBlock) {
            // If at final step location AND at correct level to place next block
            if (this.x === this.finalStepLocation.x && 
                this.y === this.finalStepLocation.y && 
                currentFinalLevel === targetFinalLevel - 1) {
                console.log(`Dropping final block to reach level ${targetFinalLevel}`);
                this.carryingBlock = false;
                this.map[finalStepKey].type = BLOCK;
                this.map[finalStepKey].level = targetFinalLevel;
                return "drop";
            }
    
            // If carrying block but not at drop location, move there
            const pathToFinal = this.findShortestPath.call(this, this.x, this.y, 
                this.finalStepLocation.x, this.finalStepLocation.y);
            if (pathToFinal && pathToFinal.length > 0) {
                const nextMove = pathToFinal[0];
                this.updatePosition.call(this, nextMove);
                return nextMove;
            }
            // If no path found, try to move towards final step anyway
            console.log("No path found to final step, moving towards it");
            temp = this.findSafeMoveTowards.call(this, cell, this.finalStepLocation.x, this.finalStepLocation.y);
            if (temp && temp !== "none") {
                this.updatePosition(temp);
                this.setCell(this.x, this.y, cell.type, cell.level);
                return temp
            }
        } else {
            // Not carrying block - try to find one
            const safeDonor = this.findSafeDonorBlock.call(this);
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
                    this.updatePosition.call(this, nextMove);
                    return nextMove;
                }
            }
            
            // If we can't find a donor block or path to it, move towards any available blocks
            const nearestBlock = this.donorBlocks.reduce((nearest, block) => {
                const dist = Math.abs(block.x - this.x) + Math.abs(block.y - this.y);
                if (!nearest || dist < nearest.dist) {
                    return { block, dist };
                }
                return nearest;
            }, null);
    
            if (nearestBlock) {
                temp = this.findSafeMoveTowards.call(this, cell, nearestBlock.block.x, nearestBlock.block.y);
                if (temp && temp !== "none") {
                    this.updatePosition(temp);
                    this.setCell(this.x, this.y, cell.type, cell.level);
                    return temp
                }
            }
        }
        
        // If all else fails, try to move towards the goal
        console.log("No clear move found, moving towards gold");
        temp = this.findSafeMoveTowards.call(this, cell, this.goldLocation.x, this.goldLocation.y);
        if (temp && temp !== "none") {
            this.updatePosition(temp);
            this.setCell(this.x, this.y, cell.type, cell.level);
            return temp
        }
    }
}