import { assertEquals } from "https://deno.land/std@0.180.0/testing/asserts.ts";

import { createDenoPolyfill } from "./polyfill.ts";
import { InMemoryFsFile, pathFromURL, VirtualFile } from "./memory_file.ts";

const url = new URL("./[[virtual]].txt", import.meta.url);
const defaultRid = Math.random();
const defaultOpenFileResult = Symbol("[[defaultOpenFileResult]]");
const defaultFileContent = `hello ${Math.random()} world`;
const defaultBuffer = {
  buffer: new TextEncoder().encode(defaultFileContent),
  info: Symbol("[[defaultFileInfo]]") as unknown as Deno.FileInfo,
};
const DenoPolyfill = createDenoPolyfill({
  ridToFile(rid) {
    assertEquals(rid, defaultRid);
    return new Proxy({}, {
      get(_target, key) {
        if (key === "then") {
          return;
        }
        return function (...args: unknown[]) {
          return [key, ...args];
        };
      },
    }) as InMemoryFsFile;
  },
  pathToFile(path) {
    assertEquals(path, pathFromURL(url));
    return defaultBuffer as VirtualFile;
  },
  openFile() {
    return defaultOpenFileResult as unknown as InMemoryFsFile;
  },
});

Deno.test({
  name: "polyfill - read",
  async fn() {
    assertEquals<unknown>(
      await DenoPolyfill.read(defaultRid, new Uint8Array([0, 1, 2])),
      ["read", new Uint8Array([0, 1, 2])],
    );
  },
});

Deno.test({
  name: "polyfill - readSync",
  fn() {
    assertEquals<unknown>(
      DenoPolyfill.readSync(defaultRid, new Uint8Array([0, 1, 2])),
      ["readSync", new Uint8Array([0, 1, 2])],
    );
  },
});

Deno.test({
  name: "polyfill - write",
  async fn() {
    assertEquals<unknown>(
      await DenoPolyfill.write(defaultRid, new Uint8Array([0, 1, 2])),
      ["write", new Uint8Array([0, 1, 2])],
    );
  },
});

Deno.test({
  name: "polyfill - writeSync",
  fn() {
    assertEquals<unknown>(
      DenoPolyfill.writeSync(defaultRid, new Uint8Array([0, 1, 2])),
      ["writeSync", new Uint8Array([0, 1, 2])],
    );
  },
});

Deno.test({
  name: "polyfill - seek",
  async fn() {
    assertEquals<unknown>(
      await DenoPolyfill.seek(defaultRid, 100, Deno.SeekMode.End),
      ["seek", 100, Deno.SeekMode.End],
    );
  },
});

Deno.test({
  name: "polyfill - seekSync",
  fn() {
    assertEquals<unknown>(
      DenoPolyfill.seekSync(defaultRid, 100, Deno.SeekMode.End),
      ["seekSync", 100, Deno.SeekMode.End],
    );
  },
});

Deno.test({
  name: "polyfill - fstat",
  async fn() {
    assertEquals<unknown>(
      await DenoPolyfill.fstat(defaultRid),
      ["stat"],
    );
  },
});

Deno.test({
  name: "polyfill - fstatSync",
  fn() {
    assertEquals<unknown>(
      DenoPolyfill.fstatSync(defaultRid),
      ["statSync"],
    );
  },
});

Deno.test({
  name: "polyfill - ftruncate",
  async fn() {
    assertEquals<unknown>(
      await DenoPolyfill.ftruncate(defaultRid, 500),
      ["truncate", 500],
    );
  },
});

Deno.test({
  name: "polyfill - ftruncateSync",
  fn() {
    assertEquals<unknown>(
      DenoPolyfill.ftruncateSync(defaultRid, 600),
      ["truncateSync", 600],
    );
  },
});

Deno.test({
  name: "polyfill - close",
  fn() {
    assertEquals<unknown>(
      DenoPolyfill.close(defaultRid),
      ["close"],
    );
  },
});

Deno.test({
  name: "polyfill - open",
  async fn() {
    assertEquals<unknown>(
      await DenoPolyfill.open(url, { read: true }),
      defaultOpenFileResult,
    );
  },
});

Deno.test({
  name: "polyfill - openSync",
  fn() {
    assertEquals<unknown>(
      DenoPolyfill.openSync(url, { read: true }),
      defaultOpenFileResult,
    );
  },
});

Deno.test({
  name: "polyfill - readFile",
  async fn() {
    assertEquals<unknown>(
      await DenoPolyfill.readFile(url),
      defaultBuffer.buffer,
    );
  },
});

Deno.test({
  name: "polyfill - readFileSync",
  fn() {
    assertEquals<unknown>(
      DenoPolyfill.readFileSync(url),
      defaultBuffer.buffer,
    );
  },
});

Deno.test({
  name: "polyfill - readTextFile",
  async fn() {
    assertEquals<unknown>(
      await DenoPolyfill.readTextFile(url),
      defaultFileContent,
    );
  },
});

Deno.test({
  name: "polyfill - readTextFileSync",
  fn() {
    assertEquals<unknown>(
      DenoPolyfill.readTextFileSync(url),
      defaultFileContent,
    );
  },
});

Deno.test({
  name: "polyfill - writeFile w/ Uint8Array",
  async fn() {
    await DenoPolyfill.writeFile(url, new Uint8Array([0, 1, 2]));
    assertEquals<unknown>(defaultBuffer.buffer, new Uint8Array([0, 1, 2]));
  },
});

Deno.test({
  name: "polyfill - writeFile w/ ReadableStream",
  async fn() {
    let timeout: number;
    await DenoPolyfill.writeFile(
      url,
      new ReadableStream({
        start(controller) {
          const words = defaultFileContent.split(" ");
          return new Promise((resolve, _reject) => {
            timeout = setInterval(() => {
              const word = words.shift();
              if (word) {
                controller.enqueue(
                  new TextEncoder().encode(word + (words.length ? " " : "")),
                );
              } else {
                clearInterval(timeout);
                controller.close();
                resolve();
              }
            }, 1);
          });
        },
        cancel() {
          clearTimeout(timeout);
        },
      }),
    );
    assertEquals<unknown>(
      defaultBuffer.buffer,
      new TextEncoder().encode(defaultFileContent),
    );
  },
});

Deno.test({
  name: "polyfill - writeFileSync",
  fn() {
    DenoPolyfill.writeFileSync(url, new Uint8Array([3, 4, 5]));
    assertEquals<unknown>(defaultBuffer.buffer, new Uint8Array([3, 4, 5]));
  },
});

Deno.test({
  name: "polyfill - writeTextFile w/ string",
  async fn() {
    await DenoPolyfill.writeTextFile(url, defaultFileContent);
    assertEquals<unknown>(
      defaultBuffer.buffer,
      new TextEncoder().encode(defaultFileContent),
    );
  },
});

Deno.test({
  name: "polyfill - writeTextFile w/ ReadableStream",
  async fn() {
    let timeout: number;
    await DenoPolyfill.writeTextFile(
      url,
      new ReadableStream({
        start(controller) {
          const words = defaultFileContent.split(" ");
          return new Promise((resolve, _reject) => {
            timeout = setInterval(() => {
              const word = words.shift();
              if (word) {
                controller.enqueue(word + (words.length ? " " : ""));
              } else {
                clearInterval(timeout);
                controller.close();
                resolve();
              }
            }, 1);
          });
        },
        cancel() {
          clearTimeout(timeout);
        },
      }),
    );
    assertEquals<unknown>(
      defaultBuffer.buffer,
      new TextEncoder().encode(defaultFileContent),
    );
  },
});

Deno.test({
  name: "polyfill - writeTextFileSync",
  fn() {
    DenoPolyfill.writeTextFileSync(url, defaultFileContent);
    assertEquals<unknown>(
      defaultBuffer.buffer,
      new TextEncoder().encode(defaultFileContent),
    );
  },
});

Deno.test({
  name: "polyfill - stat",
  async fn() {
    assertEquals<unknown>(await DenoPolyfill.stat(url), defaultBuffer.info);
  },
});

Deno.test({
  name: "polyfill - statSync",
  fn() {
    assertEquals<unknown>(DenoPolyfill.statSync(url), defaultBuffer.info);
  },
});

Deno.test({
  name: "polyfill - lstat",
  async fn() {
    assertEquals<unknown>(await DenoPolyfill.lstat(url), defaultBuffer.info);
  },
});

Deno.test({
  name: "polyfill - lstatSync",
  fn() {
    assertEquals<unknown>(DenoPolyfill.lstatSync(url), defaultBuffer.info);
  },
});
