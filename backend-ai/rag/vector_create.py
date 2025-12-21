import json
import faiss
import pickle
import numpy as np
import os
from sentence_transformers import SentenceTransformer


DATASET_PATH = "../data/processed/llm_instructions.jsonl" 
DB_OUTPUT_DIR = "./vector_store"
MODEL_NAME = "all-MiniLM-L6-v2"          

def create_vector_db():
    if not os.path.exists(DB_OUTPUT_DIR):
        os.makedirs(DB_OUTPUT_DIR)

    print(f"Loading embedding model: {MODEL_NAME}...")
    embedder = SentenceTransformer(MODEL_NAME)

    print(f"Reading {DATASET_PATH}...")
    documents = []
    

    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                text_to_index = data.get("input", "").strip()
              
                if len(text_to_index) > 10: 
                    documents.append(text_to_index)
            except json.JSONDecodeError:
                continue

    documents = documents[:5000] 
    print(f"Loaded {len(documents)} documents for indexing.")

    if not documents:
        print("No documents found to index!")
        return

    print("Generating embeddings (this may take a while)...")
    embeddings = embedder.encode(documents, convert_to_numpy=True, show_progress_bar=True)

    print("Building FAISS index...")
    embedding_dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(embedding_dim)
    index.add(embeddings)

    print(f"Saving to {DB_OUTPUT_DIR}...")
    faiss.write_index(index, f"{DB_OUTPUT_DIR}/index.faiss")
    
    with open(f"{DB_OUTPUT_DIR}/docs.pkl", "wb") as f:
        pickle.dump(documents, f)

    print("Vector DB creation complete!")

if __name__ == "__main__":
    create_vector_db()