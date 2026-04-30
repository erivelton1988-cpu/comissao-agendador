const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const DB_FILE = path.join('/tmp', 'comissao.json');

function lerDB() {
  try {
    if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch(e) {}
  return { meses: {} };
}

function salvarDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db), 'utf8');
}

function proximoId(db) {
  let max = 0;
  Object.values(db.meses).forEach(rows => rows.forEach(r => { if (r.id > max) max = r.id; }));
  return max + 1;
}

// Busca agendamentos do mês
app.get('/api/:mes', (req, res) => {
  const db = lerDB();
  res.json(db.meses[req.params.mes] || []);
});

// Adiciona agendamento
app.post('/api/:mes', (req, res) => {
  const db = lerDB();
  const mes = req.params.mes;
  if (!db.meses[mes]) db.meses[mes] = [];
  const row = { id: proximoId(db), mes, cliente: req.body.cliente || '', data: req.body.data || '', valor: req.body.valor || 0 };
  db.meses[mes].push(row);
  salvarDB(db);
  res.json(row);
});

// Atualiza agendamento
app.put('/api/item/:id', (req, res) => {
  const db = lerDB();
  const id = parseInt(req.params.id);
  let found = null;
  Object.values(db.meses).forEach(rows => {
    const r = rows.find(r => r.id === id);
    if (r) { r.cliente = req.body.cliente || ''; r.data = req.body.data || ''; r.valor = req.body.valor || 0; found = r; }
  });
  salvarDB(db);
  res.json(found || {});
});

// Remove agendamento
app.delete('/api/item/:id', (req, res) => {
  const db = lerDB();
  const id = parseInt(req.params.id);
  Object.keys(db.meses).forEach(mes => { db.meses[mes] = db.meses[mes].filter(r => r.id !== id); });
  salvarDB(db);
  res.json({ ok: true });
});

// Lista meses
app.get('/api-meses/lista', (req, res) => {
  const db = lerDB();
  const lista = Object.entries(db.meses).map(([mes, rows]) => ({
    mes, total: rows.length, faturamento: rows.reduce((s, r) => s + (r.valor || 0), 0)
  })).sort((a, b) => b.mes.localeCompare(a.mes));
  res.json(lista);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
