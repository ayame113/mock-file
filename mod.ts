import "./src/polyfill.ts";
import { VirtualFile } from "./src/memory_file.ts";
export * from "./src/memory_file.ts";

const defaultFileInfo = {
  atime: null,
  birthtime: null,
  blksize: null,
  blocks: null,
  dev: null,
  gid: null,
  ino: null,
  isDirectory: false,
  isFile: true,
  isSymlink: false,
  mode: null,
  mtime: null,
  nlink: null,
  rdev: null,
  size: 0,
  uid: null,
};

export async function prepareFile(path: string | URL) {
  const [content, info] = await Promise.all([
    Deno.readFile(path),
    Deno.stat(path),
  ]);
  new VirtualFile(path, content, info);
}
export function prepareVirtualFile(
  path: string | URL,
  content = new Uint8Array(),
  fileInfo: Partial<Deno.FileInfo> = {},
) {
  new VirtualFile(path, content, {
    ...defaultFileInfo,
    ...fileInfo,
  });
}
