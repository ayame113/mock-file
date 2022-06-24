import { assert } from "https://deno.land/std@0.144.0/testing/asserts.ts";
import { copy } from "https://deno.land/std@0.144.0/bytes/mod.ts";
import {
  fromFileUrl,
  resolve,
} from "https://deno.land/std@0.144.0/path/mod.ts";

export function pathFromURL(path: string | URL) {
  if (path instanceof URL || path.startsWith("file:")) {
    return fromFileUrl(path);
  }
  return resolve(path);
}

export class VirtualFile {
  static readonly pathToFile: Record<string, VirtualFile | undefined> = {};
  buffer: Uint8Array;
  readonly info: Deno.FileInfo;
  constructor(
    path: string,
    buffer: Uint8Array,
    info: Deno.FileInfo,
  ) {
    this.buffer = buffer;
    this.info = info;
    VirtualFile.pathToFile[path] = this;
  }
}

export class InMemoryFsFile implements Deno.FsFile {
  static readonly ridToFile: Record<number, InMemoryFsFile | undefined> = {};
  static #nextRid = -100;
  #offset = 0;
  #rid;
  #file;
  constructor(virtualFile: {
    buffer: Uint8Array;
    info: Deno.FileInfo;
  }) {
    this.#file = virtualFile;
    this.#rid = InMemoryFsFile.#nextRid--;
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
    return this.#file.info;
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
  [Symbol.for("readFile")]() {
    return this.#file.buffer.slice();
  }
  [Symbol.for("writeFile")](buf: Uint8Array) {
    this.#file.buffer = buf;
  }
}
