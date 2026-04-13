const base = 'https://grumi-test.onrender.com';

async function main() {
  const loginRes = await fetch(base + '/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'lehrer', password: 'Lehrer123!' })
  });

  const login = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    console.error('Lehrer-Login fehlgeschlagen:', login);
    process.exit(1);
  }

  const headers = { authorization: 'Bearer ' + login.token };

  const res = await fetch(base + '/api/teacher/results', { headers });
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    console.error('Lehrer-Ergebnisse laden fehlgeschlagen:', data);
    process.exit(1);
  }

  console.log('OK');
  console.log('Ergebnisanzahl:', Array.isArray(data) ? data.length : 0);
}

main().catch((e) => {
  console.error('Unerwarteter Fehler:', e.message);
  process.exit(1);
});
