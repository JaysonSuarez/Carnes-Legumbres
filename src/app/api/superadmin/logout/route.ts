import { NextResponse } from "next/server";
import { SUPERADMIN_COOKIE } from "@/lib/superadmin-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SUPERADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
