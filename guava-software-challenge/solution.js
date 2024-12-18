function Stacker() {
    const originalLog = console.log;
    console.log = function(msg) {
        originalLog(msg);
    };
    console.log("Stacker loaded");

    const EMPTY = 0, WALL = 1, BLOCK = 2, GOLD = 3;

    this.goldFound = false;
    this.goldDirection = null;
    this.goldLevel = 0;
    
    this.lastPosition = null; 
    this.lastMove = null;      
    this.currentPosition = {x: 0, y: 0};

    function getOppositeDirection(direction) {
        const opposites = {
            'left': 'right',
            'right': 'left',
            'up': 'down',
            'down': 'up'
        };
        return opposites[direction];
    }

    function didMoveSucceed(newCell) {
        if (!this.lastPosition) {
            return true; 
        }
        return (this.lastPosition.x !== newCell.x || this.lastPosition.y !== newCell.y);
    }

    function getAvailableMoves(cell) {
        const moves = [];
        
        if (cell.left?.type !== WALL) moves.push('left');
        if (cell.right?.type !== WALL) moves.push('right');
        if (cell.up?.type !== WALL) moves.push('up');
        if (cell.down?.type !== WALL) moves.push('down');

        if (this.lastMove && didMoveSucceed.call(this, cell)) {
            const oppositeMove = getOppositeDirection(this.lastMove);
            const index = moves.indexOf(oppositeMove);
            if (index > -1) {
                moves.splice(index, 1);
            }
        }

        return moves;
    }

    this.turn = function(cell) {
        this.lastPosition = {...this.currentPosition};
        this.currentPosition = {x: cell.x, y: cell.y};

        if (cell.left?.type === GOLD && !this.goldFound) {
            console.log("Gold spotted to the left!");
            this.goldFound = true;
            this.goldDirection = "left";
            this.goldLevel = cell.left.level;
            console.log(`Gold is at level ${this.goldLevel}`);
            if (cell.right?.type === BLOCK && cell.right.level === 1) console.log("Found level 1 block to right");
            if (cell.up?.type === BLOCK && cell.up.level === 1) console.log("Found level 1 block above");
            if (cell.down?.type === BLOCK && cell.down.level === 1) console.log("Found level 1 block below");
        }
        if (cell.right?.type === GOLD && !this.goldFound) {
            console.log("Gold spotted to the right!");
            this.goldFound = true;
            this.goldDirection = "right";
            this.goldLevel = cell.right.level;
            console.log(`Gold is at level ${this.goldLevel}`);
            if (cell.left?.type === BLOCK && cell.left.level === 1) console.log("Found level 1 block to left");
            if (cell.up?.type === BLOCK && cell.up.level === 1) console.log("Found level 1 block above");
            if (cell.down?.type === BLOCK && cell.down.level === 1) console.log("Found level 1 block below");
        }
        if (cell.up?.type === GOLD && !this.goldFound) {
            console.log("Gold spotted above!");
            this.goldFound = true;
            this.goldDirection = "up";
            this.goldLevel = cell.up.level;
            console.log(`Gold is at level ${this.goldLevel}`);
            if (cell.left?.type === BLOCK && cell.left.level === 1) console.log("Found level 1 block to left");
            if (cell.right?.type === BLOCK && cell.right.level === 1) console.log("Found level 1 block to right");
            if (cell.down?.type === BLOCK && cell.down.level === 1) console.log("Found level 1 block below");
        }
        if (cell.down?.type === GOLD && !this.goldFound) {
            console.log("Gold spotted below!");
            this.goldFound = true;
            this.goldDirection = "down";
            this.goldLevel = cell.down.level;
            console.log(`Gold is at level ${this.goldLevel}`);
            if (cell.left?.type === BLOCK && cell.left.level === 1) console.log("Found level 1 block to left");
            if (cell.right?.type === BLOCK && cell.right.level === 1) console.log("Found level 1 block to right");
            if (cell.up?.type === BLOCK && cell.up.level === 1) console.log("Found level 1 block above");
        }

        if (this.goldFound) {
            return "none";
        }

        const availableMoves = getAvailableMoves.call(this, cell);
        if (availableMoves.length === 0) {
            this.lastMove = null;
            return ["up", "down", "left", "right"][Math.floor(Math.random() * 4)];
        }
        
        this.lastMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        return this.lastMove;
    };
}