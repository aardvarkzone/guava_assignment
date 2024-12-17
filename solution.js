function Stacker(){

var
EMPTY = 0,
WALL = 1,
BLOCK = 2,
GOLD = 3;

// Replace this with your own wizardry
this.turn = function(cell){
	
	// Pick an action randomly
	var n = Math.random() * 6 >> 0;
	if (n == 0) return "left";
	if (n == 1) return "up";
	if (n == 2) return "right";
	if (n == 3) return "down";
	if (n == 4) return "pickup";
	if (n == 5) return "drop";
}

// More wizardry here

}