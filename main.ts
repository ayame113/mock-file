import { readAll } from "https://deno.land/std@0.144.0/streams/mod.ts";
import { serve } from "https://deno.land/std@0.144.0/http/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.4.0/mod.ts";
// import { Buffer } from "https://deno.land/std@0.144.0/io/mod.ts";
import { copy } from "https://deno.land/std@0.144.0/bytes/mod.ts";
import { assert } from "https://deno.land/std@0.144.0/_util/assert.ts";

const MIN_READ = 32 * 1024;
const MAX_SIZE = 2 ** 32 - 2;
export class Buffer {
  static #nextRid = -100;
  rid: number;

  #buf: Uint8Array; // contents are the bytes buf[off : len(buf)]
  #off = 0; // read at buf[off], write at buf[buf.byteLength]

  constructor(ab?: ArrayBufferLike | ArrayLike<number>) {
    this.#buf = ab === undefined ? new Uint8Array(0) : new Uint8Array(ab);
    this.rid = Buffer.#nextRid--;
  }

  /** Returns a slice holding the unread portion of the buffer.
   *
   * The slice is valid for use only until the next buffer modification (that
   * is, only until the next call to a method like `read()`, `write()`,
   * `reset()`, or `truncate()`). If `options.copy` is false the slice aliases the buffer content at
   * least until the next buffer modification, so immediate changes to the
   * slice will affect the result of future reads.
   * @param options Defaults to `{ copy: true }`
   */
  bytes(options = { copy: true }): Uint8Array {
    if (options.copy === false) return this.#buf.subarray(this.#off);
    return this.#buf.slice(this.#off);
  }

  /** Returns whether the unread portion of the buffer is empty. */
  empty(): boolean {
    return this.#buf.byteLength <= this.#off;
  }

  /** A read only number of bytes of the unread portion of the buffer. */
  get length(): number {
    return this.#buf.byteLength - this.#off;
  }

  /** The read only capacity of the buffer's underlying byte slice, that is,
   * the total space allocated for the buffer's data. */
  get capacity(): number {
    return this.#buf.buffer.byteLength;
  }

  /** Discards all but the first `n` unread bytes from the buffer but
   * continues to use the same allocated storage. It throws if `n` is
   * negative or greater than the length of the buffer. */
  truncate(n: number): void {
    if (n === 0) {
      this.reset();
      return;
    }
    if (n < 0 || n > this.length) {
      throw Error("bytes.Buffer: truncation out of range");
    }
    this.#reslice(this.#off + n);
  }

  reset(): void {
    this.#reslice(0);
    this.#off = 0;
  }

  #tryGrowByReslice(n: number) {
    const l = this.#buf.byteLength;
    if (n <= this.capacity - l) {
      this.#reslice(l + n);
      return l;
    }
    return -1;
  }

  #reslice(len: number) {
    assert(len <= this.#buf.buffer.byteLength);
    this.#buf = new Uint8Array(this.#buf.buffer, 0, len);
  }

  /** Reads the next `p.length` bytes from the buffer or until the buffer is
   * drained. Returns the number of bytes read. If the buffer has no data to
   * return, the return is EOF (`null`). */
  readSync(p: Uint8Array): number | null {
    if (this.empty()) {
      // Buffer is empty, reset to recover space.
      this.reset();
      if (p.byteLength === 0) {
        // this edge case is tested in 'bufferReadEmptyAtEOF' test
        return 0;
      }
      return null;
    }
    const nread = copy(this.#buf.subarray(this.#off), p);
    this.#off += nread;
    return nread;
  }

  /** Reads the next `p.length` bytes from the buffer or until the buffer is
   * drained. Resolves to the number of bytes read. If the buffer has no
   * data to return, resolves to EOF (`null`).
   *
   * NOTE: This methods reads bytes synchronously; it's provided for
   * compatibility with `Reader` interfaces.
   */
  read(p: Uint8Array): Promise<number | null> {
    const rr = this.readSync(p);
    return Promise.resolve(rr);
  }

  #grow(n: number) {
    const m = this.length;
    // If buffer is empty, reset to recover space.
    if (m === 0 && this.#off !== 0) {
      this.reset();
    }
    // Fast: Try to grow by means of a reslice.
    const i = this.#tryGrowByReslice(n);
    if (i >= 0) {
      return i;
    }
    const c = this.capacity;
    if (n <= Math.floor(c / 2) - m) {
      // We can slide things down instead of allocating a new
      // ArrayBuffer. We only need m+n <= c to slide, but
      // we instead let capacity get twice as large so we
      // don't spend all our time copying.
      copy(this.#buf.subarray(this.#off), this.#buf);
    } else if (c + n > MAX_SIZE) {
      throw new Error("The buffer cannot be grown beyond the maximum size.");
    } else {
      // Not enough space anywhere, we need to allocate.
      const buf = new Uint8Array(Math.min(2 * c + n, MAX_SIZE));
      copy(this.#buf.subarray(this.#off), buf);
      this.#buf = buf;
    }
    // Restore this.#off and len(this.#buf).
    this.#off = 0;
    this.#reslice(Math.min(m + n, MAX_SIZE));
    return m;
  }

  /** Grows the buffer's capacity, if necessary, to guarantee space for
   * another `n` bytes. After `.grow(n)`, at least `n` bytes can be written to
   * the buffer without another allocation. If `n` is negative, `.grow()` will
   * throw. If the buffer can't grow it will throw an error.
   *
   * Based on Go Lang's
   * [Buffer.Grow](https://golang.org/pkg/bytes/#Buffer.Grow). */
  grow(n: number): void {
    if (n < 0) {
      throw Error("Buffer.grow: negative count");
    }
    const m = this.#grow(n);
    this.#reslice(m);
  }
  seekSync(offset: number, whence: Deno.SeekMode) {
    switch (whence) {
      case Deno.SeekMode.Start:
        return this.#off = offset;
      case Deno.SeekMode.Current:
        return this.#off += offset;
      case Deno.SeekMode.End:
        return this.#off = this.length - offset;
      default:
        throw new Error("unreachable");
    }
  }
}

const f = await Deno.open("./db.sqlite");
const u8 = await readAll(f);
f.close();
const dbBuf = new Buffer(u8.buffer);
const dbRid = dbBuf.rid;
const journalBuf = new Buffer();
const journalRid = journalBuf.rid;

Deno.openSync = function (path: string | URL) {
  if (path === "./db.sqlite") {
    return dbBuf as unknown as Deno.FsFile;
  }
  if (path === "./db.sqlite-journal") {
    return journalBuf as unknown as Deno.FsFile;
  }
  throw new Error("can not open" + path);
};
Deno.seekSync = function (rid: number, offset: number, whence: Deno.SeekMode) {
  if (rid === dbRid) {
    return dbBuf.seekSync(offset, whence);
  }
  throw new Error("can not seek" + rid);
};
Deno.readSync = function (rid: number, buffer: Uint8Array) {
  if (rid === dbRid) {
    return dbBuf.readSync(buffer);
  }
  if (rid === journalRid) {
    return dbBuf.readSync(buffer);
  }
  throw new Error("can not read");
};
Deno.flockSync = console.log("ignore call flockSync") as any;
Deno.funlockSync = console.log("ignore call funlockSync") as any;
Deno.fstatSync = function (rid: number) {
  if (rid === dbRid) {
    return { size: dbBuf.length } as Deno.FileInfo;
  }
  throw new Error("can not read file info");
};

const db = new DB("./db.sqlite", { mode: "read" });
console.log(db.query("select * from sqlite_master;"));

const rows = db.query("SELECT * FROM people");
console.log(rows);

serve(() => Response.json(rows));
