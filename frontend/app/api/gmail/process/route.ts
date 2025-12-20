import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebaseAdmin";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const { emailIds } = await req.json();

  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("gmail_token");
  if (!tokenCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials(JSON.parse(tokenCookie.value));

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const results = [];

  for (const id of emailIds) {
    const message = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });

    const payload = message.data.payload!;
    const headers = payload.headers || [];

    const subject = headers.find(h => h.name === "Subject")?.value || "";
    const from = headers.find(h => h.name === "From")?.value || "";
    const date = headers.find(h => h.name === "Date")?.value || "";

    const body = message.data.snippet || "";

    // 🧠 AI / NLP PLACEHOLDER
    const extracted = {
      subject,
      complaint: body,
      sender: from,
      date,
      location: extractLocation(body),
      population_used: estimatePopulation(body),
      metadata: {
        file_type: "email/plain",
      },
    };

    const risk_analysis = computeRisk(extracted);

    const complaintId = uuidv4();

    await db.collection("complaints").doc(complaintId).set({
      complaintId,
      gmailMessageId: id,
      source: "gmail",
      extracted,
      risk_analysis,
      createdAt: new Date(),
    });

    results.push({ complaintId, extracted, risk_analysis });
  }

  return NextResponse.json({ results });
}


function extractLocation(text: string) {
  if (text.includes("Pune")) return "Pune";
  return "Unknown";
}

function estimatePopulation(text: string) {
  return text.length > 300 ? 3000 : 500;
}

function computeRisk(extracted: any) {
  const score = Math.min(100, extracted.complaint.length / 5);
  return {
    risk_score: Number(score.toFixed(2)),
    severity: score > 70 ? "High" : score > 40 ? "Medium" : "Low",
    priority: score > 70 ? "High" : "Medium",
  };
}
