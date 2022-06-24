import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.144.0/testing/asserts.ts";
import {
  readAll,
  writeAll,
} from "https://deno.land/std@0.144.0/streams/mod.ts";
import { InMemoryFsFile } from "./src/memory_file.ts";

const targetFile = new URL("./tests/tmp.txt", import.meta.url);
const { SeekMode } = Deno;

async function prepareFsFile(
  defaultBuf?: Uint8Array,
): Promise<[InMemoryFsFile, Deno.FsFile]> {
  const buffer = defaultBuf ?? new Uint8Array();
  await Deno.writeFile(targetFile, buffer);
  const realFile = await Deno.open(
    targetFile,
    { create: true, write: true, read: true },
  );
  const mockFile = new InMemoryFsFile({ buffer, info: await realFile.stat() });
  return [mockFile, realFile];
}
async function assertFileContent(mock: InMemoryFsFile, expect?: Uint8Array) {
  // @ts-ignore: for test
  const actual = mock[Symbol.for("readFile")]();
  isSameUint8Array(
    actual,
    await Deno.readFile(targetFile),
  );
  if (expect) {
    isSameUint8Array(actual, expect);
  }
}
function readN(target: Deno.ReaderSync, n: number) {
  const res = new Uint8Array(n);
  return [target.readSync(res), res];
}
function seek(target: Deno.SeekerSync, offset: number, whence: Deno.SeekMode) {
  return target.seekSync(offset, whence);
}
function offset(target: Deno.SeekerSync) {
  return target.seekSync(0, SeekMode.Current);
}
function isSameUint8Array(a: Uint8Array, b: Uint8Array) {
  if (a.length === b.length) {
    return assertEquals(a, b);
  }
  const long = a.length < b.length ? b : a;
  const short = a.length < b.length ? a : b;
  if (long.slice(short.length).every((v) => v === 0)) {
    return assertEquals(short, long.slice(0, short.length));
  } else {
    return assertEquals(short, long);
  }
}

Deno.test({
  name: "isSameUint8Array",
  fn() {
    isSameUint8Array(new Uint8Array(), new Uint8Array());
    isSameUint8Array(new Uint8Array([0]), new Uint8Array([0]));
    isSameUint8Array(new Uint8Array([0]), new Uint8Array());
    isSameUint8Array(new Uint8Array(), new Uint8Array([0]));
    isSameUint8Array(new Uint8Array([1, 0]), new Uint8Array([1]));
    isSameUint8Array(new Uint8Array([1]), new Uint8Array([1, 0]));
    assertThrows(() =>
      isSameUint8Array(new Uint8Array([1]), new Uint8Array([2]))
    );
    assertThrows(() =>
      isSameUint8Array(new Uint8Array([1, 0, 0]), new Uint8Array([2]))
    );
    assertThrows(() =>
      isSameUint8Array(new Uint8Array([1]), new Uint8Array([2, 0, 0]))
    );
  },
});

async function assertsFileState<T>(
  f1: InMemoryFsFile,
  f2: Deno.FsFile,
  func: (arg: Deno.FsFile) => T | Promise<T>,
  expect?: T,
) {
  await assertFileContent(f1);
  assertEquals(offset(f1), offset(f2));
  const [res1, res2] = [await func(f1), await func(f2)];
  assertEquals(res1, res2);
  if (expect != null) {
    assertEquals(res1, expect);
  }
  assertEquals(offset(f1), offset(f2));
  await assertFileContent(f1);
}

Deno.test({
  name: "InMemoryFsFile - statSync",
  async fn() {
    const [f1, f2] = await prepareFsFile();
    await assertsFileState(f1, f2, (f) => f.statSync());
    f1.close();
    f2.close();
  },
});

Deno.test({
  name: "InMemoryFsFile - writeSync",
  async fn() {
    const [f1, f2] = await prepareFsFile();

    const toWrite = new Uint8Array([0, 1, 2, 3, 4, 5, 6]);
    await assertsFileState(f1, f2, (f) => writeAll(f, toWrite));
    f1.close();
    f2.close();
  },
});

Deno.test({
  name: "InMemoryFsFile - readAll",
  async fn() {
    const [f1, f2] = await prepareFsFile(new Uint8Array([0, 1, 2, 3, 4, 5, 6]));
    await assertsFileState(
      f1,
      f2,
      (f) => readAll(f),
      new Uint8Array([0, 1, 2, 3, 4, 5, 6]),
    );
    f1.close();
    f2.close();
  },
});

Deno.test({
  name: "InMemoryFsFile - readSync",
  async fn() {
    const [f1, f2] = await prepareFsFile(new Uint8Array([0, 1, 2, 3, 4, 5, 6]));
    await assertsFileState(
      f1,
      f2,
      (f) => readN(f, 3),
      [3, new Uint8Array([0, 1, 2])],
    );
    await assertsFileState(
      f1,
      f2,
      (f) => readN(f, 3),
      [3, new Uint8Array([3, 4, 5])],
    );
    await assertsFileState(f1, f2, (f) => seek(f, 3, SeekMode.Start), 3);
    await assertsFileState(
      f1,
      f2,
      (f) => readN(f, 3),
      [3, new Uint8Array([3, 4, 5])],
    );
    f1.close();
    f2.close();
  },
});

Deno.test({
  name: "InMemoryFsFile - seekSync (offset)",
  async fn() {
    const [f1, f2] = await prepareFsFile();
    await assertsFileState(
      f1,
      f2,
      (f) => readN(f, 0),
      [0, new Uint8Array([])],
    );
    await assertsFileState(f1, f2, (f) => seek(f, 3, SeekMode.Start), 3);
    await assertsFileState(
      f1,
      f2,
      (f) => writeAll(f, new Uint8Array([1])),
    );
    assertFileContent(f1, new Uint8Array([0, 0, 0, 1]));
    f1.close();
    f2.close();
  },
});

Deno.test({
  name: "InMemoryFsFile - seekSync",
  async fn() {
    const [f1, f2] = await prepareFsFile();
    await assertsFileState(f1, f2, (f) => seek(f, 0, SeekMode.Start), 0);
    await assertsFileState(f1, f2, (f) => seek(f, 10, SeekMode.Start), 10);
    await assertsFileState(f1, f2, (f) => seek(f, 6, SeekMode.Start), 6);
    await assertsFileState(f1, f2, (f) => seek(f, -2, SeekMode.Current), 4);
    await assertsFileState(f1, f2, (f) => seek(f, -3, SeekMode.Current), 1);
    await assertsFileState(f1, f2, (f) => seek(f, 2, SeekMode.Current), 3);
    await assertsFileState(f1, f2, (f) => seek(f, 0, SeekMode.End), 0);
    f1.close();
    f2.close();
  },
});

Deno.test({
  name: "InMemoryFsFile - seekSync from end",
  async fn() {
    const [f1, f2] = await prepareFsFile();
    await assertsFileState(
      f1,
      f2,
      (f) => writeAll(f, new Uint8Array([0, 0, 0])),
    );
    await assertsFileState(f1, f2, (f) => seek(f, 0, SeekMode.End), 3);
    await assertsFileState(f1, f2, (f) => seek(f, -1, SeekMode.End), 2);
    f1.close();
    f2.close();
  },
});

Deno.test({
  name: "InMemoryFsFile - seekSync (throws)",
  async fn() {
    const [f1, f2] = await prepareFsFile();
    assertThrows(() => {
      f1.seekSync(-1, SeekMode.Start);
    });
    assertThrows(() => {
      f2.seekSync(-1, SeekMode.Start);
    });
    f1.close();
    f2.close();
  },
});

Deno.test({
  name: "InMemoryFsFile - seekSync (throws 2)",
  async fn() {
    const [f1, f2] = await prepareFsFile(new Uint8Array([0]));
    assertThrows(() => {
      f1.seekSync(-1, SeekMode.Start);
    });
    assertThrows(() => {
      f2.seekSync(-1, SeekMode.Start);
    });
    f1.close();
    f2.close();
  },
});

Deno.test({
  name: "InMemoryFsFile - truncateSync",
  async fn() {
    const [f1, f2] = await prepareFsFile();
    await assertsFileState(f1, f2, (f) => f.truncateSync());
    await assertsFileState(
      f1,
      f2,
      (f) => writeAll(f, new Uint8Array([0, 1, 2])),
    );
    await assertsFileState(f1, f2, (f) => f.truncateSync());
    await assertsFileState(
      f1,
      f2,
      (f) => writeAll(f, new Uint8Array([0, 1, 2])),
    );
    await assertsFileState(f1, f2, (f) => f.truncateSync(2));
    await assertsFileState(f1, f2, (f) => seek(f, 0, SeekMode.End));
    f1.close();
    f2.close();
  },
});
