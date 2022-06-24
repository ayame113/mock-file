# mock-file

Some filesystem APIs cannot be used with deno deploy (eg `Deno.readFileSync`,
`Deno.writeFile`).

This module makes a copy of the file in memory beforehand so that you can use
the sync API and write API on deno deploy.

# Usage

Live samples are in [./example/main.ts](./example/main.ts) and
https://deploy-sqlite.deno.dev/.

With this module, SQLite works on deno deploy.

```ts
import { serve } from "https://deno.land/std@0.144.0/http/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.4.0/mod.ts";

import { prepareLocalFile, prepareVirtualFile } from "../mod.ts";

await prepareLocalFile("./db.sqlite");
prepareVirtualFile("./db.sqlite-journal");

// read db
const db = new DB("./db.sqlite", { mode: "read" });

// very simple server
serve(() => Response.json(db.query("SELECT * FROM people")));
```
