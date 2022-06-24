import { InMemoryFsFile, pathFromURL, VirtualFile } from "./memory_file.ts";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function createDenoPolyfill(
  obj: {
    [K in keyof typeof Deno]?: (original: typeof Deno[K]) => typeof Deno[K];
  },
) {
  const res: Partial<typeof Deno> = {};
  for (
    const [key, fn] of Object.entries(obj) as [
      keyof typeof Deno,
      typeof Deno[keyof typeof Deno],
    ][]
  ) {
    // @ts-ignore: 😖
    res[key] = fn(Deno[key]);
  }
  return res;
}

export const DenoPolyfill = createDenoPolyfill({
  read: (originalFunc) =>
    (rid, ...args) => {
      const file = InMemoryFsFile.ridToFile[rid];
      if (file) {
        return file.read(...args);
      }
      return originalFunc(rid, ...args);
    },
  readSync: (originalFunc) =>
    (rid, ...args) => {
      const file = InMemoryFsFile.ridToFile[rid];
      if (file) {
        return file.readSync(...args);
      }
      return originalFunc(rid, ...args);
    },
  write: (originalFunc) =>
    (rid, ...args) => {
      const file = InMemoryFsFile.ridToFile[rid];
      if (file) {
        return file.write(...args);
      }
      return originalFunc(rid, ...args);
    },
  writeSync: (originalFunc) =>
    (rid, ...args) => {
      const file = InMemoryFsFile.ridToFile[rid];
      if (file) {
        return file.writeSync(...args);
      }
      return originalFunc(rid, ...args);
    },
  seek: (originalFunc) =>
    (rid, ...args) => {
      const file = InMemoryFsFile.ridToFile[rid];
      if (file) {
        return file.seek(...args);
      }
      return originalFunc(rid, ...args);
    },
  seekSync: (originalFunc) =>
    (rid, ...args) => {
      const file = InMemoryFsFile.ridToFile[rid];
      if (file) {
        return file.seekSync(...args);
      }
      return originalFunc(rid, ...args);
    },
  fstat: (originalFunc) =>
    (rid, ...args) => {
      const file = InMemoryFsFile.ridToFile[rid];
      if (file) {
        return file.stat(...args);
      }
      return originalFunc(rid, ...args);
    },
  fstatSync: (originalFunc) =>
    (rid, ...args) => {
      const file = InMemoryFsFile.ridToFile[rid];
      if (file) {
        return file.statSync(...args);
      }
      return originalFunc(rid, ...args);
    },
  ftruncate: (originalFunc) =>
    (rid, ...args) => {
      const file = InMemoryFsFile.ridToFile[rid];
      if (file) {
        return file.truncate(...args);
      }
      return originalFunc(rid, ...args);
    },
  ftruncateSync: (originalFunc) =>
    (rid, ...args) => {
      const file = InMemoryFsFile.ridToFile[rid];
      if (file) {
        return file.truncateSync(...args);
      }
      return originalFunc(rid, ...args);
    },
  close: (originalFunc) =>
    (rid, ...args) => {
      const file = InMemoryFsFile.ridToFile[rid];
      if (file) {
        return file.close(...args);
      }
      return originalFunc(rid, ...args);
    },
  open: (originalFunc) =>
    (path, options) => {
      const file = VirtualFile.pathToFile[pathFromURL(path)];
      if (file) {
        return Promise.resolve(new InMemoryFsFile(file));
      }
      return originalFunc(path, options);
    },
  openSync: (originalFunc) =>
    (path, options) => {
      const file = VirtualFile.pathToFile[pathFromURL(path)];
      if (file) {
        return new InMemoryFsFile(file);
      }
      return originalFunc(path, options);
    },
  readFile: (originalFunc) =>
    (path, options) => {
      const file = VirtualFile.pathToFile[pathFromURL(path)];
      if (file) {
        return Promise.resolve(file.buffer);
      }
      return originalFunc(path, options);
    },
  readFileSync: (originalFunc) =>
    (path) => {
      const file = VirtualFile.pathToFile[pathFromURL(path)];
      if (file) {
        return file.buffer;
      }
      return originalFunc(path);
    },
  readTextFile: (originalFunc) =>
    (path, options) => {
      const file = VirtualFile.pathToFile[pathFromURL(path)];
      if (file) {
        return Promise.resolve(decoder.decode(file.buffer));
      }
      return originalFunc(path, options);
    },
  readTextFileSync: (originalFunc) =>
    (path) => {
      const file = VirtualFile.pathToFile[pathFromURL(path)];
      if (file) {
        return decoder.decode(file.buffer);
      }
      return originalFunc(path);
    },
  writeFile: (originalFunc) =>
    (path, data, options) => {
      const file = VirtualFile.pathToFile[pathFromURL(path)];
      if (file) {
        file.buffer = data;
        return Promise.resolve();
      }
      return originalFunc(path, data, options);
    },
  writeFileSync: (originalFunc) =>
    (path, data, options) => {
      const file = VirtualFile.pathToFile[pathFromURL(path)];
      if (file) {
        file.buffer = data;
        return;
      }
      return originalFunc(path, data, options);
    },
  writeTextFile: (originalFunc) =>
    (path, data, options) => {
      const file = VirtualFile.pathToFile[pathFromURL(path)];
      if (file) {
        file.buffer = encoder.encode(data);
        return Promise.resolve();
      }
      return originalFunc(path, data, options);
    },
  writeTextFileSync: (originalFunc) =>
    (path, data, options) => {
      const file = VirtualFile.pathToFile[pathFromURL(path)];
      if (file) {
        file.buffer = encoder.encode(data);
        return;
      }
      return originalFunc(path, data, options);
    },
});

// Deno.fdatasyncSync;
// Deno.fsync;
// Deno.fdatasyncSync;
// Deno.fdatasync;
// Deno.flock;
// Deno.flockSync;
// Deno.funlock;
// Deno.funlockSync;
