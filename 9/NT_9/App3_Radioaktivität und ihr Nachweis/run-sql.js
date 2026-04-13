const fs = require("fs");
const { Client } = require("pg");

(async () => {
  const client = new Client({
    connectionString: "postgresql://grumi_db_user:tjsB1y4vo98yNWYfZQ2l0Q1EJnadNvop@dpg-d7dsp81j2pic73fr8nt0-a.frankfurt-postgres.render.com/grumi_db",
    ssl: { rejectUnauthorized: false }
  });

  try {
    const sql = fs.readFileSync("fragen_20_radioaktivitaet.sql", "utf8");
    await client.connect();
    await client.query(sql);

    const check = await client.query(`
      SELECT t.title, COUNT(*)::int AS anzahl
      FROM topics t
      JOIN questions q ON q.topic_id = t.id
      WHERE t.title = 'Radioaktivität und ihr Nachweis'
      GROUP BY t.title
    `);

    console.log("Import erfolgreich:");
    console.table(check.rows);
  } catch (e) {
    console.error("Fehler:", e.message);
  } finally {
    await client.end();
  }
})();
