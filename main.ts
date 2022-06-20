import { serve } from "https://deno.land/std@0.144.0/http/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.4.0/mod.ts";

const f = await Deno.open("./db.sqlite");
Deno.openSync = function (path: string | URL) {
  if (path === "./db.sqlite") {
    return f;
  }
  throw new Error("can not open" + path);
};

const db = new DB("./db.sqlite");
const rows = db.query("SELECT * FROM people ");
console.log(rows);

serve(() => Response.json(rows));
