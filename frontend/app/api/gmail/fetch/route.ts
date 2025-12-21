import { NextResponse } from "next/server";
import { cookies } from "next/headers";


/* -------------------- Dynamic Imports with Error Handling -------------------- */

let google: any;
let db: any;
let COMPLAINT_KEYWORDS: string[] = [];

async function initializeDependencies() {
  try {
    // Import googleapis
    const { google: googleLib } = await import("googleapis");
    google = googleLib;

    // Import Firebase
    try {
      const { db: firebaseDb } = await import("@/lib/firebaseAdmin");
      db = firebaseDb;
    } catch (fbError) {
      console.error("Firebase import failed:", fbError);
      throw new Error("Firebase configuration error");
    }

    // Import keywords
    try {
      const { COMPLAINT_KEYWORDS: keywords } = await import("./keywords");
      COMPLAINT_KEYWORDS = keywords;
    } catch (kwError) {
      console.warn("Keywords import failed, using defaults:", kwError);
      COMPLAINT_KEYWORDS = ["complaint", "issue", "problem", "grievance"];
    }

    return true;
  } catch (error) {
    console.error("Dependency initialization failed:", error);
    throw error;
  }
}

/* -------------------- Helpers -------------------- */

function containsComplaintKeyword(text: string): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return COMPLAINT_KEYWORDS.some((k) => lowerText.includes(k.toLowerCase()));
}

async function isAlreadyProcessed(messageId: string): Promise<boolean> {
  try {
    if (!db) return false;
    const snap = await db
      .collection("complaints")
      .where("gmailMessageId", "==", messageId)
      .limit(1)
      .get();
    return !snap.empty;
  } catch (error) {
    console.error("Error checking processed status:", error);
    return false;
  }
}

async function findAttachments(payload: any): Promise<{ name: string; size: number }[]> {
  const files: { name: string; size: number }[] = [];
  if (!payload?.parts) return files;

  const walk = (parts: any[]) => {
    for (const part of parts) {
      if (part.filename && part.filename.length > 0) {
        files.push({
          name: part.filename,
          size: part.body?.size || 0,
        });
      }
      if (part.parts) walk(part.parts);
    }
  };

  walk(payload.parts);
  return files;
}

/* -------------------- API Route -------------------- */

export async function GET() {
  const logs: string[] = [];
  
  try {
    logs.push("🔧 Initializing dependencies...");

    // Initialize all dependencies
    await initializeDependencies();
    logs.push("✅ Dependencies loaded");

    // Check environment variables
    if (!process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { 
          error: "GOOGLE_CLIENT_ID not configured",
          logs: [...logs, "❌ Missing GOOGLE_CLIENT_ID in environment"]
        },
        { status: 500 }
      );
    }

    if (!process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { 
          error: "GOOGLE_CLIENT_SECRET not configured",
          logs: [...logs, "❌ Missing GOOGLE_CLIENT_SECRET in environment"]
        },
        { status: 500 }
      );
    }

    logs.push("✅ Environment variables verified");

    // Get token from cookies
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("gmail_token");

    if (!tokenCookie?.value) {
      return NextResponse.json(
        { 
          error: "Not authenticated with Gmail",
          logs: [...logs, "❌ No Gmail authentication token found"]
        },
        { status: 401 }
      );
    }

    logs.push("✅ Gmail token found");

    // Parse token
    let tokens: any;
    try {
      tokens = JSON.parse(tokenCookie.value);
      
      if (!tokens.access_token) {
        throw new Error("Invalid token structure - missing access_token");
      }
      logs.push("✅ Token parsed successfully");
    } catch (parseError: any) {
      return NextResponse.json(
        { 
          error: "Invalid Gmail token",
          logs: [...logs, `❌ Token parse error: ${parseError.message}`]
        },
        { status: 401 }
      );
    }

    // Create OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/gmail/callback"
    );

    oauth2Client.setCredentials(tokens);
    logs.push("✅ OAuth client configured");

    // Refresh token
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      logs.push("✅ Access token refreshed");
    } catch (refreshError: any) {
      return NextResponse.json(
        { 
          error: "Gmail authentication expired",
          logs: [...logs, `❌ Token refresh failed: ${refreshError.message}`],
          code: "AUTH_EXPIRED"
        },
        { status: 401 }
      );
    }

    // Initialize Gmail API
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    logs.push("✅ Gmail API initialized");

    // Fetch messages
    logs.push("🔍 Searching for complaint emails...");
    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: 20,
      q: "is:unread has:attachment filename:pdf -category:promotions -category:social -label:spam",
    });

    const messages = list.data.messages || [];
    logs.push(`📧 Found ${messages.length} unread email(s) with attachments`);

    const emails: any[] = [];

    for (const msg of messages) {
      try {
        if (!msg.id) continue;

        // Check if already processed
        if (await isAlreadyProcessed(msg.id)) {
          logs.push(`⏭️ Skipped (already processed): ${msg.id.substring(0, 10)}...`);
          continue;
        }

        // Get message details
        const details = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "full",
        });

        const payload = details.data.payload;
        const headers = payload?.headers || [];

        const subject = headers.find((h: any) => h.name === "Subject")?.value || "No Subject";
        const from = headers.find((h: any) => h.name === "From")?.value || "Unknown";
        const date = headers.find((h: any) => h.name === "Date")?.value || new Date().toISOString();

        const senderName = from.replace(/<.*>/, "").trim();
        const snippet = (details.data.snippet || "").toLowerCase();

        const attachments = await findAttachments(payload);

        // Check if complaint
        const isComplaint =
          containsComplaintKeyword(subject) ||
          containsComplaintKeyword(snippet) ||
          attachments.length > 0;

        if (!isComplaint) {
          logs.push(`❌ Not a complaint: ${subject.substring(0, 40)}...`);
          continue;
        }

        if (attachments.length === 0) {
          logs.push(`⚠️ No attachments: ${subject.substring(0, 40)}...`);
          continue;
        }

        // Add emails
        attachments.forEach((file, index) => {
          emails.push({
            id: `${msg.id}-${index}`,
            gmailMessageId: msg.id,
            sender: senderName,
            source: file.name,
            contentType: "PDF",
            timestamp: date,
            status: "Pending Analysis",
            fileSize: file.size,
          });
        });

        logs.push(`✅ Queued: ${subject.substring(0, 40)}... (${attachments.length} file(s))`);

        // Mark as read
        await gmail.users.messages.modify({
          userId: "me",
          id: msg.id,
          requestBody: {
            removeLabelIds: ["UNREAD"],
          },
        });

      } catch (msgError: any) {
        logs.push(`⚠️ Error processing message: ${msgError.message}`);
        continue;
      }
    }

    logs.push(`\n✨ Complete! ${emails.length} complaint(s) ready for analysis.`);

    return NextResponse.json({ 
      success: true,
      logs, 
      emails,
      totalProcessed: messages.length,
      complaintsFound: emails.length
    });

  } catch (error: any) {
    console.error("Gmail Fetch Error:", error);
    
    return NextResponse.json(
      {
        error: error.message || "Unknown error occurred",
        logs: [...logs, `❌ Fatal error: ${error.message}`],
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}