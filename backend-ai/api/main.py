import os
import torch
import faiss
import pickle
import json
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_MODEL_ID = "TinyLlama/TinyLlama-1.1B-intermediate-step-1431k-3T"
ADAPTER_PATH = "../llm/tinyllama-finetuned"
VECTOR_STORE_DIR = "../rag/vector_store"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

resources = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Server starting up...")

    # Load Vector Database
    try:
        index_path = os.path.join(VECTOR_STORE_DIR, "index.faiss")
        docs_path = os.path.join(VECTOR_STORE_DIR, "docs.pkl")
        
        if os.path.exists(index_path) and os.path.exists(docs_path):
            resources["index"] = faiss.read_index(index_path)
            with open(docs_path, "rb") as f:
                resources["docs"] = pickle.load(f)
            resources["embedder"] = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Vector DB loaded successfully.")
        else:
            logger.warning("Vector DB files not found. RAG functionality disabled.")
            resources["index"] = None
    except Exception as e:
        logger.error(f"Failed to load Vector DB: {e}")

    # Load Model & Tokenizer
    try:
        logger.info("Loading TinyLlama (4-bit)...")
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_quant_type="nf4"
        )
        
        base_model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_ID, 
            quantization_config=bnb_config, 
            device_map="auto"
        )
        
        tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_ID)

        if os.path.exists(ADAPTER_PATH):
            model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
            logger.info("Fine-tuned adapter attached.")
        else:
            logger.warning(f"Adapter not found at {ADAPTER_PATH}. Using base model.")
            model = base_model
            
        model.eval()
        resources["model"] = model
        resources["tokenizer"] = tokenizer
        
    except Exception as e:
        logger.error(f"Critical error loading LLM: {e}")
        raise e

    yield

    logger.info("Server shutting down.")
    resources.clear()

app = FastAPI(title="CivicMind API", version="1.0", lifespan=lifespan)

class QueryRequest(BaseModel):
    query: str
    top_k: int = 2

@app.get("/health")
def health_check():
    return {"status": "active", "device": DEVICE}

@app.post("/chat")
def generate_response(request: QueryRequest):
    if resources.get("model") is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    try:
        # RAG Retrieval
        retrieved_context = ""
        context_list = []
        
        if resources.get("index") is not None:
            query_emb = resources["embedder"].encode([request.query], convert_to_numpy=True)
            _, indices = resources["index"].search(query_emb, request.top_k)
            
            seen = set()
            for idx in indices[0]:
                if idx != -1 and idx < len(resources["docs"]):
                    text = resources["docs"][idx].strip()
                    if text not in seen:
                        context_list.append(text)
                        seen.add(text)
            
            retrieved_context = "\n".join(context_list)

        # Prompt Formatting
        instruction = "Analyze the civic complaint and determine severity, responsible department, explanation, and resolution steps."
        input_text = retrieved_context if retrieved_context else request.query
        
        prompt = f"### Instruction:\n{instruction}\n### Input:\n{input_text}\n### Response:\n"

        # Inference
        inputs = resources["tokenizer"](prompt, return_tensors="pt").to(DEVICE)
        
        with torch.no_grad():
            outputs = resources["model"].generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.1,
                do_sample=True,
                repetition_penalty=1.1
            )
        
        full_response = resources["tokenizer"].decode(outputs[0], skip_special_tokens=True)
        answer_text = full_response.split("### Response:")[-1].strip()

        # JSON Parsing
        try:
            parsed_json = json.loads(answer_text)
            return {
                "answer": parsed_json,
                "retrieved_context": context_list
            }
        except json.JSONDecodeError:
            return {
                "answer": answer_text,
                "retrieved_context": context_list,
                "note": "Raw text returned (JSON parsing failed)"
            }

    except Exception as e:
        logger.error(f"Error during generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)