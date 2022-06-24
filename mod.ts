import "./src/polyfill.ts";
import { pathFromURL, VirtualFile } from "./src/memory_file.ts";

export async function prepareFile(path: string | URL) {
  const content = await Deno.readFile(path);
  const info = await Deno.stat(path);
  new VirtualFile(pathFromURL(path), content, info);
}
