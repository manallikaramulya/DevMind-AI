# DevMind AI
## Persistent-Memory AI Coding Assistant

DevMind AI uses Hindsight Cloud to retain and retrieve project information across sessions.

### Features
- RETAIN: Save project information.
- RECALL: Retrieve stored memories.
- REFLECT: Reason using stored context.
- Chat interface connected to FastAPI.
- Persistent project memory dashboard.

### Technology Stack
- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Python FastAPI
- Memory: Hindsight Cloud

### Setup

1. Clone the repository:
   git clone https://github.com/manallikaramulya/DevMind-AI.git

2. Enter the backend folder:
   cd DevMind-AI/backend

3. Create a virtual environment:
   python -m venv .venv

4. Activate it:
   .venv\Scripts\activate

5. Install dependencies:
   pip install -r requirements.txt

6. Create backend/.env using .env.example and add your Hindsight credentials. Never upload your actual API key.

7. Start the backend:
   python -m uvicorn main:app --reload --port 8000

### Frontend
Open frontend/index.html in your browser.

### API Endpoints
- GET /
- GET /api/health
- POST /api/chat
- POST /api/memory/retain
- POST /api/memory/recall
- POST /api/memory/reflect

### Current Status
The FastAPI backend and Hindsight RETAIN, RECALL and REFLECT operations have been tested. The current chat uses Hindsight REFLECT. A separate coding LLM integration is still pending.

### Future Enhancements
- Coding LLM integration
- Improved memory display
- Verified debugging workflows
- Deployment and expanded testing

Developed as a team project.