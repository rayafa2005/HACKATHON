# RouteMaster — Warehouse Route Optimization & Visualization

RouteMaster is a **warehouse path optimization system** that calculates and visualizes the **shortest route for a warehouse picker to collect items efficiently**.

The system takes a **warehouse grid in JSON format**, finds the **optimal path using algorithms**, and **visualizes the route interactively on a grid UI**.

This project was built for **HackArena 2026 – Logistics / Optimization Challenge**.

---

# 🚀 Problem Statement

In warehouses, workers must move through shelves to pick items for orders.

Without route optimization:

* Workers walk **longer distances**
* Order picking takes **more time**
* Warehouse efficiency decreases

RouteMaster solves this by:

* Calculating the **shortest route**
* Avoiding **obstacles**
* Collecting **multiple targets**
* Visualizing the **optimized path**

---

# 🧠 How the System Works

The system has **three major components**.

### 1️⃣ Input Layer

The user provides a **JSON payload** describing the warehouse layout.

Example:

```json
{
  "grid": [
    [0,0,1],
    [1,0,1],
    [0,2,0]
  ],
  "start": [0,0],
  "targets": [[2,1]]
}
```

Where:

| Value | Meaning          |
| ----- | ---------------- |
| 0     | Walkable space   |
| 1     | Obstacle / shelf |
| 2     | Target item      |

---

### 2️⃣ Backend (FastAPI)

The backend:

* Receives the JSON input
* Runs the **pathfinding algorithm**
* Computes the **optimal path**
* Returns the result as JSON

Example response:

```json
{
  "total_steps": 6,
  "path": [[0,0],[0,1],[1,1],[2,1]],
  "targets_collected": 1
}
```

---

### 3️⃣ Frontend Visualization

The frontend:

* Displays the warehouse grid
* Highlights:

  * Start location
  * Targets
  * Obstacles
  * Path taken
* Animates the picker moving through the warehouse

This helps visually understand the algorithm's output.

---

# 🏗️ System Architecture

```
User Input (JSON)
        │
        ▼
Frontend UI (HTML / CSS / JS)
        │
        ▼
API Request
        │
        ▼
FastAPI Backend
(Pathfinding Algorithm)
        │
        ▼
JSON Response
        │
        ▼
Grid Visualization
```

---

# ⚙️ Technologies Used

### Frontend

* HTML
* CSS
* JavaScript
* Grid-based visualization
* Dynamic DOM rendering

### Backend

* Python
* FastAPI
* Pathfinding Algorithms (BFS / Shortest Path)

### Deployment

* Railway

---

# 📂 Project Structure

```
RouteMaster
│
├── frontend
│   ├── index.html
│   ├── style.css
│   ├── script.js
│
├── backend
│   ├── main.py
│   ├── requirements.txt
│
├── README.md
```

---

# ▶️ Running the Project

### 1️⃣ Run Backend

Install dependencies

```
pip install -r requirements.txt
```

Run FastAPI server

```
uvicorn main:app --reload
```

Backend runs at

```
http://localhost:8000
```

---

### 2️⃣ Run Frontend

Open the frontend folder and start a local server

Example:

```
python -m http.server 5500
```

Then open

```
http://localhost:5500
```

---

# 🎮 How to Use

1. Open the frontend interface
2. Enter the **warehouse JSON**
3. Click **RUN OPTIMIZATION**
4. The system will:

   * Send JSON to backend
   * Calculate optimal route
   * Visualize the path
5. The UI shows:

   * Total steps
   * Targets collected
   * Animated route

---

# 📊 Visualization Legend

| Color  | Meaning          |
| ------ | ---------------- |
| Blue   | Current position |
| Green  | Start point      |
| Yellow | Target           |
| Red    | Obstacle         |
| Cyan   | Path             |

---

# 🌟 Key Features

* JSON based warehouse input
* Real-time grid visualization
* Animated route traversal
* Pathfinding algorithm integration
* Interactive UI
* Copyable result JSON
* Adjustable animation speed

---

# 🎯 Use Cases

* Warehouse order picking optimization
* Robotics path planning
* Logistics simulation
* Algorithm visualization
* Smart warehouse systems

---

# 👥 Team

Developed for **HackArena 2026**

Team members worked on:

* Frontend visualization
* Backend pathfinding
* API integration
* Deployment

---

# 🏁 Future Improvements

* Multiple pickers
* Dynamic obstacle handling
* Real-time warehouse updates
* AI based route optimization
* Large-scale warehouse support

---

# 📜 License

This project was developed for **educational and hackathon purposes**.
