# mock-file

[![codecov](https://codecov.io/gh/ayame113/mock-file/branch/main/graph/badge.svg?token=nAm49gNAw5)](https://codecov.io/gh/ayame113/mock-file)
[![Test](https://github.com/ayame113/mock-file/actions/workflows/test.yml/badge.svg)](https://github.com/ayame113/mock-file/actions/workflows/test.yml)

Some filesystem APIs cannot be used with deno deploy (eg `Deno.readFileSync`,
`Deno.writeFile`).

This module makes a copy of the file in memory beforehand so that you can use
the sync API and write API on deno deploy.

# Usage

Live samples are in [./example/main.ts](./example/main.ts) and
https://deploy-sqlite.deno.dev/.

With this module, SQLite works on deno deploy.

```ts
import {
  prepareLocalFile,
  prepareVirtualFile,
} from "https://deno.land/x/mock_file@$VERSION/mod.ts";

import { serve } from "https://deno.land/std@0.144.0/http/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.4.0/mod.ts";

await prepareLocalFile("./db.sqlite");
prepareVirtualFile("./db.sqlite-journal");

// read db
const db = new DB("./db.sqlite", { mode: "read" });

// very simple server
serve(() => Response.json(db.query("SELECT * FROM people")));
```

# API

### prepareLocalFile(path: string|URL)

Reads the contents of the file into memory. The specified file will be available
to synchronization APIs such as `Deno.openSync()` and `Deno.readTextFileSync()`
after calling this function.

### prepareVirtualFile(path: string|URL, content?: Uint8Array, info: Deno.FileInfo)

Similar to prepareLocalFile, but the file does not have to exist anywhere. You
can use any Uint8Array as the content of the file.

# Support status

- [x] `Deno.FsFile#read(p: Uint8Array): Promise<number | null>`
- [x] `Deno.FsFile#readSync(p: Uint8Array): number | null`
- [x] `Deno.FsFile#write(p: Uint8Array): Promise<number>`
- [x] `Deno.FsFile#writeSync(p: Uint8Array): number`
- [x] `Deno.FsFile#seek(offset: number, whence: Deno.SeekMode): Promise<number>`
- [x] `Deno.FsFile#seekSync(offset: number, whence: Deno.SeekMode): number`
- [x] `Deno.FsFile#stat(): Promise<Deno.FileInfo>`
- [x] `Deno.FsFile#statSync(): Deno.FileInfo`
- [x] `Deno.FsFile#truncate(len?: number | undefined): Promise<void>`
- [x] `Deno.FsFile#truncateSync(len?: number | undefined): void`
- [x] `Deno.FsFile#close()`
- [x] `Deno.FsFile#readable`
- [x] `Deno.FsFile#writable`
- [x] `Deno.FsFile#rid`
- [x] `Deno.read(rid: number, buffer: Uint8Array): Promise<number | null>`
- [x] `Deno.readSync(rid: number, buffer: Uint8Array): number | null`
- [x] `Deno.write(rid: number, data: Uint8Array): Promise<number>`
- [x] `Deno.writeSync(rid: number, data: Uint8Array): number`
- [x] `Deno.seek(rid: number, offset: number, whence: Deno.SeekMode): Promise<number>`
- [x] `Deno.seekSync(rid: number, offset: number, whence: Deno.SeekMode): number`
- [x] `Deno.fstat(rid: number): Promise<Deno.FileInfo>`
- [x] `Deno.fstatSync(rid: number): Deno.FileInfo`
- [x] `Deno.ftruncate(rid: number, len?: number | undefined): Promise<void>`
- [x] `Deno.ftruncateSync(rid: number, len?: number | undefined): void`
- [x] `Deno.close(rid: number): void`
- [x] `Deno.open(path: string | URL, options?: Deno.OpenOptions | undefined): Promise<Deno.FsFile>`
- [x] `Deno.openSync(path: string | URL, options?: Deno.OpenOptions | undefined): Deno.FsFile`
- [x] `Deno.readFile(path: string | URL, options?: Deno.ReadFileOptions | undefined): Promise<Uint8Array>`
- [x] `Deno.readFileSync(path: string | URL): Uint8Array`
- [x] `Deno.readTextFile(path: string | URL, options?: Deno.ReadFileOptions | undefined): Promise<string>`
- [x] `Deno.readTextFileSync(path: string | URL): string`
- [x] `Deno.writeFile(path: string | URL, data: Uint8Array, options?: Deno.WriteFileOptions | undefined): Promise<void>`
- [x] `Deno.writeFileSync(path: string | URL, data: Uint8Array, options?: Deno.WriteFileOptions | undefined): void`
- [x] `Deno.writeTextFile(path: string | URL, data: string, options?: Deno.WriteFileOptions | undefined): Promise<void>`
- [x] `Deno.writeTextFileSync(path: string | URL, data: string, options?: Deno.WriteFileOptions | undefined): void`
- [ ] `Deno.fdatasyncSync(rid: number): void`
- [ ] `Deno.fsync(rid: number): Promise<void>`
- [ ] `Deno.fdatasyncSync(rid: number): void`
- [ ] `Deno.fdatasync(rid: number): Promise<void>`
- [ ] `Deno.flock(rid: number, exclusive?: boolean | undefined): Promise<void>`
- [ ] `Deno.flockSync(rid: number, exclusive?: boolean | undefined): void`
- [ ] `Deno.funlock(rid: number): Promise<void>`
- [ ] `Deno.funlockSync(rid: number): void`
- [ ] `Deno.stat(path: string | URL): Promise<Deno.FileInfo>`
- [ ] `Deno.statSync(path: string | URL): Deno.FileInfo`
- [ ] `Deno.truncate(name: string, len?: number | undefined): Promise<void>`
- [ ] `Deno.truncateSync(name: string, len?: number | undefined): void`
