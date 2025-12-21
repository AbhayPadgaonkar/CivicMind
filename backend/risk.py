import firebase_admin
from firebase_admin import credentials,firestore
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Union
import numpy as np
import joblib
import tempfile
import os
import re
from datetime import datetime
import xgboost as xgb
from datetime import datetime
from dotenv import load_dotenv
from google.oauth2 import service_account
import json

import fitz  # PyMuPDF
from docx import Document
import spacy
from sentence_transformers import SentenceTransformer

# OCR (PDF only)
from pdf2image import convert_from_path
import pytesseract
import pandas as pd

load_dotenv()

json_str = os.getenv("FIREBASE_CREDS")
cred_info = json.loads(json_str)

if "private_key" in cred_info:
    cred_info["private_key"] = cred_info["private_key"].replace("\\n", "\n")

firebase_cred = credentials.Certificate(cred_info)

if not firebase_admin._apps:
    firebase_admin.initialize_app(firebase_cred)

db = firestore.client()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

risk_model = xgb.XGBRegressor()
risk_model.load_model("risk_model.json")

scaler = joblib.load("feature_scaler.pkl")
embedder = SentenceTransformer("all-MiniLM-L6-v2")
nlp = spacy.load("en_core_web_sm")

def store_complaint_firebase(result: dict):
    doc_id = str(uuid.uuid4())

    data = {
        "filename": result["filename"],

        **result["extracted"],
        **result["risk_analysis"],

        "status": "open",
        "created_at": firestore.SERVER_TIMESTAMP,
    }

    db.collection("complaints").document(doc_id).set(data)

def parse_pdf_text(path: str) -> str:
    text = ""
    with fitz.open(path) as pdf:
        for page in pdf:
            text += page.get_text()
    return text.strip()

def ocr_pdf(path: str) -> str:
    try:
        images = convert_from_path(path, dpi=300)
        return " ".join(
            pytesseract.image_to_string(img, lang="eng") for img in images
        ).strip()
    except Exception:
        return ""

def parse_docx(path: str) -> str:
    doc = Document(path)
    text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    del doc
    return text.strip()

def parse_structured(df: pd.DataFrame) -> List[dict]:
    records = []
    for _, row in df.iterrows():
        records.append({
            "subject": str(row.get("subject", "")).strip(),
            "complaint": str(row.get("complaint", "")).strip(),
            "location": str(row.get("location", "")).strip(),
            "date": str(row.get("date", "")).strip(),
            "sender": str(row.get("sender", "")).strip(),
        })
    return records

def parse_file(path: str, filename: str) -> tuple[Union[str, list], bool]:
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        text = parse_pdf_text(path)
        if len(text) >= 50:
            return text, False
        return ocr_pdf(path), True

    if ext == ".docx":
        return parse_docx(path), False

    if ext == ".csv":
        df = pd.read_csv(path)
        return parse_structured(df), False

    if ext in [".xls", ".xlsx"]:
        df = pd.read_excel(path)
        return parse_structured(df), False

    raise HTTPException(
        status_code=422,
        detail="Unsupported file type. Upload PDF, DOCX, CSV, XLS or XLSX only."
    )

def clean_text(t: str) -> str:
    return re.sub(r"\s+", " ", t).strip()

def extract_subject(raw_text: str) -> Optional[str]:
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    # Case 1: Explicit "Subject" with or without colon
    for l in lines[:5]:
        m = re.match(r"(?i)^subject[\s:\-]+(.+)", l)
        if m:
            return m.group(1).strip()

    # Case 2: First short line heuristic (gov style)
    first = lines[0] if lines else ""
    if 5 < len(first) < 120:
        return first

    return None


def extract_sender(raw_text: str) -> str:
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    # Case 1: Explicit Sender (with or without colon)
    for l in reversed(lines):
        m = re.match(r"(?i)^sender[\s:\-]+(.+)", l)
        if m:
            return m.group(1).strip()

    # Case 2: Organization-style ending line
    for l in reversed(lines[-5:]):
        if any(k in l.lower() for k in [
            "committee", "association", "residents",
            "society", "citizens", "welfare"
        ]):
            return l

    return "Anonymous"


def extract_date(text: str) -> str:
    t = re.sub(r"\s+", " ", text)

    patterns = [
     
        r"\b\d{1,2}\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{4}\b",


        r"\b\d{1,2}\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s*\d{4}\b",


        r"\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b",


        r"\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b",
    ]

    for p in patterns:
        m = re.search(p, t, re.I)
        if m:
            raw = m.group(0)
            for fmt in [
                "%d %B %Y", "%d %b %Y",
                "%d-%m-%Y", "%d/%m/%Y",
                "%Y-%m-%d"
            ]:
                try:
                    return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
                except:
                    pass
            return raw 
    return "Not mentioned"


def extract_location(text: str) -> Optional[str]:
    t = re.sub(r"\s+", " ", text)

    zone_patterns = [
        r"\bzone\s*[-:]?\s*\d+\b",   # Zone 3, Zone-3
        r"\bz\s*o\s*n\s*e\s*\d+\b",  # Z O N E 3 (OCR spaced)
    ]

    for p in zone_patterns:
        m = re.search(p, t, re.I)
        if m:
            return m.group(0).replace(" ", "").title().replace("-", " ")

    # 2️⃣ Named Entity Recognition
    try:
        doc = nlp(t)
        for ent in doc.ents:
            if ent.label_ == "GPE":
                return ent.text
    except:
        pass

    return None





def extract_body(raw_text: str) -> str:
    text = raw_text.replace("\r", "\n")

    # Split into lines
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    complaint_lines = []

    for line in lines:
        # ---------- HARD DROPS ----------

        # Drop subject line
        if re.match(r"(?i)^subject\s*[:\-]", line):
            continue

        # Drop To / From lines
        if re.match(r"(?i)^(to|from)\s*[:\-]", line):
            continue

        # Drop metadata lines
        if re.match(r"(?i)^(date|location|sender|address)\s*[:\-]", line):
            continue

        # Drop sign-offs
        if re.search(
            r"(?i)(yours sincerely|yours faithfully|with regards|thank you)",
            line,
        ):
            break  # footer starts → stop reading

        # Drop address / designation-heavy lines
        # Heuristic: many commas + mostly title case
        comma_count = line.count(",")
        title_word_ratio = sum(w.istitle() for w in line.split()) / max(1, len(line.split()))

        if comma_count >= 2 and title_word_ratio > 0.6:
            continue

        # Drop very short lines (headers, names)
        if len(line) < 30:
            continue


        # Must contain at least one verb-like word
        if not re.search(r"\b(is|are|has|have|was|were|remain|causing|resulting)\b", line, re.I):
            # still allow if long enough (OCR / formal phrasing)
            if len(line) < 60:
                continue

        complaint_lines.append(line)

    text = " ".join(complaint_lines)
    return re.sub(r"\s+", " ", text).strip()





def extract_complaint(body_text: str) -> str:
    if len(body_text) < 50:
        return ""

    sentences = [
        s.strip()
        for s in re.split(r"[.!?]", body_text)
        if len(s.strip()) > 20
    ]

    return ". ".join(sentences[:4])

PEOPLE_WORDS = [
    "people", "residents", "citizens",
    "individuals", "families", "households", "population"
]

# ---------------- POPULATION LOGIC ----------------
def resolve_population(text: str) -> int:
    t = text.lower()

    # 1️⃣ Explicit numeric population
    m = re.search(
        r"(affecting|affected|impacting)\s+(approximately\s+)?([\d,]+)\s+"
        r"(people|residents|citizens|individuals|families|households)",
        t
    )
    if m:
        return int(m.group(3).replace(",", ""))

    # 2️⃣ Very large impact
    if re.search(r"(thousands of|large number of|numerous)\s+(" + "|".join(PEOPLE_WORDS) + r")", t):
        return 10000

    # 3️⃣ Medium impact
    if re.search(r"(many|several|multiple|large group of)\s+(" + "|".join(PEOPLE_WORDS) + r")", t):
        return 3000

    # 4️⃣ Small impact
    if re.search(r"(few|some|limited number of|nearby)\s+(" + "|".join(PEOPLE_WORDS) + r")", t):
        return 800

    # 5️⃣ No signal → local
    return 500


# ---------------- ML ----------------
def predict_risk(complaint: str, population: int):
    emb = embedder.encode([complaint])[0]
    X = np.hstack([emb, [np.log1p(population)]]).reshape(1, -1)
    risk = float(risk_model.predict(scaler.transform(X))[0])

    if risk < 40:
        sev = "Low"
    elif risk < 65:
        sev = "Medium"
    elif risk < 80:
        sev = "High"
    else:
        sev = "Critical"

    return round(risk, 2), sev

def assign_priority(results: list):
    scores = sorted(
        {r["risk_analysis"]["risk_score"] for r in results},
        reverse=True
    )
    mapping = {}
    for i, s in enumerate(scores):
        ratio = i / max(1, len(scores) - 1)
        if ratio <= 0.33:
            mapping[s] = "High"
        elif ratio <= 0.66:
            mapping[s] = "Medium"
        else:
            mapping[s] = "Low"

    for r in results:
        r["risk_analysis"]["priority"] = mapping[r["risk_analysis"]["risk_score"]]

    return results

# ---------------- API ----------------

@app.patch("/admin/complaints/{complaint_id}/resolve")
async def resolve_complaint(complaint_id: str):
    """Mark a complaint as resolved"""
    try:
        # Update the document in Firestore
        db.collection("complaints").document(complaint_id).update({
            "status": "closed",
            "resolved_at": firestore.SERVER_TIMESTAMP
        })
        
        return {
            "success": True,
            "message": f"Complaint {complaint_id} marked as resolved",
            "id": complaint_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to resolve complaint: {str(e)}"
        )


@app.get("/admin/complaints")
def get_all_complaints(status: str = None):
    """
    Get complaints, optionally filtered by status
    Query params: ?status=open or ?status=closed
    """
    query = db.collection("complaints")
    
    # Optional status filter
    if status:
        query = query.where("status", "==", status)
    
    docs = query.order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    
    return [
        {"id": doc.id, **doc.to_dict()}
        for doc in docs
    ]


@app.post("/process-complaints")
async def process_complaints(files: List[UploadFile] = File(...)):
    results = []

    for f in files:
        suffix = os.path.splitext(f.filename)[1]

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await f.read())
            path = tmp.name

        try:
            raw, ocr_used = parse_file(path, f.filename)
        finally:
            try:
                os.remove(path)
            except PermissionError:
                pass

        # ---------- CSV / XLS ----------
        if isinstance(raw, list):
            for row in raw:
                body = extract_body(row["complaint"])
                complaint = extract_complaint(body)

                if not complaint:
                    continue

                population = resolve_population(body)
                risk, severity = predict_risk(complaint, population)

                result = {
                    "filename": f.filename,
                    "extracted": {
                        "subject": row["subject"] or None,
                        "complaint": complaint,
                        "sender": row["sender"] or "Anonymous",
                        "date": row["date"] or "Not mentioned",
                        "location": row["location"] or extract_location(body),
                        "population_used": population,
                        "ocr_used": False
                    },
                    "risk_analysis": {
                        "risk_score": risk,
                        "severity": severity
                    }
                }

                results.append(result)
                store_complaint_firebase(result)  # ✅ store EACH ROW

            continue  # move to next uploaded file

        # ---------- PDF / DOCX ----------
        subject = extract_subject(raw)
        body = extract_body(raw)
        complaint = extract_complaint(body)

        if not complaint:
            raise HTTPException(
                status_code=422,
                detail=f"Could not extract complaint text from {f.filename}"
            )

        population = resolve_population(body)
        risk, severity = predict_risk(complaint, population)

        result = {
            "filename": f.filename,
            "extracted": {
                "subject": subject,
                "complaint": complaint,
                "sender": extract_sender(raw),
                "date": extract_date(raw),
                "location": extract_location(raw),
                "population_used": population,
                "ocr_used": ocr_used
            },
            "risk_analysis": {
                "risk_score": risk,
                "severity": severity
            }
        }

        results.append(result)
        store_complaint_firebase(result)  # ✅ store ONE document

    return {"results": assign_priority(results)}
