import { InMemoryFsFile, VirtualFile } from "./src/memory_file.ts";
import { createDenoPolyfill } from "./src/polyfill.ts";
export { prepareLocalFile, prepareVirtualFile } from "./src/memory_file.ts";

const DenoPolyfill = createDenoPolyfill({
  ridToFile(rid) {
    return InMemoryFsFile.ridToFile[rid];
  },
  pathToFile(path) {
    return VirtualFile.pathToFile[path];
  },
  openFile(f) {
    return new InMemoryFsFile(f);
  },
});
Object.assign(Deno, DenoPolyfill);
