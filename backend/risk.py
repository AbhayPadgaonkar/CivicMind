'''from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import numpy as np
import joblib
import tempfile
import os
import re
from datetime import datetime
import xgboost as xgb

import fitz
from docx import Document
import spacy
from sentence_transformers import SentenceTransformer

# ---------------- APP ----------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- LOAD MODELS ----------------
print("RUNNING FILE:", __file__)
print("Loading models...")

risk_model = xgb.XGBRegressor()
risk_model.load_model("risk_model.json")

scaler = joblib.load("feature_scaler.pkl")
embedder = SentenceTransformer("all-MiniLM-L6-v2")
nlp = spacy.load("en_core_web_sm")

print("Models loaded.")

# ---------------- FILE PARSERS ----------------
def parse_pdf(path):
    text = ""
    with fitz.open(path) as pdf:
        for page in pdf:
            text += page.get_text()
    return text

def parse_docx(path):
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

def parse_file(path, filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return parse_pdf(path)
    elif ext in [".docx", ".doc"]:
        return parse_docx(path)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

# ---------------- TEXT UTILS ----------------
def clean_text(text):
    return re.sub(r"\s+", " ", text).strip()

METADATA_MARKERS = ["location:", "date:", "sender:", "from:", "address:"]

# ---------------- EXTRACTION ----------------
def extract_subject(raw_text):
    match = re.search(
        r"(?i)subject:\s*(.+?)(?:\n|we wish|this is to|location:)",
        raw_text,
        re.DOTALL
    )
    return match.group(1).strip() if match else None

def extract_body(raw_text):
    text = re.sub(r"(?i)^subject:.*?\n", "", raw_text, flags=re.DOTALL)
    for marker in METADATA_MARKERS:
        idx = text.lower().find(marker)
        if idx != -1:
            text = text[:idx]
            break
    return text.strip()

def extract_complaint(body_text):
    body_text = clean_text(body_text)
    if len(body_text) < 50:
        return ""
    sentences = re.split(r"[.!?]", body_text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
    return ". ".join(sentences[:4])

def extract_sender(raw_text):
    match = re.search(r"(?i)(sender|from)\s*:\s*(.+)", raw_text)
    return match.group(2).strip() if match else "Anonymous"

def extract_date(raw_text):
    patterns = [
        r"\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b",
        r"\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{4}\b",
        r"\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b",
        r"\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            for fmt in ("%d %B %Y", "%d %b %Y", "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
                try:
                    return datetime.strptime(match.group(0), fmt).strftime("%Y-%m-%d")
                except ValueError:
                    continue
    return "Not mentioned"

def extract_location(raw_text):
    match = re.search(r"(?i)location\s*:\s*(.+)", raw_text)
    if match:
        return match.group(1).strip()

    doc = nlp(raw_text)
    for ent in doc.ents:
        if ent.label_ == "GPE":
            return ent.text
    return None

# ---------------- POPULATION LOGIC (ADMIN-FIRST) ----------------

def extract_affected_population(text):
    match = re.search(
        r"(affecting|affected|impacting)\s+(approximately\s+)?([\d,]+)\s+(people|residents|persons)",
        text.lower()
    )
    if match:
        return int(match.group(3).replace(",", ""))
    return None

def detect_administrative_scope(text):
    text = text.lower()

    if any(k in text for k in ["apartment", "housing complex", "society", "nagar", "residential complex","building"]):
        return "apartment"
    if any(k in text for k in ["lane", "street", "road", "sector", "block"]):
        return "street"
    if "ward" in text:
        return "ward"
    if any(k in text for k in ["taluka", "zone", "suburb"]):
        return "suburb"
    if any(k in text for k in ["entire city", "city-wide", "across the city"]):
        return "city"

    return "local"

SCOPE_POPULATION = {
    "apartment": 800,
    "street": 3000,
    "ward": 20000,
    "suburb": 80000,
    "city": 500000,
    "local": 1000
}

def resolve_population(text, location: Optional[str]):
    # 1️⃣ Explicit affected population (highest trust)
    explicit = extract_affected_population(text)
    if explicit:
        return explicit

    # 2️⃣ Administrative scope
    scope = detect_administrative_scope(text)
    return SCOPE_POPULATION.get(scope, 1000)

def assign_relative_priority(results):
    # Sort by risk score descending
    results_sorted = sorted(
        results,
        key=lambda x: x["risk_analysis"]["risk_score"],
        reverse=True
    )

    # Get unique risk scores (descending)
    unique_scores = sorted(
        {item["risk_analysis"]["risk_score"] for item in results_sorted},
        reverse=True
    )

    total_levels = len(unique_scores)

    score_to_priority = {}

    for idx, score in enumerate(unique_scores):
        ratio = idx / max(1, total_levels - 1)

        if ratio <= 0.33:
            priority = "High"
        elif ratio <= 0.66:
            priority = "Medium"
        else:
            priority = "Low"

        score_to_priority[score] = priority

    # Assign priority back to all items
    for item in results_sorted:
        score = item["risk_analysis"]["risk_score"]
        item["risk_analysis"]["priority"] = score_to_priority[score]

    return results_sorted





# ---------------- RISK PIPELINE ----------------
def predict_risk(complaint, population):
    embedding = embedder.encode([complaint])[0]
    population_log = np.log1p(population)

    X = np.hstack([embedding, [population_log]]).reshape(1, -1)
    X_scaled = scaler.transform(X)

    risk = float(risk_model.predict(X_scaled)[0])

    if risk < 40:
        return round(risk, 2), "Low"
    elif risk < 65:
        return round(risk, 2), "Medium"
    elif risk < 80:
        return round(risk, 2), "High"
    else:
        return round(risk, 2), "Critical"

# ---------------- MAIN API ----------------
@app.post("/process-complaints")
async def process_complaints(
    files: List[UploadFile] = File(...)
):
    results = []

    for file in files:
        with tempfile.NamedTemporaryFile(delete=False) as temp:
            temp.write(await file.read())
            temp_path = temp.name

        raw_text = parse_file(temp_path, file.filename)
        os.remove(temp_path)

        subject = extract_subject(raw_text)
        body_text = extract_body(raw_text)
        complaint = extract_complaint(body_text)

        sender = extract_sender(raw_text)
        date = extract_date(raw_text)
        location = extract_location(raw_text)

        population = resolve_population(raw_text, location)

        risk_score, severity = predict_risk(complaint, population)

        results.append({
            "filename": file.filename,
            "extracted": {
                "subject": subject,
                "complaint": complaint,
                "sender": sender,
                "date": date,
                "location": location,
                "population_used": population,
                "metadata": {
                    "file_type": file.content_type
                }
            },
            "risk_analysis": {
                "risk_score": risk_score,
                "severity": severity,
                
            }
        })

    results = assign_relative_priority(results)


    return {"results": results}
'''



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

import fitz  # PyMuPDF
from docx import Document
import spacy
from sentence_transformers import SentenceTransformer

# OCR (PDF only)
from pdf2image import convert_from_path
import pytesseract
import pandas as pd

# ---------------- APP ----------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- LOAD MODELS ----------------
risk_model = xgb.XGBRegressor()
risk_model.load_model("risk_model.json")

scaler = joblib.load("feature_scaler.pkl")
embedder = SentenceTransformer("all-MiniLM-L6-v2")
nlp = spacy.load("en_core_web_sm")

# ---------------- FILE PARSERS ----------------
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

# ---------------- TEXT EXTRACTION ----------------
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
        # 02 September 2025 / 2 September2025
        r"\b\d{1,2}\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{4}\b",

        # 02 Sep 2025 / 2Sep2025
        r"\b\d{1,2}\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s*\d{4}\b",

        # 02-09-2025 / 02/09/2025
        r"\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b",

        # 2025-09-02
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
            return raw  # fallback if parsing fails

    return "Not mentioned"


def extract_location(text: str) -> Optional[str]:
    t = re.sub(r"\s+", " ", text)

    # 1️⃣ Zone patterns (OCR tolerant)
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

        # ---------- KEEP ONLY SENTENCE-LIKE LINES ----------

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

                results.append({
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
                })
            continue

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

        results.append({
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
        })

    return {"results": assign_priority(results)}
