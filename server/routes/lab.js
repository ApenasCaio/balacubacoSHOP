const express = require('express');
const { generateFlag, validateFlag, resolveHandle } = require('../utils/flags');
const { insertRows, selectOne, selectRows, updateRows, deleteRows } = require('../lib/supabase');

const router = express.Router();
const ACTIVE_WINDOW_MS = 60 * 1000;
const leaderboardClients = new Set();
const LEADERBOARD_REFRESH_MS = 5000;
const MASTER_PASSWORD = process.env.LAB_MASTER_PASSWORD || 'b@cubaco1!';

function getLabParticipantId(req) {
  const headerValue = req.headers && req.headers['x-lab-participant-id'];
  const queryValue = req.query && req.query.participantId;
  return (headerValue || queryValue || '').toString().trim();
}

function parseTimestamp(value) {
  if (!value) return null;
  const ts = Date.parse(String(value));
  return Number.isFinite(ts) ? ts : null;
}

async function recordLabActivity(req, extra = {}) {
  const participantId = getLabParticipantId(req);
  if (!participantId) return null;

  const now = Date.now();
  const current = {
    participantId,
    handle: '',
    firstSeenAt: now,
    lastSeenAt: now,
  };

  const handle = extra.handle || resolveHandle(req) || (req.session && req.session.handle) || current.handle || '';
  if (!handle) return null;

  const next = {
    ...current,
    handle,
    firstSeenAt: current.firstSeenAt || now,
    lastSeenAt: now,
  };

  try {
    const existingPresence = await selectOne('lab_presence', [['participant_id', 'eq', participantId]], 'participant_id');
    if (existingPresence) {
      await updateRows('lab_presence', [['participant_id', 'eq', participantId]], {
        handle,
        last_seen_at: new Date(now).toISOString(),
      });
    } else {
      await insertRows('lab_presence', {
        participant_id: participantId,
        handle,
        first_seen_at: new Date(now).toISOString(),
        last_seen_at: new Date(now).toISOString(),
      });
    }
    await updateRows('lab_progress', [['participant_id', 'eq', participantId]], { handle });
  } catch (_err) {
    // Best-effort only. A participant may exist only in presence table cache until the first solve.
  }

  return next;
}

async function buildLeaderboardRows() {
  const now = Date.now();
  const [progressRows, missions] = await Promise.all([
    selectRows('lab_progress', { select: 'participant_id,handle,mission_code,solved_at' }),
    selectRows('missions', { select: 'code,points', order: 'sort_order.asc' }),
  ]);

  const missionPoints = new Map(missions.map((mission) => [String(mission.code).toUpperCase(), Number(mission.points || 0)]));
  const rows = new Map();

  for (const row of progressRows) {
    const participantId = String(row.participant_id || '').trim();
    if (!participantId) continue;
    const solvedAt = parseTimestamp(row.solved_at);
    const existing = rows.get(participantId) || {
      participantId,
      handle: '',
      solvedCount: 0,
      score: 0,
      firstSeenAt: null,
      lastSeenAt: null,
    };

    rows.set(participantId, {
      ...existing,
      handle: row.handle || existing.handle,
      solvedCount: existing.solvedCount + 1,
      score: existing.score + (missionPoints.get(String(row.mission_code || '').toUpperCase()) || 0),
      firstSeenAt: existing.firstSeenAt || solvedAt,
      lastSeenAt: solvedAt || existing.lastSeenAt,
    });
  }

  const presenceRows = await selectRows('lab_presence', {
    select: 'participant_id,handle,first_seen_at,last_seen_at',
  });

  for (const presence of presenceRows) {
    const participantId = String(presence.participant_id || '').trim();
    if (!participantId) continue;
    const existing = rows.get(participantId) || {
      participantId,
      handle: '',
      solvedCount: 0,
      score: 0,
      firstSeenAt: null,
      lastSeenAt: null,
    };

    rows.set(participantId, {
      ...existing,
      handle: presence.handle || existing.handle,
      firstSeenAt: existing.firstSeenAt || parseTimestamp(presence.first_seen_at),
      lastSeenAt: Math.max(existing.lastSeenAt || 0, parseTimestamp(presence.last_seen_at) || 0),
    });
  }

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      isActive: !!row.lastSeenAt && (now - row.lastSeenAt) <= ACTIVE_WINDOW_MS,
      participantTag: row.participantId ? row.participantId.slice(-4).toUpperCase() : '----',
      activeForSeconds: row.firstSeenAt ? Math.max(0, Math.floor((now - row.firstSeenAt) / 1000)) : 0,
      lastSeenAt: row.lastSeenAt ? new Date(row.lastSeenAt).toISOString() : null,
      firstSeenAt: row.firstSeenAt ? new Date(row.firstSeenAt).toISOString() : null,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return (parseTimestamp(b.lastSeenAt) || 0) - (parseTimestamp(a.lastSeenAt) || 0);
    })
    .map((row, index) => ({ ...row, position: index + 1 }));
}

async function buildLeaderboardPayload() {
  const leaderboard = await buildLeaderboardRows();
  return {
    updatedAt: new Date().toISOString(),
    activeCount: leaderboard.filter((row) => row.isActive).length,
    totalParticipants: leaderboard.length,
    leaderboard,
  };
}

function sendSse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function broadcastLeaderboard() {
  const payload = await buildLeaderboardPayload();
  for (const client of leaderboardClients) {
    sendSse(client.res, 'leaderboard', payload);
  }
  return payload;
}

setInterval(() => {
  if (!leaderboardClients.size) return;
  broadcastLeaderboard().catch(() => {});
}, LEADERBOARD_REFRESH_MS);

router.get('/flag-xss', async (req, res, next) => {
  try {
    await recordLabActivity(req);
    const handle = resolveHandle(req);
    res.json({ flag: generateFlag('m03', handle) });
  } catch (err) {
    next(err);
  }
});

router.get('/missions', async (req, res, next) => {
  try {
    await recordLabActivity(req);
    const participantId = getLabParticipantId(req);
    const [missions, progressRows] = await Promise.all([
      selectRows('missions', { select: 'code,title,category,difficulty,description,objective,points,sort_order', order: 'sort_order.asc' }),
      participantId
        ? selectRows('lab_progress', { select: 'mission_code', filters: [['participant_id', 'eq', participantId]] })
        : Promise.resolve([]),
    ]);

    const solved = new Set(progressRows.map((row) => String(row.mission_code || '').toUpperCase()));
    res.json(missions.map((mission) => ({
      code: mission.code,
      title: mission.title,
      category: mission.category,
      difficulty: mission.difficulty,
      description: mission.description,
      objective: mission.objective,
      points: mission.points,
      solved: solved.has(String(mission.code || '').toUpperCase()),
    })));
  } catch (err) {
    next(err);
  }
});

router.get('/progress', async (req, res, next) => {
  try {
    await recordLabActivity(req);
    const participantId = getLabParticipantId(req);
    if (!participantId) return res.status(400).json({ error: 'Participante do laboratorio ausente.' });

    const [rows, missions] = await Promise.all([
      selectRows('lab_progress', {
        select: 'mission_code,solved_at',
        filters: [['participant_id', 'eq', participantId]],
      }),
      selectRows('missions', { select: 'code,title,points' }),
    ]);

    const missionMap = new Map(missions.map((mission) => [String(mission.code || '').toUpperCase(), mission]));
    const solved = rows
      .map((row) => {
        const mission = missionMap.get(String(row.mission_code || '').toUpperCase());
        if (!mission) return null;
        return {
          mission_code: row.mission_code,
          solved_at: row.solved_at,
          points: mission.points,
          title: mission.title,
        };
      })
      .filter(Boolean);

    const totalScore = solved.reduce((acc, row) => acc + Number(row.points || 0), 0);
    res.json({ solved, totalScore });
  } catch (err) {
    next(err);
  }
});

router.post('/heartbeat', async (req, res, next) => {
  try {
    const { handle } = req.body || {};
    const activity = await recordLabActivity(req, { handle });
    if (!activity) return res.status(400).json({ error: 'Participante do laboratorio ausente.' });
    res.json({ ok: true });
    broadcastLeaderboard().catch(() => {});
  } catch (err) {
    next(err);
  }
});

router.post('/admin/clear-participant', async (req, res, next) => {
  try {
    const { participantId, masterPassword } = req.body || {};
    const cleanParticipantId = String(participantId || '').trim();
    if (!cleanParticipantId) {
      return res.status(400).json({ error: 'Participante invalido.' });
    }
    if (masterPassword !== MASTER_PASSWORD) {
      return res.status(401).json({ error: 'Senha mestre incorreta.' });
    }

    await deleteRows('lab_progress', [['participant_id', 'eq', cleanParticipantId]]);
    await deleteRows('lab_presence', [['participant_id', 'eq', cleanParticipantId]]);

    const payload = await broadcastLeaderboard();
    res.json({ ok: true, participantId: cleanParticipantId, leaderboard: payload });
  } catch (err) {
    next(err);
  }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    await recordLabActivity(req);
    res.json(await buildLeaderboardPayload());
  } catch (err) {
    next(err);
  }
});

router.get('/leaderboard/stream', async (req, res, next) => {
  try {
    const participantId = getLabParticipantId(req);
    if (!participantId) {
      return res.status(400).json({ error: 'Participante do laboratorio ausente.' });
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    const client = { res };
    leaderboardClients.add(client);

    sendSse(res, 'ready', { ok: true, updatedAt: new Date().toISOString() });
    sendSse(res, 'leaderboard', await buildLeaderboardPayload());

    const keepAlive = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      leaderboardClients.delete(client);
    });
  } catch (err) {
    next(err);
  }
});

router.post('/submit', async (req, res, next) => {
  try {
    const { handle, code, flag } = req.body || {};
    const participantId = getLabParticipantId(req);
    if (!handle || !code || !flag) {
      return res.status(400).json({ error: 'Informe nome, missao e flag.' });
    }
    if (!participantId) {
      return res.status(400).json({ error: 'Participante do laboratorio ausente.' });
    }

    await recordLabActivity(req, { handle });

    const mission = await selectOne('missions', [['code', 'eq', code]], 'code,title,points');
    if (!mission) return res.status(404).json({ error: 'Missao desconhecida.' });

    const isValid = validateFlag(mission.code, handle, flag);
    if (!isValid) {
      return res.status(400).json({ ok: false, error: 'Flag incorreta ou gerada para outro nome. Tente novamente!' });
    }

    const alreadySolved = await selectOne('lab_progress', [
      ['participant_id', 'eq', participantId],
      ['mission_code', 'eq', mission.code],
    ], 'id');

    if (!alreadySolved) {
      await insertRows('lab_progress', {
        participant_id: participantId,
        session_id: participantId,
        handle,
        mission_code: mission.code,
      });
    }

    const progressRows = await selectRows('lab_progress', {
      select: 'mission_code',
      filters: [['participant_id', 'eq', participantId]],
    });
    const solvedCodes = new Set(progressRows.map((row) => String(row.mission_code || '').toUpperCase()));
    const missions = await selectRows('missions', { select: 'code,points' });
    const missionPoints = new Map(missions.map((row) => [String(row.code || '').toUpperCase(), Number(row.points || 0)]));
    const totalScore = Array.from(solvedCodes).reduce((acc, missionCode) => acc + (missionPoints.get(missionCode) || 0), 0);

    broadcastLeaderboard().catch(() => {});
    res.json({ ok: true, mission: mission.title, points: mission.points, totalScore, alreadySolved: !!alreadySolved });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
