import { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";
// Deno.removeSync("./example/db.sqlite");
const db = new DB("./example/db.sqlite", { mode: "create" });
db.execute(`
  CREATE TABLE people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    age REAL,
    city TEXT
  );
  INSERT INTO people (name, age, city) VALUES ('Peter Parker', 21, 'nyc');
`);
const rows = db.query("SELECT * FROM people");
console.log(rows);
db.close();
