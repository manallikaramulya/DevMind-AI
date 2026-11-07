from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
import os
import json
import urllib.request
import urllib.error
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

def memory_text(item):
    # Pull clean text out of a Hindsight recall result
    text = getattr(item, "text", None)
    return text if text else str(item)


@app.post("/api/chat")
def chat_endpoint(request: QueryRequest):
    query_lower = request.query.lower()

    has_code = any(
        word in query_lower
        for word in ["print(", "def ", " = ", "import ", "return "]
    )

    if "nameerror" in query_lower and not has_code:
        return {
            "reply": "Please share your exact NameError message and the relevant Python code so I can debug it accurately.",
            "memory_status": "connected",
            "memory_count": 0,
            "memories_used": [],
            "model": "qwen2.5-coder:1.5b"
        }

    try:
        import re
        match = re.search(r"(\w+Error)", request.query)
        error_type = match.group(1) if match else ""
        recall_query = f"{error_type} fixed resolved by" if error_type else request.query[:300]

        memory_result = client.recall(
            bank_id=BANK_ID,
            query=recall_query
        )

        all_memories = [memory_text(item) for item in memory_result.results]

        # Put memories about the same error type first, drop duplicates
        relevant = [m for m in all_memories if error_type and error_type in m]
        others = [m for m in all_memories if m not in relevant]
        memory_list = list(dict.fromkeys(relevant + others))[:3]
        memory_list = [m[:600] for m in memory_list]
        memories = "\n".join(f"- {m}" for m in memory_list)

        prompt = f"""You are DevMind AI, a Python debugging assistant.

PAST MEMORIES (may include VERIFIED FIXES from this developer):
{memories if memories else "None."}

DEVELOPER'S CODE AND ERROR:
{request.query}

RULES:
- If a memory describes a resolved error of the same type as this one, apply that same fix to the developer's code and begin your Explanation with "Based on a previously verified fix".
- Copy the developer's code exactly. Change only the lines that cause the error.
- Do not invent variables or details.
- Keep it short.

Answer in exactly this format:

Error: (one line)
Cause: (one or two sentences)
Fix:
(complete corrected code in a code block)
Explanation: (two or three sentences)
"""

        payload = {
            "model": "qwen2.5-coder:1.5b",
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 700,
                "num_ctx": 4096,
                "temperature": 0.1
            }
        }

        data = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))
        reply_text = result["response"]
        recalled_fix = relevant[0].split(" | ")[0] if relevant else None

        if recalled_fix:
            reply_text = (
                f"🧠 Memory recalled: Hindsight found a previously verified fix for {error_type}:\n"
                f"{recalled_fix}\n\n---\n\n{reply_text}"
            )

        return {
            "reply": reply_text,
            "memory_status": "connected",
            "memory_count": len(memory_list),
            "memories_used": memory_list,
            "recalled_fix": recalled_fix,
            "model": "qwen2.5-coder:1.5b"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
class VerifyRequest(BaseModel):
    query: str   # the user's code + error
    reply: str   # the AI's suggested fix


@app.post("/api/memory/verify")
def verify_fix(request: VerifyRequest):
    try:
        content = (
            "VERIFIED FIX (confirmed working by the developer).\n"
            f"Problem submitted:\n{request.query[:800]}\n\n"
            f"Working solution:\n{request.reply[:1200]}"
        )
        client.retain(bank_id=BANK_ID, content=content)
        return {"status": "success", "message": "Verified fix saved to Hindsight"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
