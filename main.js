// Maze generation code

var canvas = document.getElementById('grid');
var ctx = canvas.getContext('2d');
var grid = null; // todo move to RectangularMaze class

function scaleXY(x, y) {
    let rowSize = canvas.height / grid.nrows;
    let colSize = canvas.width / grid.ncols;
    return [x / colSize, y / rowSize];
}

function getXY(e) {
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    return scaleXY(x, y).map(Math.floor);
};

function validateXY(x, y) {
    if (x < 0 || x >= grid.ncols || y < 0 || y >= grid.nrows) {
        return false;
    }
    return true;
};

document.addEventListener("mousedown", function(e1) {
    if (grid == null)
        return;

    let [xStart, yStart] = getXY(e1);
    console.log(`x-start: ${xStart}, y-start: ${yStart}`);
    if (validateXY(xStart, yStart)) {
        document.addEventListener("mouseup", function(e2) {
            let [xEnd, yEnd] = getXY(e2);
            console.log(`x-end: ${xEnd}, y-end: ${yEnd}`);
            if (validateXY(xEnd, yEnd)) {
                let path = solve(xStart, yStart, xEnd, yEnd);
                if (path !== null) {
                    console.log("Found path");
                    drawPath(ctx, path);
                }
                else {
                    console.log("Path not found");
                }
            }
        }, {"once": true});
    }
});


function solve(xStart, yStart, xEnd, yEnd) {

    for (let row of grid) {
        for (let cell of row) {
            cell.visited = false;
            cell.dist = Infinity;
        }
    }
    grid[yStart][xStart].dist = 0;
    grid[yStart][xStart].visited = true;
    grid[yStart][xStart].prev = null;

    function cost(cell) {
        // let heuristic = Math.sqrt((cell.x-xEnd)**2 + (cell.y-yEnd)**2);
        let heuristic = 0;
        return cell.dist + heuristic;
    };

    let pq = new buckets.PriorityQueue((cellA, cellB) => {
        costA = cost(cellA);
        costB = cost(cellB);
        if (costA > costB) { // cellA has lower priority
            return -1;
        }
        else if (costA < costB) { // cellA has higher priority
            return 1;
        }
        else {
            return 0;
        }
    });
    pq.add(grid[yStart][xStart]);

    while (!pq.isEmpty()) {
        let cell = pq.dequeue();
        if (cell.x === xEnd && cell.y === yEnd) {
            return getPath(cell);
        }
        for (let neighbor of RectangularMaze.getNeighbors(grid, cell)) {
            if (!hasWall(cell, neighbor)) {
                neighbor.dist = cell.dist + 1;
                neighbor.visited = true;
                neighbor.prev = cell;
                pq.add(neighbor);
            }
        }
    }

    return null;
};

function getPath(destCell) {
    let path = [];
    for (let cell = destCell; cell !== null; cell = cell.prev) {
        path.push(cell);
    }
    return path.reverse();
};

function drawPath(ctx, path) {
    path.slice(0, -1).forEach((fromCell, i) => {
        let toCell = path[i+1];
        let rowScale = ctx.canvas.height / grid.nrows;
        let colScale = ctx.canvas.width / grid.ncols;
        let [x1, x2] = [fromCell.x+0.5, toCell.x+0.5].map((x) => x * colScale);
        let [y1, y2] = [fromCell.y+0.5, toCell.y+0.5].map((y) => y * rowScale);
        drawLine(ctx, x1, y1, x2, y2, 'red');
    });
};

function generateMaze() {
    let nrows = Number(document.getElementById('nrows').value);
    let ncols = Number(document.getElementById('ncols').value);
    console.log(`nrows: ${nrows}`);
    console.log(`ncols: ${ncols}`);
    ctx.canvas.width = window.innerWidth*0.5;
    ctx.canvas.height = window.innerHeight*0.5;
    let rowScale = ctx.canvas.height / nrows;
    let colScale = ctx.canvas.width / ncols;
    grid = RectangularMaze.generate(nrows, ncols);
    drawGrid(ctx, grid, rowScale, colScale);
};

function drawLine(ctx, x1, y1, x2, y2, color='black') {
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.strokeStyle = color;
    ctx.stroke();
};

function drawGrid (ctx, grid, rowScale, colScale) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y=0; y < grid.nrows; y += 1) {
        for (let x=0; x < grid.ncols; x += 1) {
            grid[y][x].drawWalls(ctx, rowScale, colScale);
        }
    }
};

class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.visited = false;
        this.topWall = true;
        this.bottomWall = true;
        this.leftWall = true;
        this.rightWall = true;
    };

    get notVisited() {
        return !(this.visited);
    };

    drawWalls(ctx, rowScale=1.0, colScale=1.0) {
        if (this.topWall) {
            drawLine(ctx, this.x*colScale, this.y*rowScale, (this.x+1)*colScale, this.y*rowScale);
        }
        if (this.bottomWall) {
            drawLine(ctx, this.x*colScale, (this.y+1)*rowScale, (this.x+1)*colScale, (this.y+1)*rowScale);
        }
        if (this.leftWall) {
            drawLine(ctx, this.x*colScale, this.y*rowScale, this.x*colScale, (this.y+1)*rowScale);
        }
        if (this.rightWall) {
            drawLine(ctx, (this.x+1)*colScale, this.y*rowScale, (this.x+1)*colScale, (this.y+1)*rowScale);
        }
    };
};

const Direction = {
    Up: 'Up',
    Down: 'Down',
    Left: 'Left',
    Right: 'Right'
};

function getDirection(fromCell, toCell) {
    let dx = toCell.x - fromCell.x;
    let dy = toCell.y - fromCell.y;
    if (dx == 1 && dy == 0) {
        return Direction.Right;
    }
    else if (dx == -1 && dy == 0) {
        return Direction.Left;
    }
    else if (dy == 1 && dx == 0) {
        return Direction.Down;
    }
    else if (dy == -1 && dx == 0) {
        return Direction.Up;
    }
    else {
        throw new Error(`Cells are not neighbors, dx=${dx}, dy=${dy}`);
    }
};

function removeWall(fromCell, toCell) {
    switch (getDirection(fromCell, toCell)) {
        case Direction.Up:
            fromCell.topWall = false;
            toCell.bottomWall = false;
            break;
        case Direction.Down:
            fromCell.bottomWall = false;
            toCell.topWall = false;
            break;
        case Direction.Left:
            fromCell.leftWall = false;
            toCell.rightWall = false;
            break;
        case Direction.Right:
            fromCell.rightWall = false;
            toCell.leftWall = false;
            break;
        default:
            throw new Error('Unknown direction');
    }
};

function hasWall(fromCell, toCell) {
    switch (getDirection(fromCell, toCell)) {
        case Direction.Up:
            return (fromCell.topWall || toCell.bottomWall);
            break;
        case Direction.Down:
            return (fromCell.bottomWall || toCell.topWall);
            break;
        case Direction.Left:
            return (fromCell.leftWall || toCell.rightWall);
            break;
        case Direction.Right:
            return (fromCell.rightWall || toCell.leftWall);
            break;
        default:
            throw new Error('Unknown direction');
    }
};

function range(size) {
    return [...Array(size).keys()];
};

class RectangularMaze {
 
    static generate(nrows, ncols) {
        // Use randomized depth-first search algo
        let grid = RectangularMaze.initGrid(nrows, ncols);
        let stack = [];

        let rx = Math.floor(Math.random()*ncols);
        let ry = Math.floor(Math.random()*nrows);
        console.log(`rx: ${rx}`);
        console.log(`ry: ${ry}`);
        let current_cell = grid[ry][rx];
        current_cell.visited = true;

        stack.push(current_cell);
        
        while (stack.length > 0) {
            current_cell = stack.pop();
            let neighbor = RectangularMaze.getRandNeighbor(grid, current_cell);
            if (neighbor) {
                stack.push(current_cell);
                removeWall(current_cell, neighbor);
                neighbor.visited = true;
                stack.push(neighbor);
            }
        }

        return grid;
    };
    
    static initGrid(nrows, ncols) {
        let grid = Array.from(range(nrows), (y) => Array.from(range(ncols), (x) => new Cell(x,y)));
        grid.nrows = nrows;
        grid.ncols = ncols;
        return grid;
    };

    static getNeighbors(grid, cell) {
        let x = cell.x;
        let y = cell.y;
        let neighbors = [];
        if (y > 0 && grid[y-1][x].notVisited) {
            neighbors.push(grid[y-1][x]);
        }
        if (y < grid.nrows-1 && grid[y+1][x].notVisited) {
            neighbors.push(grid[y+1][x]);
        }
        if (x > 0 && grid[y][x-1].notVisited) {
            neighbors.push(grid[y][x-1]);
        }
        if (x < grid.ncols-1 && grid[y][x+1].notVisited) {
            neighbors.push(grid[y][x+1]);
        }
        return neighbors;
    };

    static getRandNeighbor(grid, cell) {
        let neighbors = RectangularMaze.getNeighbors(grid, cell);
        if (neighbors.length > 0) {
            return neighbors[neighbors.length * Math.random() << 0];
        }
        else {
            return null;
        }
    };
};


generateMaze();
