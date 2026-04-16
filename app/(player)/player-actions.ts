"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function joinAsPlayer(formData: FormData) {
  const playerId = formData.get("player_id") as string;
  const playerName = formData.get("player_name") as string;

  if (!playerId || !playerName) redirect("/join");

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set("player_id", playerId, {
    httpOnly: true,
    secure: isProduction,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
  });

  cookieStore.set("player_name", playerName, {
    httpOnly: false,
    secure: isProduction,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
  });

  redirect("/dashboard");
}

export async function leaveGame() {
  const cookieStore = await cookies();
  cookieStore.delete("player_id");
  cookieStore.delete("player_name");
  redirect("/join");
}
