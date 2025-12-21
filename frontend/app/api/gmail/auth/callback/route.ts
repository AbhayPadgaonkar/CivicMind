import { google } from "googleapis";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "No authorization code received" },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:3000/api/gmail/auth/callback"
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in cookie
    const cookieStore = await cookies();
    cookieStore.set("gmail_token", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Redirect back to dashboard
    return NextResponse.redirect("http://localhost:3000/dashboard/complaintpage");

  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return NextResponse.json(
      { 
        error: "Authentication failed",
        details: error.message 
      },
      { status: 500 }
    );
  }
}