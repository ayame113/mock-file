import { DB } from "https://deno.land/x/sqlite@v3.4.0/mod.ts";
Deno.removeSync("./db.sqlite");
const db = new DB("./db.sqlite");
db.execute(`
  CREATE TABLE people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    age REAL,
    city TEXT
  );
  INSERT INTO people (name, age, city) VALUES ('Peter Parker', 21, 'nyc');
`);
const rows = db.query("SELECT * FROM people ");
console.log(rows);
