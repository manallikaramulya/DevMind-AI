from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
import os
from hindsight_client import Hindsight

load_dotenv(Path(__file__).resolve().parent / ".env")

BANK_ID = os.environ["HINDSIGHT_BANK_ID"]

client = Hindsight(
    base_url=os.environ["HINDSIGHT_BASE_URL"],
    api_key=os.environ["HINDSIGHT_API_KEY"]
)

app = FastAPI(
    title="DevMind AI Backend",
    description="Persistent-Memory AI Coding Assistant",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

class MemoryRequest(BaseModel):
    content: str

class QueryRequest(BaseModel):
    query: str

@app.get("/")
def read_root():
    return {"project": "DevMind AI", "status": "ready"}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "hindsight": "connected"}

@app.post("/api/memory/retain")
def retain_memory(request: MemoryRequest):
    try:
        client.retain(bank_id=BANK_ID, content=request.content)
        return {"status": "success", "message": "Memory saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/memory/recall")
def recall_memory(request: QueryRequest):
    try:
        result = client.recall(bank_id=BANK_ID, query=request.query)
        return {
            "status": "success",
            "memories": [str(item) for item in result.results],
            "count": len(result.results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/memory/reflect")
def reflect_memory(request: QueryRequest):
    try:
        result = client.reflect(bank_id=BANK_ID, query=request.query)
        return {"status": "success", "answer": result.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
def chat_endpoint(request: QueryRequest):
    try:
        result = client.reflect(bank_id=BANK_ID, query=request.query)
        return {"reply": result.text, "memory_status": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
