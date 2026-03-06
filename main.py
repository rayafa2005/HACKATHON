import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from algorithm import astar

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SolveRequest(BaseModel):
    grid:    List[List[int]]
    start:   List[int]
    targets: List[List[int]]

class SolveResponse(BaseModel):
    total_steps:       int
    path:              List[List[int]]
    target_reached:    bool
    execution_time_ms: int

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    grid   = req.grid
    start  = req.start
    target = req.targets[0]

    rows = len(grid)
    cols = len(grid[0])

    sr, sc = start
    tr, tc = target

    if not (0 <= sr < rows and 0 <= sc < cols):
        raise HTTPException(status_code=400, detail=f"start {start} is outside the grid")
    if not (0 <= tr < rows and 0 <= tc < cols):
        raise HTTPException(status_code=400, detail=f"target {target} is outside the grid")

    # FIX: reject if start or target is a wall
    if grid[sr][sc] == 1:
        raise HTTPException(status_code=400, detail=f"start {start} is on a wall")
    if grid[tr][tc] == 1:
        raise HTTPException(status_code=400, detail=f"target {target} is on a wall")

    t0   = time.perf_counter()
    path = astar(grid, start, target)
    t1   = time.perf_counter()
    ms   = int((t1 - t0) * 1000)

    if path is None:
        return SolveResponse(total_steps=0, path=[], target_reached=False, execution_time_ms=ms)

    return SolveResponse(
        total_steps=len(path) - 1,
        path=path,
        target_reached=True,
        execution_time_ms=round((t1 - t0) * 1000, 3)
    )
