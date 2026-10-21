'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ANALYTICS_URL = process.env.ANALYTICS_URL || 'http://localhost:5000/api/analytics';
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');
const VALID_STATUSES = new Set(['Todo', 'In Progress', 'Done']);
const VALID_PRIORITIES = new Set(['Low', 'Medium', 'High']);

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]\n', 'utf8');
}

function readTasks() {
  ensureDataFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Could not read task data:', error.message);
    throw new Error('Task data could not be read. Check backend-node/data/tasks.json.');
  }
}

function writeTasks(tasks) {
  ensureDataFile();
  const temporaryFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryFile, DATA_FILE);
}

function validateTaskPayload(body, partial = false) {
  const errors = [];
  if (!partial || Object.hasOwn(body, 'title')) {
    if (typeof body.title !== 'string' || body.title.trim().length < 2) {
      errors.push('Title must contain at least 2 characters.');
    } else if (body.title.trim().length > 120) {
      errors.push('Title must be 120 characters or fewer.');
    }
  }
  if (Object.hasOwn(body, 'description') && (typeof body.description !== 'string' || body.description.length > 1000)) {
    errors.push('Description must be text no longer than 1000 characters.');
  }
  if (Object.hasOwn(body, 'status') && !VALID_STATUSES.has(body.status)) {
    errors.push('Status must be Todo, In Progress, or Done.');
  }
  if (Object.hasOwn(body, 'priority') && !VALID_PRIORITIES.has(body.priority)) {
    errors.push('Priority must be Low, Medium, or High.');
  }
  if (Object.hasOwn(body, 'dueDate') && body.dueDate !== null && body.dueDate !== '' &&
      (typeof body.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) || Number.isNaN(Date.parse(`${body.dueDate}T00:00:00Z`)))) {
    errors.push('Due date must be a valid YYYY-MM-DD date or null.');
  }
  return errors;
}

function makeAnalytics(tasks) {
  const todo = tasks.filter((task) => task.status === 'Todo').length;
  const inProgress = tasks.filter((task) => task.status === 'In Progress').length;
  const done = tasks.filter((task) => task.status === 'Done').length;
  const totalTasks = tasks.length;
  return {
    totalTasks,
    todo,
    inProgress,
    done,
    openTasks: todo + inProgress,
    completionRate: totalTasks ? Math.round((done / totalTasks) * 100) : 0,
    priorityBreakdown: {
      Low: tasks.filter((task) => task.priority === 'Low').length,
      Medium: tasks.filter((task) => task.priority === 'Medium').length,
      High: tasks.filter((task) => task.priority === 'High').length
    }
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'taskflow-api', timestamp: new Date().toISOString() });
});

app.get('/api/tasks', (_req, res, next) => {
  try {
    const tasks = readTasks().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(tasks);
  } catch (error) { next(error); }
});

app.get('/api/tasks/:id', (req, res, next) => {
  try {
    const task = readTasks().find((item) => item.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    return res.json(task);
  } catch (error) { return next(error); }
});

app.post('/api/tasks', (req, res, next) => {
  try {
    const errors = validateTaskPayload(req.body || {});
    if (errors.length) return res.status(400).json({ error: 'Validation failed.', details: errors });
    const now = new Date().toISOString();
    const task = {
      id: crypto.randomUUID(),
      title: req.body.title.trim(),
      description: (req.body.description || '').trim(),
      status: req.body.status || 'Todo',
      priority: req.body.priority || 'Medium',
      dueDate: req.body.dueDate || null,
      createdAt: now,
      updatedAt: now
    };
    const tasks = readTasks();
    tasks.push(task);
    writeTasks(tasks);
    return res.status(201).json(task);
  } catch (error) { return next(error); }
});

app.put('/api/tasks/:id', (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateTaskPayload(body, true);
    if (errors.length) return res.status(400).json({ error: 'Validation failed.', details: errors });
    const tasks = readTasks();
    const index = tasks.findIndex((item) => item.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Task not found.' });
    const updated = { ...tasks[index] };
    if (Object.hasOwn(body, 'title')) updated.title = body.title.trim();
    if (Object.hasOwn(body, 'description')) updated.description = body.description.trim();
    if (Object.hasOwn(body, 'status')) updated.status = body.status;
    if (Object.hasOwn(body, 'priority')) updated.priority = body.priority;
    if (Object.hasOwn(body, 'dueDate')) updated.dueDate = body.dueDate || null;
    updated.updatedAt = new Date().toISOString();
    tasks[index] = updated;
    writeTasks(tasks);
    return res.json(updated);
  } catch (error) { return next(error); }
});

app.delete('/api/tasks/:id', (req, res, next) => {
  try {
    const tasks = readTasks();
    const remaining = tasks.filter((item) => item.id !== req.params.id);
    if (remaining.length === tasks.length) return res.status(404).json({ error: 'Task not found.' });
    writeTasks(remaining);
    return res.status(204).send();
  } catch (error) { return next(error); }
});

app.get('/api/analytics', async (_req, res) => {
  const tasks = readTasks();
  try {
    const response = await fetch(ANALYTICS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tasks }),
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) throw new Error(`Analytics service returned ${response.status}`);
    return res.json(await response.json());
  } catch (error) {
    console.warn(`Analytics service unavailable (${error.message}); using API fallback.`);
    return res.json({ ...makeAnalytics(tasks), source: 'node-fallback' });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  console.error(error.stack || error);
  res.status(500).json({ error: error.message || 'Unexpected server error.' });
});

ensureDataFile();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TaskFlow API listening on http://localhost:${PORT}`);
});
