import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { city: true, province: true },
  });

  if (!user?.city || !user?.province) {
    return NextResponse.redirect(new URL("/ajustes?completar=1", baseUrl));
  }

  return NextResponse.redirect(new URL("/", baseUrl));
}
