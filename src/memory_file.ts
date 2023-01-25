import { assert } from "https://deno.land/std@0.173.0/testing/asserts.ts";
import { copy } from "https://deno.land/std@0.173.0/bytes/mod.ts";
import {
  fromFileUrl,
  resolve,
} from "https://deno.land/std@0.173.0/path/mod.ts";

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

/**
 * Preload the file that will be opened/read later.
 *
 * ```ts
 * import { prepareLocalFile } from "https://deno.land/x/mock_file@$VERSION/mod.ts";
 *
 * await prepareLocalFile("./path/to/file.txt")
 *
 * const file = Deno.openSync("./path/to/file.txt")
 * ```
 */
export async function prepareLocalFile(path: string | URL) {
  const [content, info] = await Promise.all([
    Deno.readFile(path),
    Deno.stat(path),
  ]);
  new VirtualFile(path, content, info);
}

/**
 * Preloads virtual file that will be opened/read later.
 * @param path Path to file.
 * @param content Content of file. Default to empty Uint8Array.
 * @param fileInfo The object used as the return value of file.stat.
 *
 * ```ts
 * import { prepareVirtualFile } from "https://deno.land/x/mock_file@$VERSION/mod.ts";
 *
 * const content = new TextEncoder().encode("hello world");
 * prepareVirtualFile("./no/such/file.txt", content);
 *
 * const file = Deno.openSync("./no/such/file.txt");
 * ```
 */
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

export function pathFromURL(path: string | URL) {
  if (path instanceof URL || path.startsWith("file:")) {
    return fromFileUrl(path);
  }
  return resolve(path);
}

/** File system mock. This has a one-to-one correspondence with the path. */
export class VirtualFile {
  static readonly pathToFile: Readonly<
    Record<string, VirtualFile | undefined>
  > = {};
  buffer: Uint8Array;
  readonly info: Deno.FileInfo;
  constructor(
    path: string | URL,
    buffer: Uint8Array,
    info: Deno.FileInfo,
  ) {
    this.buffer = buffer;
    this.info = info;
    // @ts-expect-error: readonly
    VirtualFile.pathToFile[pathFromURL(path)] = this;
  }
}

/** A mock of Deno.FsFile. This has a one-to-one correspondence with rid. */
export class InMemoryFsFile implements Deno.FsFile {
  static readonly ridToFile: Readonly<
    Record<number, InMemoryFsFile | undefined>
  > = {};
  static #nextRid = -100;
  #offset = 0;
  #rid;
  #file;
  constructor(virtualFile: { buffer: Uint8Array; info: Deno.FileInfo }) {
    this.#file = virtualFile;
    this.#rid = InMemoryFsFile.#nextRid--;
    // @ts-expect-error: readonly
    InMemoryFsFile.ridToFile[this.#rid] = this;
  }
  read(p: Uint8Array): Promise<number | null> {
    return Promise.resolve(this.readSync(p));
  }
  readSync(p: Uint8Array): number | null {
    if (p.byteLength === 0) {
      return 0;
    }
    const nread = copy(this.#file.buffer.subarray(this.#offset), p);
    if (nread === 0) {
      return null;
    }
    this.#offset += nread;
    return nread;
  }
  write(p: Uint8Array): Promise<number> {
    return Promise.resolve(this.writeSync(p));
  }
  writeSync(p: Uint8Array): number {
    // write from offset
    const newByteLength = this.#offset + p.byteLength;
    if (this.#file.buffer.byteLength < newByteLength) {
      const newBuffer = new Uint8Array(newByteLength);
      newBuffer.set(this.#file.buffer);
      this.#file.buffer = newBuffer;
    }
    this.#file.buffer.set(p, this.#offset);
    this.#offset += p.byteLength;
    // this.#end = Math.max(this.#end, newByteLength);
    return p.byteLength;
  }
  seek(offset: number, whence: Deno.SeekMode): Promise<number> {
    return Promise.resolve(this.seekSync(offset, whence));
  }
  seekSync(offset: number, whence: Deno.SeekMode): number {
    const newOffset = (() => {
      switch (whence) {
        case Deno.SeekMode.Start:
          return offset;
        case Deno.SeekMode.Current:
          return this.#offset + offset;
        case Deno.SeekMode.End:
          return this.#file.buffer.byteLength + offset;
        default:
          throw new Error("invalid whence");
      }
    })();
    // if (this.#buffer.byteLength <= newOffset && newOffset !== 0) {
    //   const newBuffer = new Uint8Array(newOffset);
    //   newBuffer.set(this.#buffer);
    //   this.#buffer = newBuffer;
    // }
    assert(0 <= newOffset, `invalid offset (${newOffset})`);
    return this.#offset = newOffset;
  }
  stat(): Promise<Deno.FileInfo> {
    return Promise.resolve(this.statSync());
  }
  statSync(): Deno.FileInfo {
    return { ...this.#file.info };
  }
  truncate(len?: number | undefined): Promise<void> {
    return Promise.resolve(this.truncateSync(len));
  }
  truncateSync(len?: number | undefined): void {
    const newLength = len ?? 0;
    assert(newLength <= this.#file.buffer.buffer.byteLength);
    this.#file.buffer = new Uint8Array(this.#file.buffer.buffer, 0, newLength);
  }
  close() {
    // @ts-expect-error: readonly
    delete InMemoryFsFile.ridToFile[this.#rid];
  }
  get readable(): ReadableStream<Uint8Array> {
    return new ReadableStream({
      pull: (controller) => {
        const res = this.#file.buffer.slice(this.#offset);
        this.#offset += res.byteLength;
        controller.enqueue(res);
      },
    });
  }
  get writable(): WritableStream<Uint8Array> {
    return new WritableStream({
      write: (value) => {
        this.writeSync(value);
      },
    });
  }
  get rid(): number {
    return this.#rid;
  }
  [Symbol.for("Deno.customInspect")]() {
    return `class MockFsFile {\n` +
      `  static #nextRid = ${InMemoryFsFile.#nextRid};\n` +
      `  #rid: ${this.#rid};\n` +
      `  #file.buffer: ${Deno.inspect(this.#file.buffer)};\n` +
      `  #file.info: ${Deno.inspect(this.#file.info)};\n` +
      `  #offset = ${this.#offset};\n` +
      `}`;
  }
  [Symbol.for("unsafeGetBufferForTestDontUse")]() {
    return this.#file.buffer.slice();
  }
}
