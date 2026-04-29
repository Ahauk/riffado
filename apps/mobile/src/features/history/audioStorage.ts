import { Directory, File, Paths } from "expo-file-system";

const SUBDIR = "analysis_audio";

/** Returns the persistent directory where analysis audio files live, creating it on demand. */
function audioDir(): Directory {
  const dir = new Directory(Paths.document, SUBDIR);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function fileNameFor(analysisId: string, sourceUri: string): string {
  const dot = sourceUri.lastIndexOf(".");
  const ext = dot >= 0 && dot > sourceUri.lastIndexOf("/") ? sourceUri.slice(dot) : ".m4a";
  return `${analysisId}${ext}`;
}

/**
 * Copy a recording/upload into the document directory under a stable name
 * tied to the analysis id, so it survives app restarts and cache eviction.
 * Returns the persistent file:// URI.
 */
export async function persistAudio(
  sourceUri: string,
  analysisId: string,
): Promise<string> {
  console.log("[persistAudio] start", { sourceUri, analysisId });
  const dir = audioDir();
  const name = fileNameFor(analysisId, sourceUri);
  const dest = new File(dir, name);
  if (dest.exists) dest.delete();
  const source = new File(sourceUri);
  if (!source.exists) {
    throw new Error(`source audio missing: ${sourceUri}`);
  }
  source.copy(dest);
  console.log("[persistAudio] copied to", dest.uri);
  return dest.uri;
}

/** Remove the persisted audio for an analysis. Idempotent. */
export async function removeAudio(audioUri: string | undefined): Promise<void> {
  if (!audioUri) return;
  try {
    const file = new File(audioUri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn("removeAudio failed", e);
  }
}
