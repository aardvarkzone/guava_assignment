function Stacker() {
    const originalLog = console.log;
    console.log = function(msg) {
        originalLog(msg);
    };

    const EMPTY = 0, WALL = 1, BLOCK = 2, GOLD = 3;

    // Position tracking
    this.x = 0;
    this.y = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.lastMove = null;
    this.phase = "explore";

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

    function recordVisibleCells(cell) {
        setCell.call(this, this.x, this.y, cell.type, cell.level);

        if (cell.left) {
            setCell.call(this, this.x - 1, this.y, cell.left.type, cell.left.level);
            if (cell.left.type === GOLD && !this.goldLocation) {
                this.goldLocation = {x: this.x - 1, y: this.y, level: cell.left.level};
                console.log(`Found gold at (${this.x - 1}, ${this.y}), level ${cell.left.level}`);
            }
        }
        if (cell.right) {
            setCell.call(this, this.x + 1, this.y, cell.right.type, cell.right.level);
            if (cell.right.type === GOLD && !this.goldLocation) {
                this.goldLocation = {x: this.x + 1, y: this.y, level: cell.right.level};
                console.log(`Found gold at (${this.x + 1}, ${this.y}), level ${cell.right.level}`);
            }
        }
        if (cell.up) {
            setCell.call(this, this.x, this.y - 1, cell.up.type, cell.up.level);
            if (cell.up.type === GOLD && !this.goldLocation) {
                this.goldLocation = {x: this.x, y: this.y - 1, level: cell.up.level};
                console.log(`Found gold at (${this.x}, ${this.y - 1}), level ${cell.up.level}`);
            }
        }
        if (cell.down) {
            setCell.call(this, this.x, this.y + 1, cell.down.type, cell.down.level);
            if (cell.down.type === GOLD && !this.goldLocation) {
                this.goldLocation = {x: this.x, y: this.y + 1, level: cell.down.level};
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
        let queue = [{x: fromX, y: fromY, path: []}];
        let visited = {};
        visited[`${fromX},${fromY}`] = true;

        while (queue.length > 0) {
            let current = queue.shift();
            
            if (current.x === toX && current.y === toY) {
                return current.path;
            }

            const directions = [
                {dx: -1, dy: 0, move: "left"},
                {dx: 1, dy: 0, move: "right"},
                {dx: 0, dy: -1, move: "up"},
                {dx: 0, dy: 1, move: "down"}
            ];

            for (let dir of directions) {
                const nextX = current.x + dir.dx;
                const nextY = current.y + dir.dy;
                const nextKey = `${nextX},${nextY}`;

                const nextCell = this.map[nextKey];
                if (visited[nextKey] || (nextCell && nextCell.type === WALL)) {
                    continue;
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

    function findClosestDonorBlock(fromX, fromY) {
        let closestBlock = null;
        let shortestPath = null;
        let shortestLength = Infinity;

        for (let donor of this.donorBlocks) {
            const path = findShortestPath.call(this, fromX, fromY, donor.x, donor.y);
            if (path && path.length < shortestLength) {
                shortestLength = path.length;
                shortestPath = path;
                closestBlock = donor;
            }
        }

        return {block: closestBlock, path: shortestPath, distance: shortestLength};
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

    function findDropLocation() {
        if (!this.goldLocation) return null;

        // Check cells adjacent to gold
        const adjacentCells = [
            {x: this.goldLocation.x - 1, y: this.goldLocation.y},
            {x: this.goldLocation.x + 1, y: this.goldLocation.y},
            {x: this.goldLocation.x, y: this.goldLocation.y - 1},
            {x: this.goldLocation.x, y: this.goldLocation.y + 1}
        ];

        for (let cell of adjacentCells) {
            const mapCell = this.map[`${cell.x},${cell.y}`];
            // If cell is empty or we haven't seen it yet (assumed empty)
            if (!mapCell || (mapCell.type === EMPTY && mapCell.level === 0)) {
                const path = findShortestPath.call(this, this.x, this.y, cell.x, cell.y);
                if (path) {
                    console.log(`Found suitable drop location at (${cell.x}, ${cell.y})`);
                    return { location: cell, path: path };
                }
            }
        }
        return null;
    }

    this.turn = function(cell) {
        recordVisibleCells.call(this, cell);
    
        // If we're heading to our first block and haven't found it yet
        if (!this.carryingBlock && this.pathToFirstBlock && this.pathToFirstBlock.length > 0) {
            const nextMove = this.pathToFirstBlock.shift();
            updatePosition.call(this, nextMove);
            return nextMove;
        }
    
        // If we're at the first block we found and haven't picked it up yet
        if (!this.carryingBlock && cell.type === BLOCK && cell.level >= 1 && 
            this.firstBlockSeen && !this.firstBlockDropped &&
            this.donorBlocks.some(b => b.x === this.x && b.y === this.y)) {
            console.log(`Picking up first block at (${this.x}, ${this.y})`);
            this.carryingBlock = true;
            return "pickup";
        }
    
        // If we have gold location and are carrying block, plan drop location
        if (this.carryingBlock && this.goldLocation && !this.firstBlockDropped && !this.pathToDropLocation) {
            const dropLocation = findDropLocation.call(this);
            if (dropLocation) {
                this.pathToDropLocation = dropLocation.path;
                console.log(`Planning to drop first block at (${dropLocation.location.x}, ${dropLocation.location.y})`);
            }
        }
    
        // If we're moving to drop location
        if (this.pathToDropLocation && this.pathToDropLocation.length > 0) {
            const nextMove = this.pathToDropLocation.shift();
            updatePosition.call(this, nextMove);
            return nextMove;
        }
    
        // If we're at the drop location with the first block
        if (this.carryingBlock && this.pathToDropLocation && this.pathToDropLocation.length === 0) {
            console.log(`Dropping first block at (${this.x}, ${this.y})`);
            this.carryingBlock = false;
            this.firstBlockDropped = true;
            this.pathToDropLocation = null;
            this.pathToDonor = null;
            this.targetDonorBlock = null;
            
            // Key change: Remove this location from possible donor blocks when we drop here
            const dropKey = `${this.x},${this.y}`;
            this.donorBlocks = this.donorBlocks.filter(b => b.x !== this.x || b.y !== this.y);
            
            return "drop";
        }
    
        // After dropping first block, find path to nearest donor FROM OUR CURRENT POSITION
        // Exclude our drop location and donorBlocks with level 0
        if (this.firstBlockDropped && !this.pathToDonor) {
            const validDonors = this.donorBlocks.filter(b => {
                const mapCell = this.map[`${b.x},${b.y}`];
                return mapCell && mapCell.type === BLOCK && mapCell.level > 0;
            });
            
            if (validDonors.length > 0) {
                let closestToCurrent = null;
                let shortestDistance = Infinity;
                
                for (let donor of validDonors) {
                    const path = findShortestPath.call(this, this.x, this.y, donor.x, donor.y);
                    if (path && path.length < shortestDistance) {
                        closestToCurrent = { block: donor, path: path };
                        shortestDistance = path.length;
                    }
                }
                
                if (closestToCurrent) {
                    console.log(`Found path to next valid donor block at (${closestToCurrent.block.x}, ${closestToCurrent.block.y}), path length: ${closestToCurrent.path.length}`);
                    this.targetDonorBlock = closestToCurrent.block;
                    this.pathToDonor = closestToCurrent.path;
                }
            }
        }
    
        // If we've reached target donor block
        if (this.targetDonorBlock && 
            this.x === this.targetDonorBlock.x && 
            this.y === this.targetDonorBlock.y) {
            if (!this.carryingBlock && cell.type === BLOCK && cell.level >= 1) {
                console.log(`Picking up block at donor location (${this.x}, ${this.y})`);
                this.carryingBlock = true;
                return "pickup";
            }
            return "none";
        }
    
        // If we're heading to donor block
        if (this.pathToDonor && this.pathToDonor.length > 0) {
            const nextMove = this.pathToDonor.shift();
            updatePosition.call(this, nextMove);
            return nextMove;
        }
    
        // Default exploration behavior
        const move = getNextMove.call(this, cell);
        updatePosition.call(this, move);
        return move;
    };
}