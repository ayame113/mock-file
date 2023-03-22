import {
  type InMemoryFsFile,
  pathFromURL,
  type VirtualFile,
} from "./memory_file.ts";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function createDenoPolyfillFunc<K extends keyof typeof Deno>(
  obj: {
    [_K in K]: (
      original: typeof Deno[_K],
      opt: {
        ridToFile: (rid: number) => InMemoryFsFile | undefined;
        pathToFile: (path: string) => VirtualFile | undefined;
        openFile: (src: VirtualFile) => InMemoryFsFile;
      },
    ) => typeof Deno[_K];
  },
) {
  return function ({ ridToFile, pathToFile, openFile }: {
    ridToFile: (rid: number) => InMemoryFsFile | undefined;
    pathToFile: (path: string) => VirtualFile | undefined;
    openFile: (src: VirtualFile) => InMemoryFsFile;
  }): { [_K in K]: typeof Deno[_K] } {
    const res: Record<string, unknown> = {};
    for (
      const [key, fn] of Object.entries(obj) as [
        keyof typeof Deno,
        typeof Deno[keyof typeof Deno],
      ][]
    ) {
      // @ts-ignore: 😖
      res[key] = fn(Deno[key], { ridToFile, pathToFile, openFile });
    }
    return res as { [_K in K]: typeof Deno[_K] };
  };
}

export const createDenoPolyfill = createDenoPolyfillFunc({
  read: (originalFunc, { ridToFile }) => (rid, ...args) => {
    const file = ridToFile(rid);
    if (file) {
      return file.read(...args);
    }
    return originalFunc(rid, ...args);
  },
  readSync: (originalFunc, { ridToFile }) => (rid, ...args) => {
    const file = ridToFile(rid);
    if (file) {
      return file.readSync(...args);
    }
    return originalFunc(rid, ...args);
  },
  write: (originalFunc, { ridToFile }) => (rid, ...args) => {
    const file = ridToFile(rid);
    if (file) {
      return file.write(...args);
    }
    return originalFunc(rid, ...args);
  },
  writeSync: (originalFunc, { ridToFile }) => (rid, ...args) => {
    const file = ridToFile(rid);
    if (file) {
      return file.writeSync(...args);
    }
    return originalFunc(rid, ...args);
  },
  seek: (originalFunc, { ridToFile }) => (rid, ...args) => {
    const file = ridToFile(rid);
    if (file) {
      return file.seek(Number(args[0]), args[1]);
    }
    return originalFunc(rid, ...args);
  },
  seekSync: (originalFunc, { ridToFile }) => (rid, ...args) => {
    const file = ridToFile(rid);
    if (file) {
      return file.seekSync(...args);
    }
    return originalFunc(rid, ...args);
  },
  fstat: (originalFunc, { ridToFile }) => (rid, ...args) => {
    const file = ridToFile(rid);
    if (file) {
      return file.stat(...args);
    }
    return originalFunc(rid, ...args);
  },
  fstatSync: (originalFunc, { ridToFile }) => (rid, ...args) => {
    const file = ridToFile(rid);
    if (file) {
      return file.statSync(...args);
    }
    return originalFunc(rid, ...args);
  },
  ftruncate: (originalFunc, { ridToFile }) => (rid, ...args) => {
    const file = ridToFile(rid);
    if (file) {
      return file.truncate(...args);
    }
    return originalFunc(rid, ...args);
  },
  ftruncateSync: (originalFunc, { ridToFile }) => (rid, ...args) => {
    const file = ridToFile(rid);
    if (file) {
      return file.truncateSync(...args);
    }
    return originalFunc(rid, ...args);
  },
  close: (originalFunc, { ridToFile }) => (rid, ...args) => {
    const file = ridToFile(rid);
    if (file) {
      return file.close(...args);
    }
    return originalFunc(rid, ...args);
  },
  open: (originalFunc, { pathToFile, openFile }) => (path, options) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      return Promise.resolve(openFile(file));
    }
    return originalFunc(path, options);
  },
  openSync: (originalFunc, { pathToFile, openFile }) => (path, options) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      return openFile(file);
    }
    return originalFunc(path, options);
  },
  readFile: (originalFunc, { pathToFile }) => (path, options) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      return Promise.resolve(file.buffer);
    }
    return originalFunc(path, options);
  },
  readFileSync: (originalFunc, { pathToFile }) => (path) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      return file.buffer;
    }
    return originalFunc(path);
  },
  readTextFile: (originalFunc, { pathToFile }) => (path, options) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      return Promise.resolve(decoder.decode(file.buffer));
    }
    return originalFunc(path, options);
  },
  readTextFileSync: (originalFunc, { pathToFile }) => (path) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      return decoder.decode(file.buffer);
    }
    return originalFunc(path);
  },
  writeFile: (originalFunc, { pathToFile }) => async (path, data, options) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      file.buffer = new Uint8Array(await new Response(data).arrayBuffer());
      return;
    }
    return originalFunc(path, data, options);
  },
  writeFileSync: (originalFunc, { pathToFile }) => (path, data, options) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      file.buffer = data;
      return;
    }
    return originalFunc(path, data, options);
  },
  writeTextFile:
    (originalFunc, { pathToFile }) => async (path, data, options) => {
      const file = pathToFile(pathFromURL(path));
      if (file) {
        if (typeof data === "string") {
          file.buffer = encoder.encode(data);
          return;
        } else {
          const u8Stream = data.pipeThrough(new TextEncoderStream());
          file.buffer = new Uint8Array(
            await new Response(u8Stream).arrayBuffer(),
          );
          return;
        }
      }
      return originalFunc(path, data, options);
    },
  writeTextFileSync:
    (originalFunc, { pathToFile }) => (path, data, options) => {
      const file = pathToFile(pathFromURL(path));
      if (file) {
        file.buffer = encoder.encode(data);
        return;
      }
      return originalFunc(path, data, options);
    },
  stat: (originalFunc, { pathToFile }) => (path, ...args) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      return Promise.resolve(file.info);
    }
    return originalFunc(path, ...args);
  },
  statSync: (originalFunc, { pathToFile }) => (path, ...args) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      return file.info;
    }
    return originalFunc(path, ...args);
  },
  lstat: (originalFunc, { pathToFile }) => (path, ...args) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      return Promise.resolve(file.info);
    }
    return originalFunc(path, ...args);
  },
  lstatSync: (originalFunc, { pathToFile }) => (path, ...args) => {
    const file = pathToFile(pathFromURL(path));
    if (file) {
      return file.info;
    }
    return originalFunc(path, ...args);
  },
});
