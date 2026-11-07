from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="DevMind AI Backend",
    description="Persistent-Memory AI Coding & Debugging Assistant API",
    version="0.1.0",
)

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    memory_status: str = "initialized"


@app.get("/")
def read_root():
    return {
        "project": "DevMind AI",
        "status": "ready",
        "description": "Persistent-Memory AI Coding & Debugging Assistant",
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "DevMind AI Backend"}


@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    # Basic starter response (to be connected to LLM and persistent memory store)
    return ChatResponse(
        reply=f"Received: '{request.message}'. Persistent memory engine will process this query once LLM integration is connected.",
        memory_status="ready",
    )
