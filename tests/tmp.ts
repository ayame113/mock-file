import { serve } from "https://deno.land/std@0.144.0/http/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.4.0/mod.ts";

import { prepareFile } from "../mod.ts";

await prepareFile("./db.sqlite");

// read db
const db = new DB("./db.sqlite", { mode: "read" });

const rows = db.query("SELECT * FROM people");
console.log(rows);

// very simple server
serve(() => Response.json(rows));
