import "server-only";
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

function uploadRoot(): string {
  return path.isAbsolute(UPLOAD_DIR)
    ? UPLOAD_DIR
    : path.join(process.cwd(), UPLOAD_DIR);
}

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(uploadRoot(), { recursive: true });
}

export function storedPath(storedName: string): string {
  // Guard against path traversal — only allow a bare filename.
  const safe = path.basename(storedName);
  return path.join(uploadRoot(), safe);
}

export async function saveFile(storedName: string, data: Buffer): Promise<void> {
  await ensureUploadDir();
  await fs.writeFile(storedPath(storedName), data);
}

export async function readFile(storedName: string): Promise<Buffer> {
  return fs.readFile(storedPath(storedName));
}

export async function deleteFile(storedName: string): Promise<void> {
  try {
    await fs.unlink(storedPath(storedName));
  } catch {
    // ignore missing files
  }
}
