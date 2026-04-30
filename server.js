const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Glitch usa /tmp para arquivos persistentes ou .data
const DB_PATH = process.env.PROJECT_DOMAIN ? '.data/comissao.db' : 'comissao.db';

// Garante que a pasta .data existe
const fs = require('fs');
if (!fs.existsSync('.data')) fs.mkdirSync('.data', { recursive: true });

const db = new Database(DB_PATH);

// Cria tabela se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes TEXT NOT NULL,
    cliente TEXT DEFAULT '',
    data TEXT DEFAULT '',
    valor REAL DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── ROTAS API ──────────────────────────────────────────────────────────

// Busca todos os agendamentos de um mês
app.get('/api/:mes', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM agendamentos WHERE mes = ? ORDER BY id ASC').all(req.params.mes);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Adiciona agendamento
app.post('/api/:mes', (req, res) => {
  try {
    const { cliente, data, valor } = req.body;
    const info = db.prepare('INSERT INTO agendamentos (mes, cliente, data, valor) VALUES (?, ?, ?, ?)').run(req.params.mes, cliente || '', data || '', valor || 0);
    const row = db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(info.lastInsertRowid);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Atualiza agendamento
app.put('/api/item/:id', (req, res) => {
  try {
    const { cliente, data, valor } = req.body;
    db.prepare('UPDATE agendamentos SET cliente = ?, data = ?, valor = ? WHERE id = ?').run(cliente || '', data || '', valor || 0, req.params.id);
    const row = db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remove agendamento
app.delete('/api/item/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM agendamentos WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Lista meses com dados
app.get('/api-meses/lista', (req, res) => {
  try {
    const rows = db.prepare("SELECT mes, COUNT(*) as total, SUM(valor) as faturamento FROM agendamentos GROUP BY mes ORDER BY mes DESC").all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
