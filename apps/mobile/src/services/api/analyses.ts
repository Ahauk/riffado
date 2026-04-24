import { AnalysisResult } from "../../types/api";
import { API_URL, ApiError } from "./client";

function inferMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".m4a") || lower.endsWith(".aac")) return "audio/m4a";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".caf")) return "audio/x-caf";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".ogg") || lower.endsWith(".opus")) return "audio/ogg";
  return "audio/m4a";
}

function inferFilename(uri: string): string {
  const last = uri.split("/").pop();
  return last && last.includes(".") ? last : "clip.m4a";
}

export async function uploadAndAnalyze(audioUri: string): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("audio", {
    uri: audioUri,
    name: inferFilename(audioUri),
    type: inferMimeType(audioUri),
    // React Native's FormData accepts this shape; typed any for DOM-compat.
  } as unknown as Blob);

  const res = await fetch(`${API_URL}/v1/analyze`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }

  return res.json() as Promise<AnalysisResult>;
}
