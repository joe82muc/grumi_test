const base = 'https://grumi-test.onrender.com';

async function main() {
  const loginRes = await fetch(base + '/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 's1', password: 'Schueler1!' })
  });

  const login = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    console.error('Login fehlgeschlagen:', login);
    process.exit(1);
  }

  const headers = { authorization: 'Bearer ' + login.token };

  const topicsRes = await fetch(base + '/api/topics', { headers });
  const topics = await topicsRes.json().catch(() => []);
  if (!topicsRes.ok) {
    console.error('Themen laden fehlgeschlagen:', topics);
    process.exit(1);
  }

  const topic = topics.find((t) => (t.title || "").toLowerCase().includes("radioaktivit"));

  if (!topic) {
    console.error('Thema nicht gefunden. Verfügbare Themen:', topics.map(t => t.title));
    process.exit(1);
  }

  const qRes = await fetch(base + `/api/topics/${topic.id}/questions`, { headers });
  const qData = await qRes.json().catch(() => ({}));
  if (!qRes.ok) {
    console.error('Fragen laden fehlgeschlagen:', qData);
    process.exit(1);
  }

  console.log('OK');
  console.log('Thema:', topic.title);
  console.log('Topic-ID:', topic.id);
  console.log('Fragen:', Array.isArray(qData.questions) ? qData.questions.length : 0);
}

main().catch((e) => {
  console.error('Unerwarteter Fehler:', e.message);
  process.exit(1);
});
