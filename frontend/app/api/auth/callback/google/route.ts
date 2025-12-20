import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/api/auth/callback/google"
  );

  try {
    // 1. Exchange the code for tokens (Access + Refresh)
    const { tokens } = await oauth2Client.getToken(code);
    
    // 2. Save tokens in a HTTP-Only Cookie (Secure storage)
    // In a real production app, you might store this in a database instead.
    const cookieStore = await cookies();
    cookieStore.set("gmail_token", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    // 3. Redirect back to the Dashboard
    return NextResponse.redirect(new URL("/dashboard/input_page", request.url));
  } catch (error) {
    console.error("Error exchanging token:", error);
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
  }
}