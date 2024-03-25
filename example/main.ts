import { serve } from "https://deno.land/std@0.220.1/http/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";

import { prepareLocalFile, prepareVirtualFile } from "../mod.ts";

await prepareLocalFile("./example/db.sqlite");
prepareVirtualFile("./example/db.sqlite-journal");

// read db
const db = new DB("./example/db.sqlite", { mode: "read" });

// very simple server
serve(() => Response.json(db.query("SELECT * FROM people")));
