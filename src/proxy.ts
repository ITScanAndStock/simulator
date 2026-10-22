import { NextResponse } from "next/server";
import { appEnv, type AppEnv } from "@/settings";

const privateEnvironments = new Set<AppEnv>(["technical", "staging"]);

export function proxy() {
  const response = NextResponse.next();
  if (privateEnvironments.has(appEnv())) {
    response.headers.set("X-Robots-Tag", "noindex");
  }
  return response;
}
