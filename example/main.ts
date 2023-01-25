import { serve } from "https://deno.land/std@0.173.0/http/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.7.0/mod.ts";

import { prepareLocalFile, prepareVirtualFile } from "../mod.ts";

await prepareLocalFile("./example/db.sqlite");
prepareVirtualFile("./example/db.sqlite");

// read db
const db = new DB("./example/db.sqlite", { mode: "read" });

// very simple server
serve(() => Response.json(db.query("SELECT * FROM people")));
