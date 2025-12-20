import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/api/auth/callback/google"
  );

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly"
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // This gives us a Refresh Token to stay logged in
    scope: scopes,
    prompt: "consent" // Forces approval screen so we definitely get the refresh token
  });

  return NextResponse.redirect(url);
}