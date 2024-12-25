initial thoughts: 
- graph traversal
- explore paths until you find the highest elevation - gold
- detect if a move is valid based on type/level
- possible algos: BFS or shortest path?

defining graph logic: 
- option 1 - consider cost of a move (number of moves) and remaining distance to gold
- option 2 - could treat as a weighted graph problem - weights are heigh differences
    - moving between cells incurs a cost, can only move if height diff is <= 1
    - makes problem finding shortest path in weighted grid

a* algo: 
- used https://www.redblobgames.com/pathfinding/a-star/introduction.html to refresh on algo 
- think bfs with cost algo (cost = cost to reach node + estimate of node to gold)
    - f(n) = g(n) + h(n)
        - f(n) = cost
        - g(n) = cost to reach node (accumulated/running sum)
            - ensures real costs are minimized
            - flat moves have a cost of 1
            - up/down cost 2 (only if height diff <= 1)
        - h(n) = heuristic estimate to reach gold
            - good way to proceed decision making
            - use manhattan distance: h(n) = |x - x_gold| + |y - y_gold|
- faster than BFS because prioritizes low cost paths but still ensures validity

- thoughts for implementation:
    - priority queue: add nodes based on lowest f(n) cost
    - visited set: track explored nodes to avoid revisits
    - need to backtrack/reconstruct to path 
    - need to find the highest value first as the goal

- final summary: 
    - input: grid map with nodes and height differences (edges)
    - output - shortest path
    - priority queue for lowest cost
    - move valid check based on type and height difference
    - cost func: f(n)=g(n)+ manhattan
    - path reconstruction
    - find goal 
