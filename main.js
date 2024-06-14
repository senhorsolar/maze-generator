// Maze generation code

const controller = new AbortController();

function generateMaze() {

    // Remove nested event listeners
    //controller.abort();

    var grid_canvas = document.getElementById('grid');
    var grid_ctx = grid_canvas.getContext('2d');
    var path_canvas = document.getElementById('solution');
    var path_ctx = path_canvas.getContext('2d');

    grid_ctx.canvas.width = window.innerWidth * .8;
    grid_ctx.canvas.height = window.innerHeight * .8;
    path_ctx.canvas.width = window.innerWidth * .8;
    path_ctx.canvas.height = window.innerHeight * .8;

    let nrows = Number(document.getElementById('nrows').value);
    let ncols = Number(document.getElementById('ncols').value);
    console.log(`nrows: ${nrows}`);
    console.log(`ncols: ${ncols}`);

    let rowScale = grid_ctx.canvas.height / nrows;
    let colScale = grid_ctx.canvas.width / ncols;
    let grid = RectangularMaze.generate(nrows, ncols);
    RectangularMaze.drawGrid(grid_ctx, grid, rowScale, colScale);

    function clickStartHandler(e1) {

        let [xStart, yStart] = getXY(grid_canvas, grid, e1);
        console.log(`x-start: ${xStart}, y-start: ${yStart}`);

        if (!validateXY(grid, xStart, yStart))
            return;

        function clickEndHandler(e2) {

            let [xEnd, yEnd] = getXY(grid_canvas, grid, e2);
            console.log(`x-end: ${xEnd}, y-end: ${yEnd}`);

            if (!validateXY(grid, xEnd, yEnd))
                return;

            let path = RectangularMaze.solve(grid, xStart, yStart, xEnd, yEnd);
            if (path !== null) {
                console.log("Found path");
                RectangularMaze.drawPath(path_ctx, grid, path);
            }
            else {
                console.log("Path not found");
            }
        };

        document.addEventListener("pointerup", clickEndHandler, {"once": true});
    };

    document.addEventListener("pointerdown", clickStartHandler, {"signal": controller.signal});
};

function getXY(canvas, grid, e) {
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let rowSize = canvas.height / grid.nrows;
    let colSize = canvas.width / grid.ncols;
    return [Math.floor(x / colSize), Math.floor(y / rowSize)];
};

function validateXY(grid, x, y) {
    if (x < 0 || x >= grid.ncols || y < 0 || y >= grid.nrows) {
        return false;
    }
    return true;
};

function drawLine(ctx, x1, y1, x2, y2, color='black') {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.strokeStyle = color;
    ctx.stroke();
};

function drawDot(ctx, x, y, radius, color='black') {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2*Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    // ctx.strokeStyle = color;
    ctx.stroke();
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

    getWalls() {
        let walls = [];
        if (this.topWall) {
            walls.push([this.x, this.y, this.x+1, this.y]);
        }
        if (this.bottomWall) {
            walls.push([this.x, this.y+1, this.x+1, this.y+1]);
        }
        if (this.leftWall) {
            walls.push([this.x, this.y, this.x, this.y+1]);
        }
        if (this.rightWall) {
            walls.push([this.x+1, this.y, this.x+1, this.y+1]);
        }
        return walls;
    };

    drawWalls(ctx, rowScale=1.0, colScale=1.0) {
        for (let [x1, y1, x2, y2] of this.getWalls()) {
            drawLine(ctx, x1*colScale, y1*rowScale, x2*colScale, y2*rowScale);
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

class RectangularMaze {

    static removeWall(fromCell, toCell) {
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

    static hasWall(fromCell, toCell) {
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
                RectangularMaze.removeWall(current_cell, neighbor);
                neighbor.visited = true;
                stack.push(neighbor);
            }
        }

        return grid;
    };
    
    static initGrid(nrows, ncols) {
        const range = (size) => [...Array(size).keys()];
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

    static drawGrid (ctx, grid, rowScale, colScale) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        let walls = new Set();
        for (let y=0; y < grid.nrows; y += 1) {
            for (let x=0; x < grid.ncols; x += 1) {
                for (let wall of grid[y][x].getWalls()) {
                    walls.add(JSON.stringify(wall));
                }
                //grid[y][x].drawWalls(ctx, rowScale, colScale);
            }
        }
        walls.forEach((wall) => {
            let [x1, y1, x2, y2] = JSON.parse(wall);
            drawLine(ctx, x1*colScale, y1*rowScale, x2*colScale, y2*rowScale);
        });
    };

    static solve(grid, xStart, yStart, xEnd, yEnd) {

        if (!validateXY(grid, xStart, yStart) || !validateXY(grid, xEnd, yEnd)) {
            return null;
        }

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
            let heuristic = Math.sqrt((cell.x-xEnd)**2 + (cell.y-yEnd)**2);
            //let heuristic = 0;
            return cell.dist + heuristic;
        };

        let pq = new buckets.PriorityQueue((cellA, cellB) => {
            let costA = cost(cellA);
            let costB = cost(cellB);
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
                let path = [];
                for (let _cell = cell; _cell !== null; _cell = _cell.prev) {
                    path.push(_cell);
                }
                return path.reverse();
            }
            for (let neighbor of RectangularMaze.getNeighbors(grid, cell)) {
                if (!RectangularMaze.hasWall(cell, neighbor)) {
                    neighbor.dist = cell.dist + 1;
                    neighbor.visited = true;
                    neighbor.prev = cell;
                    pq.add(neighbor);
                }
            }
        }

        return null;
    };

    static drawPath(ctx, grid, path) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        path.slice(0, -1).forEach((fromCell, i) => {
            let toCell = path[i+1];
            let rowScale = ctx.canvas.height / grid.nrows;
            let colScale = ctx.canvas.width / grid.ncols;
            let [x1, x2] = [fromCell.x+0.5, toCell.x+0.5].map((x) => x * colScale);
            let [y1, y2] = [fromCell.y+0.5, toCell.y+0.5].map((y) => y * rowScale);
            drawLine(ctx, x1, y1, x2, y2, 'red');
            if (i === 0) {
                drawDot(ctx, x1, y1, Math.min(rowScale/4, colScale/4), 'red');
            }
            if (i+2 === path.length) {
                drawDot(ctx, x2, y2, Math.min(rowScale/4, colScale/4), 'red');
            }
        });
    };
};

function main() {
    generateMaze();

    function enterKey(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            document.getElementById("button").click();
        }
    };
    document.getElementById("nrows").addEventListener("keypress", enterKey);
    document.getElementById("ncols").addEventListener("keypress", enterKey);
};

main();
