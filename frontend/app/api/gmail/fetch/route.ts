import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COMPLAINT_KEYWORDS } from "./keywords";
import { db } from "@/lib/firebaseAdmin";

function containsComplaintKeyword(text: string) {
  return COMPLAINT_KEYWORDS.some((keyword) => text.includes(keyword));
}

async function isAlreadyProcessed(messageId: string) {
  const snap = await db
    .collection("complaints")
    .where("gmailMessageId", "==", messageId)
    .limit(1)
    .get();

  return !snap.empty;
}

export async function GET() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("gmail_token");

  if (!tokenCookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tokens = JSON.parse(tokenCookie.value);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 20,
      q: `
        -category:promotions
        -category:social
        -category:updates
        -label:spam
        -label:drafts
      `,
    });

    const messages = response.data.messages || [];
    const logs: string[] = [];
    const emails: any[] = [];

    logs.push(`> Scanning ${messages.length} filtered inbox emails...`);

    for (const msg of messages) {
      if (await isAlreadyProcessed(msg.id!)) {
        logs.push(`> Skipped already processed email: ${msg.id}`);
        continue;
      }
      const details = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const payload = details.data.payload;
      const headers = payload?.headers || [];
      const subject =
        headers.find((h) => h.name === "Subject")?.value || "No Subject";
      const from = headers.find((h) => h.name === "From")?.value || "Unknown";
      const date =
        headers.find((h) => h.name === "Date")?.value ||
        new Date().toISOString();

      const senderName = from.replace(/<.*>/, "").trim();
      const snippet = (details.data.snippet || "").toLowerCase();

      const subjectLower = subject.toLowerCase();

      const filesFound = await findAttachments(payload);

      // 🔍 Layer-2 complaint check
      const isComplaint =
        containsComplaintKeyword(subjectLower) ||
        containsComplaintKeyword(snippet) ||
        filesFound.length > 0 ||
        snippet.length > 200;

      if (!isComplaint) {
        logs.push(`> Skipped non-complaint: "${subject}"`);
        continue;
      }

      logs.push(`> Complaint detected: "${subject}"`);

      if (filesFound.length > 0) {
        filesFound.forEach((file, index) => {
          let type = "Mixed Media";
          if (file.name.endsWith(".pdf")) type = "PDF Report";
          else if (file.name.endsWith(".csv")) type = "Structured Data";
          else if (file.name.endsWith(".xlsx")) type = "Spreadsheet";

          emails.push({
            id: `${msg.id}-${index}`,
            source: file.name,
            sender: senderName,
            contentType: type,
            timestamp: date,
            status: "Pending Analysis",
          });
        });
      } else {
        emails.push({
          id: msg.id,
          source: subject,
          sender: senderName,
          contentType: "Email Body",
          timestamp: date,
          status: "Pending Analysis",
        });
      }
    }

    logs.push(`> Complaint ingestion complete. ${emails.length} items queued.`);
    return NextResponse.json({ logs, emails });
  } catch (error) {
    console.error("Gmail API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}

// Attachment helper
async function findAttachments(payload: any) {
  const files: { name: string; size: number }[] = [];
  if (!payload?.parts) return files;

  function traverse(parts: any[]) {
    for (const part of parts) {
      if (part.filename) {
        files.push({ name: part.filename, size: part.body?.size || 0 });
      }
      if (part.parts) traverse(part.parts);
    }
  }

  traverse(payload.parts);
  return files;
}

function normalize(text: string) {
  return text.toLowerCase();
}
