import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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
    // 1. Fetch up to 10 recent emails to ensure we get enough data
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
    });

    const messages = response.data.messages || [];
    const logs: string[] = [];
    const emails: any[] = [];

    logs.push(`> Secure connection established. Scanning ${messages.length} recent emails...`);

    for (const msg of messages) {
      const details = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const payload = details.data.payload;
      const headers = payload?.headers;
      const subject = headers?.find((h) => h.name === "Subject")?.value || "No Subject";
      const from = headers?.find((h) => h.name === "From")?.value || "Unknown";
      const date = headers?.find((h) => h.name === "Date")?.value || new Date().toISOString();
      const senderName = from.replace(/<.*>/, "").trim(); 

      // Find attachments
      const filesFound = await findAttachments(payload);
      
      logs.push(`> Analyzing email: "${subject}"`);

      if (filesFound.length > 0) {
        // --- CHANGE: CREATE A SEPARATE ROW FOR EACH ATTACHMENT ---
        filesFound.forEach((file, index) => {
            logs.push(`> [DATA DETECTED] Found: ${file.name}`);
            
            let type = "Mixed Media";
            if (file.name.endsWith(".pdf")) type = "PDF Report";
            else if (file.name.endsWith(".csv")) type = "Structured Data";
            else if (file.name.endsWith(".xlsx")) type = "Spreadsheet";

            emails.push({
                // Create a unique ID combining email ID + file index
                id: `${msg.id}-${index}`, 
                source: file.name,         // The FILE is the source
                sender: senderName,
                contentType: type,
                timestamp: date,
                status: "Pending Analysis"
            });
        });
      } else {
        // If no attachments, just show the email subject as one row
        logs.push(`> No attachments found. Logging plain text.`);
        emails.push({
            id: msg.id,
            source: subject,
            sender: senderName,
            contentType: "Email Body",
            timestamp: date,
            status: "Pending Analysis"
        });
      }
    }

    logs.push("> Data ingestion complete.");
    return NextResponse.json({ logs, emails });

  } catch (error) {
    console.error("Gmail API Error:", error);
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}

// Helper to find attachments recursively
async function findAttachments(payload: any): Promise<{ name: string; size: number }[]> {
  const files: { name: string; size: number }[] = [];
  if (!payload.parts) return files;

  function traverse(parts: any[]) {
    for (const part of parts) {
      if (part.filename && part.filename.length > 0) {
        files.push({ name: part.filename, size: part.body?.size || 0 });
      }
      if (part.parts) traverse(part.parts);
    }
  }
  traverse(payload.parts);
  return files;
}