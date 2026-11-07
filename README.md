# DevMind AI – Persistent-Memory AI Coding & Debugging Assistant

DevMind AI is an AI-powered coding and debugging assistant built for developers. Unlike typical session-bound chat models, DevMind retains persistent memory of your project's codebase, past bugs, architectural choices, and context across sessions.

---

## 📁 Project Structure

```text
DevMindAI/
├── frontend/
│   ├── index.html       # Main UI structure (sidebar for memory, chat workspace)
│   ├── style.css        # Modern developer dark-theme styles
│   └── script.js        # Vanilla JS for user interaction & backend communication
│
├── backend/
│   ├── main.py          # FastAPI application entry point with CORS & starter endpoints
│   ├── requirements.txt # Python package dependencies (FastAPI, Uvicorn, etc.)
│   └── .env.example     # Template for configuration & API keys
│
├── .gitignore           # Ignores virtual environments, secrets, databases, and cache
└── README.md            # Project documentation and setup guide
```

---

## 🚀 Overview of Components

### 1. Frontend (`frontend/`)
- **`index.html`**: A two-panel layout featuring an active persistent memory sidebar and a primary coding/debugging assistant chat area.
- **`style.css`**: Responsive styling featuring a dark theme suited for developers.
- **`script.js`**: Handles user input, queries the backend health and chat APIs, and dynamically updates the chat view without any heavy frontend frameworks.

### 2. Backend (`backend/`)
- **`main.py`**: A lightweight Python FastAPI server with CORS enabled. It provides starter endpoints:
  - `GET /` — API root information
  - `GET /api/health` — Health check endpoint used by the frontend
  - `POST /api/chat` — Starter chat/query endpoint ready for LLM & memory engine integration
- **`requirements.txt`**: Minimal requirements file listing `fastapi`, `uvicorn`, `pydantic`, and `python-dotenv`.
- **`.env.example`**: Outlines keys for AI model providers and persistent memory storage.

---

## 🛠️ Getting Started (When Ready to Run)

### Backend Setup
1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend Setup
Open `frontend/index.html` directly in your browser or serve it using any simple local server (such as VS Code Live Server or `python -m http.server`).
