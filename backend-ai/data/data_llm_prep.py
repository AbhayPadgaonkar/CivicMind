import pandas as pd
import json
import re

df = pd.read_csv("raw/civicmind_dataset.csv")

def population_to_scope(pop):
    if pop >= 50000:
        return "Large population"
    elif pop >= 20000:
        return "Medium population"
    else:
        return "Small population"

def sanitize_complaint(text):
    # remove phrases like "affecting approximately 36910 people"
    return re.sub(
        r",?\s*affecting approximately\s*\d+\s*people",
        "",
        text,
        flags=re.IGNORECASE
    ).strip()

with open("processed/llm_instructions.jsonl", "w", encoding="utf-8") as f:
    for _, row in df.iterrows():

        impact_scope = population_to_scope(row["population"])
        clean_text = sanitize_complaint(row["complaint_text"])

        record = {
            "instruction": (
                "Analyze the civic complaint and determine severity, "
                "responsible department, explanation, and resolution steps."
            ),
            "input": (
                f"Complaint: {clean_text}\n"
                f"Impact Scope: {impact_scope}"
            ),
            "output": {
                "severity": row["severity"],
                "department": row["department"],
                "explanation": (
                    f"{clean_text} "
                    f"This issue affects a {impact_scope.lower()} and is classified as "
                    f"{row['severity'].lower()} severity due to its potential impact on "
                    f"public safety and essential services."
                ),
                "resolution": row["resolution"]
            }
        }

        f.write(json.dumps(record, ensure_ascii=False) + "\n")
