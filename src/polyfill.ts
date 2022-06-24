import { InMemoryFsFile, pathFromURL, VirtualFile } from "./memory_file.ts";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function mock<T, K extends keyof T>(
  target: T,
  key: K,
  createMock: (originalFunc: T[K]) => T[K],
) {
  target[key] = createMock(target[key]);
}

mock(Deno, "read", (originalFunc) =>
  (rid, ...args) => {
    const file = InMemoryFsFile.ridToFile[rid];
    if (file) {
      return file.read(...args);
    }
    return originalFunc(rid, ...args);
  });

mock(Deno, "readSync", (originalFunc) =>
  (rid, ...args) => {
    const file = InMemoryFsFile.ridToFile[rid];
    if (file) {
      return file.readSync(...args);
    }
    return originalFunc(rid, ...args);
  });

mock(Deno, "write", (originalFunc) =>
  (rid, ...args) => {
    const file = InMemoryFsFile.ridToFile[rid];
    if (file) {
      return file.write(...args);
    }
    return originalFunc(rid, ...args);
  });

mock(Deno, "writeSync", (originalFunc) =>
  (rid, ...args) => {
    const file = InMemoryFsFile.ridToFile[rid];
    if (file) {
      return file.writeSync(...args);
    }
    return originalFunc(rid, ...args);
  });

mock(Deno, "seek", (originalFunc) =>
  (rid, ...args) => {
    const file = InMemoryFsFile.ridToFile[rid];
    if (file) {
      return file.seek(...args);
    }
    return originalFunc(rid, ...args);
  });

mock(Deno, "seekSync", (originalFunc) =>
  (rid, ...args) => {
    const file = InMemoryFsFile.ridToFile[rid];
    if (file) {
      return file.seekSync(...args);
    }
    return originalFunc(rid, ...args);
  });

mock(Deno, "fstat", (originalFunc) =>
  (rid, ...args) => {
    const file = InMemoryFsFile.ridToFile[rid];
    if (file) {
      return file.stat(...args);
    }
    return originalFunc(rid, ...args);
  });

mock(Deno, "fstatSync", (originalFunc) =>
  (rid, ...args) => {
    const file = InMemoryFsFile.ridToFile[rid];
    if (file) {
      return file.statSync(...args);
    }
    return originalFunc(rid, ...args);
  });

mock(Deno, "ftruncate", (originalFunc) =>
  (rid, ...args) => {
    const file = InMemoryFsFile.ridToFile[rid];
    if (file) {
      return file.truncate(...args);
    }
    return originalFunc(rid, ...args);
  });

mock(Deno, "ftruncateSync", (originalFunc) =>
  (rid, ...args) => {
    const file = InMemoryFsFile.ridToFile[rid];
    if (file) {
      return file.truncateSync(...args);
    }
    return originalFunc(rid, ...args);
  });

mock(Deno, "close", (originalFunc) =>
  (rid, ...args) => {
    const file = InMemoryFsFile.ridToFile[rid];
    if (file) {
      return file.close(...args);
    }
    return originalFunc(rid, ...args);
  });

mock(Deno, "open", (originalFunc) =>
  (path, options) => {
    const file = VirtualFile.pathToFile[pathFromURL(path)];
    if (file) {
      return Promise.resolve(new InMemoryFsFile(file));
    }
    return originalFunc(path, options);
  });

mock(Deno, "openSync", (originalFunc) =>
  (path, options) => {
    const file = VirtualFile.pathToFile[pathFromURL(path)];
    if (file) {
      return new InMemoryFsFile(file);
    }
    console.log(path, options, file);

    return originalFunc(path, options);
  });

mock(Deno, "readFile", (originalFunc) =>
  (path, options) => {
    const file = VirtualFile.pathToFile[pathFromURL(path)];
    if (file) {
      return Promise.resolve(file.buffer);
    }
    return originalFunc(path, options);
  });

mock(Deno, "readFileSync", (originalFunc) =>
  (path) => {
    const file = VirtualFile.pathToFile[pathFromURL(path)];
    if (file) {
      return file.buffer;
    }
    return originalFunc(path);
  });

mock(Deno, "readTextFile", (originalFunc) =>
  (path, options) => {
    const file = VirtualFile.pathToFile[pathFromURL(path)];
    if (file) {
      return Promise.resolve(decoder.decode(file.buffer));
    }
    return originalFunc(path, options);
  });

mock(Deno, "readTextFileSync", (originalFunc) =>
  (path) => {
    const file = VirtualFile.pathToFile[pathFromURL(path)];
    if (file) {
      return decoder.decode(file.buffer);
    }
    return originalFunc(path);
  });

mock(Deno, "writeFile", (originalFunc) =>
  (path, data, options) => {
    const file = VirtualFile.pathToFile[pathFromURL(path)];
    if (file) {
      file.buffer = data;
      return Promise.resolve();
    }
    return originalFunc(path, data, options);
  });

mock(Deno, "writeFileSync", (originalFunc) =>
  (path, data, options) => {
    const file = VirtualFile.pathToFile[pathFromURL(path)];
    if (file) {
      file.buffer = data;
      return;
    }
    return originalFunc(path, data, options);
  });

mock(Deno, "writeTextFile", (originalFunc) =>
  (path, data, options) => {
    const file = VirtualFile.pathToFile[pathFromURL(path)];
    if (file) {
      file.buffer = encoder.encode(data);
      return Promise.resolve();
    }
    return originalFunc(path, data, options);
  });

mock(Deno, "writeTextFileSync", (originalFunc) =>
  (path, data, options) => {
    const file = VirtualFile.pathToFile[pathFromURL(path)];
    if (file) {
      file.buffer = encoder.encode(data);
      return;
    }
    return originalFunc(path, data, options);
  });

// Deno.fdatasyncSync;
// Deno.fsync;
// Deno.fdatasyncSync;
// Deno.fdatasync;
// Deno.flock;
// Deno.flockSync;
// Deno.funlock;
// Deno.funlockSync;
