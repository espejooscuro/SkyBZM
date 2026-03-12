/* global React, ReactDOM */

const { useState, useEffect } = React;

const API = {
  async login(password) {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    return res.json();
  },

  async getConfig(password) {
    const res = await fetch("/api/config", {
      headers: { "x-password": password },
    });
    return res.json();
  },

  async saveAccount(password, index, account) {
    const res = await fetch(`/api/account/${index}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-password": password,
      },
      body: JSON.stringify(account),
    });
    return res.json();
  },

  async botStatus(password, index) {
    const res = await fetch(`/api/bot/${index}/status`, {
      headers: { "x-password": password },
    });
    return res.json();
  },

  async botStats(password, index) {
    const res = await fetch(`/api/bot/${index}/stats`, {
      headers: { "x-password": password },
    });
    return res.json();
  },

  async botBrain(password, index) {
    const res = await fetch(`/api/bot/${index}/brain`, {
      headers: { "x-password": password },
    });
    return res.json();
  },

  async controlBot(password, index, action) {
    const res = await fetch(`/api/bot/${index}/${action}`, {
      method: "POST",
      headers: { "x-password": password },
    });
    return res.json();
  },
};

function formatNumber(n) {
  if (n == null || isNaN(n)) return "-";
  if (Math.abs(n) >= 1000000000) return (n / 1000000000).toFixed(1) + "B";
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "k";
  return Math.round(n).toString();
}

function LoginScreen({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await API.login(password);
      if (!data.success) {
        setError(data.error || "Incorrect password");
      } else {
        onSuccess(password, data.config);
      }
    } catch (err) {
      console.error(err);
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">💎</div>
          <div>
            <div className="login-title">SkyBZM Panel</div>
            <div className="login-subtitle">Pastel control center</div>
          </div>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="password">
              Web password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>
          <button className="btn btn-primary" disabled={loading || !password}>
            {loading ? "Checking..." : "Enter dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ accounts, activeIndex, onSelect, statuses, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo-pill">SB</div>
        <div>
          <div className="sidebar-title">SkyBZM</div>
          <div className="sidebar-subtitle">Pastel bots</div>
        </div>
      </div>

      <div className="sidebar-section-label">Bots</div>
      <div className="account-list">
        {accounts.map((acc, i) => {
          const st = statuses[i] || {};
          let dotClass = "status-unknown";
          if (st.status === "online") dotClass = "status-online";
          else if (st.status === "offline" || st.exists === false)
            dotClass = "status-offline";
          return (
            <button
              key={acc.index != null ? acc.index : i}
              className={
                "account-pill" + (i === activeIndex ? " active" : "")
              }
              onClick={() => onSelect(i)}
            >
              <div className="account-pill-main">
                <div className="account-circle">
                  {(acc.username && acc.username.slice(0, 2).toUpperCase()) || "B"}
                </div>
                <div className="account-name">{acc.username}</div>
              </div>
              <span className={`status-dot ${dotClass}`} />
            </button>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <button className="btn btn-soft" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}

function ProxySection({ account, onChange }) {
  const proxy = account.proxy || {};
  function update(field, value) {
    onChange({ ...account, proxy: { ...proxy, [field]: value } });
  }

  return (
    <div className="form-grid-two">
      <div className="form-group">
        <div className="field-label">Host</div>
        <input
          className="input"
          value={proxy.host || ""}
          onChange={(e) => update("host", e.target.value)}
          placeholder="proxy.example.com"
        />
      </div>
      <div className="form-group">
        <div className="field-label">Port</div>
          <input
            className="number"
            type="number"
            min="0"
            value={proxy.port != null ? proxy.port : ""}
            onChange={(e) => update("port", Number(e.target.value) || 0)}
          />
      </div>
      <div className="form-group">
        <div className="field-label">Username</div>
        <input
          className="input"
          value={proxy.username || ""}
          onChange={(e) => update("username", e.target.value)}
          placeholder="proxy user"
        />
      </div>
      <div className="form-group">
        <div className="field-label">Password</div>
        <input
          className="input"
          type="password"
          value={proxy.password || ""}
          onChange={(e) => update("password", e.target.value)}
          placeholder="proxy password"
        />
      </div>
    </div>
  );
}

function GeneralConfigTab({ account, onChange }) {
  function updateField(path, value) {
    const clone = { ...account };
    const parts = path.split(".");
    let obj = clone;
    while (parts.length > 1) {
      const k = parts.shift();
      obj[k] = obj[k] || {};
      obj = obj[k];
    }
    obj[parts[0]] = value;
    onChange(clone);
  }

  const rest = account.restSchedule || {
    shortBreaks: { enabled: false, workDuration: 60, breakDuration: 5 },
    dailyRest: { enabled: false, workHours: 16 },
  };

  return (
    <div className="tab-panel">
      <div className="form-group">
        <div className="field-label">Discord Webhook</div>
        <input
          className="input mono"
          value={account.discordWebhook || ""}
          onChange={(e) => updateField("discordWebhook", e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
        />
      </div>

      <div className="toggle-row">
        <div className="toggle-text">Bot enabled</div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={!!account.enabled}
            onChange={(e) => updateField("enabled", e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="toggle-row">
        <div className="toggle-text">Auto start with launcher</div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={!!account.autoStart}
            onChange={(e) => updateField("autoStart", e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div style={{ marginTop: 8, marginBottom: 4, fontSize: 12 }}>
        <strong>Proxy</strong>
      </div>
      <ProxySection account={account} onChange={onChange} />

      <div style={{ marginTop: 10, marginBottom: 4, fontSize: 12 }}>
        <strong>Rest schedule</strong>
      </div>
      <div className="toggle-row">
        <div className="toggle-text">Short breaks</div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={!!(rest.shortBreaks && rest.shortBreaks.enabled)}
            onChange={(e) =>
              updateField("restSchedule", {
                ...rest,
                shortBreaks: {
                  ...(rest.shortBreaks || {}),
                  enabled: e.target.checked,
                },
              })
            }
          />
          <span className="toggle-slider" />
        </label>
      </div>
      <div className="form-grid-two">
        <div className="form-group">
          <div className="field-label">Work (minutes)</div>
          <input
            className="number"
            type="number"
            min="5"
            value={
              rest.shortBreaks && rest.shortBreaks.workDuration != null
                ? rest.shortBreaks.workDuration
                : 60
            }
            onChange={(e) =>
              updateField("restSchedule", {
                ...rest,
                shortBreaks: {
                  ...(rest.shortBreaks || {}),
                  workDuration: Number(e.target.value) || 0,
                },
              })
            }
          />
        </div>
        <div className="form-group">
          <div className="field-label">Break (minutes)</div>
          <input
            className="number"
            type="number"
            min="1"
            value={
              rest.shortBreaks && rest.shortBreaks.breakDuration != null
                ? rest.shortBreaks.breakDuration
                : 5
            }
            onChange={(e) =>
              updateField("restSchedule", {
                ...rest,
                shortBreaks: {
                  ...(rest.shortBreaks || {}),
                  breakDuration: Number(e.target.value) || 0,
                },
              })
            }
          />
        </div>
      </div>

      <div className="toggle-row" style={{ marginTop: 8 }}>
        <div className="toggle-text">Daily rest</div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={!!(rest.dailyRest && rest.dailyRest.enabled)}
            onChange={(e) =>
              updateField("restSchedule", {
                ...rest,
                dailyRest: {
                  ...(rest.dailyRest || {}),
                  enabled: e.target.checked,
                },
              })
            }
          />
          <span className="toggle-slider" />
        </label>
      </div>
      <div className="form-group">
        <div className="field-label">Work hours per day</div>
        <input
          className="number"
          type="number"
          min="1"
          max="23"
          value={
            rest.dailyRest && rest.dailyRest.workHours != null
              ? rest.dailyRest.workHours
              : 16
          }
          onChange={(e) =>
            updateField("restSchedule", {
              ...rest,
              dailyRest: {
                ...(rest.dailyRest || {}),
                workHours: Number(e.target.value) || 0,
              },
            })
          }
        />
      </div>
    </div>
  );
}

function BrainTab({ brain }) {
  if (!brain || !brain.success) {
    return (
      <div className="tab-panel brain-panel">
        Bot offline or no brain data.
      </div>
    );
  }

  const current = brain.currentTask ? [brain.currentTask] : [];
  const queued = Array.isArray(brain.queuedTasks) ? brain.queuedTasks : [];
  const summary = [
    {
      label: "Queue length",
      value:
        brain.queueLength != null ? brain.queueLength : queued.length,
    },
    { label: "Running", value: brain.running ? "Yes" : "No" },
    { label: "Paused", value: brain.paused ? "Yes" : "No" },
  ];

  function renderList(list) {
    if (!list.length) return <div className="muted">—</div>;
    return list.slice(0, 5).map((t) => {
      const meta = t.metadata || {};
      const type = meta.type || "unknown";
      const label = meta.label || type;
      return (
        <div key={t.id} className="brain-task-pill">
          <strong>{label}</strong>{" "}
          <span className="muted">({type.toLowerCase()})</span>
        </div>
      );
    });
  }

  return (
    <div className="tab-panel brain-panel">
      <div className="kpi-row" style={{ marginBottom: 6 }}>
        {summary.map((s) => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="brain-columns">
        <div className="brain-col-card">
          <div className="brain-col-title">Current</div>
          {renderList(current)}
        </div>
        <div className="brain-col-card">
          <div className="brain-col-title">Queued</div>
          {renderList(queued)}
        </div>
        <div className="brain-col-card">
          <div className="brain-col-title">Recently executed</div>
          <div className="muted">Coming soon</div>
        </div>
      </div>
    </div>
  );
}

function FlipsTab({ account, onChange }) {
  const flipConfigs = account.flipConfigs || [];

  function updateFlip(i, patch) {
    const next = flipConfigs.map((f, idx) =>
      idx === i ? { ...f, ...patch } : f
    );
    onChange({ ...account, flipConfigs: next });
  }

  function addFlip(type) {
    const base = { type, enabled: true };
    let flip;
    if (type === "NPC") {
      flip = { ...base, item: "", forceSellAfter: 1, minSpread: 0 };
    } else if (type === "KAT") {
      flip = { ...base, useKatFlower: false, pet: "" };
    } else if (type === "CRAFT") {
      flip = {
        ...base,
        pattern: Array.from({ length: 3 }, () =>
          Array.from({ length: 3 }, () => ({ item: "", amount: 0 }))
        ),
      };
    } else if (type === "FORGE") {
      flip = { ...base, item: "" };
    } else {
      flip = {
        ...base,
        maxBuyPrice: 5000000,
        minProfit: 50000,
        minVolume: 1000,
        maxFlips: 5,
        maxRelist: 3,
        sellTimeout: 5, // minutes (UI)
      };
    }
    onChange({ ...account, flipConfigs: [...flipConfigs, flip] });
  }

  function removeFlip(i) {
    const next = flipConfigs.filter((_, idx) => idx !== i);
    onChange({ ...account, flipConfigs: next });
  }

  function renderCraftGrid(flip, idx) {
    const pattern = flip.pattern || [];
    function selectCell(r, c) {
      const cell = pattern[r][c];
      const item = prompt("Item ID (e.g. WHEAT)", cell.item || "") || "";
      const amtStr = prompt(
        "Amount (1-64)",
        cell.amount ? String(cell.amount) : "1"
      );
      let amount = parseInt(amtStr, 10);
      if (isNaN(amount) || amount < 1) amount = 1;
      if (amount > 64) amount = 64;
      const nextPattern = pattern.map((row, ri) =>
        row.map((cell2, ci) =>
          ri === r && ci === c ? { item, amount } : cell2
        )
      );
      updateFlip(idx, { pattern: nextPattern });
    }

    return (
      <>
        <div className="craft-grid">
          {pattern.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                className={
                  "craft-cell" + (cell.item ? " filled" : "")
                }
                onClick={() => selectCell(r, c)}
              >
                {cell.item ? cell.amount || 1 : ""}
              </button>
            ))
          )}
        </div>
      </>
    );
  }

  function renderFlipBody(flip, idx) {
    const type = flip.type || "SELL_ORDER";
    if (type === "NPC") {
      return (
        <div className="flip-body">
          <div className="flip-row">
            <span className="flip-label">Item</span>
            <input
              className="input"
              value={flip.item || ""}
              onChange={(e) => updateFlip(idx, { item: e.target.value })}
              placeholder="SKYBLOCK_ID"
            />
          </div>
          <div className="flip-row">
            <span className="flip-label">Min spread %</span>
            <input
              className="number"
              type="number"
              min="0"
              value={flip.minSpread != null ? flip.minSpread : 0}
              onChange={(e) =>
                updateFlip(idx, { minSpread: Number(e.target.value) || 0 })
              }
            />
          </div>
          <div className="flip-row">
            <span className="flip-label">Force sell after (min)</span>
            <input
              className="number"
              type="number"
              min="1"
              value={
                flip.forceSellAfter != null ? flip.forceSellAfter : 1
              }
              onChange={(e) =>
                updateFlip(idx, {
                  forceSellAfter: Number(e.target.value) || 1,
                })
              }
            />
          </div>
        </div>
      );
    }

    if (type === "KAT") {
      return (
        <div className="flip-body">
          <div className="toggle-row">
            <div className="toggle-text">Use Kat Flower</div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={!!flip.useKatFlower}
                onChange={(e) =>
                  updateFlip(idx, { useKatFlower: e.target.checked })
                }
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="flip-row" style={{ marginTop: 4 }}>
            <span className="flip-label">Pet</span>
            <input
              className="input"
              value={flip.pet || ""}
              onChange={(e) => updateFlip(idx, { pet: e.target.value })}
              placeholder="PET_SKYBLOCK_ID"
            />
          </div>
        </div>
      );
    }

    if (type === "CRAFT") {
      return (
        <div className="flip-body">
          <div className="flip-row">
            <span className="flip-label">Crafting grid</span>
          </div>
          {renderCraftGrid(flip, idx)}
        </div>
      );
    }

    if (type === "FORGE") {
      return (
        <div className="flip-body">
          <div className="flip-row">
            <span className="flip-label">Item</span>
            <input
              className="input"
              value={flip.item || ""}
              onChange={(e) => updateFlip(idx, { item: e.target.value })}
              placeholder="FORGE_ITEM_ID"
            />
          </div>
        </div>
      );
    }

    // Generic sell-order style flip
    return (
      <div className="flip-body">
        <div className="flip-row">
          <span className="flip-label">Max buy price</span>
          <input
            className="number"
            type="number"
            min="0"
            value={flip.maxBuyPrice != null ? flip.maxBuyPrice : 0}
            onChange={(e) =>
              updateFlip(idx, { maxBuyPrice: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="flip-row">
          <span className="flip-label">Min profit</span>
          <input
            className="number"
            type="number"
            min="0"
            value={flip.minProfit != null ? flip.minProfit : 0}
            onChange={(e) =>
              updateFlip(idx, { minProfit: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="flip-row">
          <span className="flip-label">Min volume</span>
          <input
            className="number"
            type="number"
            min="0"
            value={flip.minVolume != null ? flip.minVolume : 0}
            onChange={(e) =>
              updateFlip(idx, { minVolume: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="flip-row">
          <span className="flip-label">Sell timeout (min)</span>
          <input
            className="number"
            type="number"
            min="1"
            value={
              flip.sellTimeout && flip.sellTimeout > 1000
                ? Math.round(flip.sellTimeout / 60000)
                : flip.sellTimeout != null
                ? flip.sellTimeout
                : 5
            }
            onChange={(e) => {
              const minutes = Number(e.target.value) || 1;
              updateFlip(idx, { sellTimeout: minutes * 60000 });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div style={{ marginBottom: 8, fontSize: 12, display: "flex", gap: 6 }}>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => addFlip("SELL_ORDER")}
        >
          + Sell order
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => addFlip("NPC")}
        >
          + NPC
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => addFlip("KAT")}
        >
          + Kat
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => addFlip("CRAFT")}
        >
          + Craft
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => addFlip("FORGE")}
        >
          + Forge
        </button>
      </div>

      <div className="flips-grid">
        {flipConfigs.map((flip, idx) => {
          const type = flip.type || "SELL_ORDER";
          return (
            <div key={idx} className="flip-card">
              <div className="flip-header">
                <div className="flip-type-pill">{type}</div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={flip.enabled !== false}
                    onChange={(e) =>
                      updateFlip(idx, { enabled: e.target.checked })
                    }
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
              {renderFlipBody(flip, idx)}
              <div className="flip-footer">
                <button
                  type="button"
                  className="btn-ghost danger"
                  onClick={() => removeFlip(idx)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsTab({ stats }) {
  return (
    <div className="tab-panel">
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Profit</div>
          <div className="kpi-value">
            {formatNumber(stats.currentProfit || 0)}{" "}
            <span className="kpi-caption">coins</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Coins / hour</div>
          <div className="kpi-value">
            {formatNumber(stats.coinsPerHour || 0)}{" "}
            <span className="kpi-caption">coins/h</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Successful flips</div>
          <div className="kpi-value">
            {formatNumber(stats.successfulFlips || 0)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Failed flips</div>
          <div className="kpi-value">
            {formatNumber(stats.failedFlips || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

function BotView({
  account,
  index,
  password,
  onAccountChange,
  status,
  stats,
  brain,
  onRefreshStatus,
}) {
  const [activeTab, setActiveTab] = useState("brain");

  function save() {
    onAccountChange(account, true);
  }

  const statusLabel =
    status && status.status === "online"
      ? "Online"
      : status && status.exists === false
      ? "Not running"
      : "Unknown";

  return (
    <div className="main-region">
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="top-title">{account.username}</div>
          <div className="top-subtitle">
            Account {index} · {statusLabel}
          </div>
        </div>
        <div className="bot-controls">
          <button
            type="button"
            className="btn-icon primary"
            onClick={() => API.controlBot(password, index, "start").then(onRefreshStatus)}
          >
            ▶ Start
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => API.controlBot(password, index, "stop").then(onRefreshStatus)}
          >
            ■ Stop
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() =>
              API.controlBot(password, index, "restart").then(onRefreshStatus)
            }
          >
            ⟳ Restart
          </button>
          <button type="button" className="btn-icon" onClick={save}>
            💾 Save
          </button>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Purse</div>
          <div className="kpi-value">
            {formatNumber(stats.currentPurse || 0)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Coins gained</div>
          <div className="kpi-value">
            {formatNumber(stats.currentProfit || 0)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Runtime (s)</div>
          <div className="kpi-value">
            {formatNumber((stats.runtime || 0) / 1000)}
          </div>
        </div>
      </div>

      <div className="bot-layout">
        <div className="bot-overview-card">
          <div className="bot-overview-header">
            <div className="bot-overview-main">
              <div className="bot-avatar">
                <img
                  src={`https://mc-heads.net/head/${encodeURIComponent(
                    account.username || "Steve"
                  )}/64`}
                  alt={account.username}
                  onError={(e) => {
                    e.target.src = `https://minotar.net/avatar/${encodeURIComponent(
                      account.username || "Steve"
                    )}/64`;
                  }}
                />
              </div>
              <div>
                <div className="bot-name">{account.username}</div>
                <div className="bot-tagline">
                  {statusLabel} · {stats.isLogged ? "Logged in" : "Not logged"}
                </div>
              </div>
            </div>
            <div className="chip chip-live">Live brain</div>
          </div>

          <div className="bot-overview-stats">
            <div className="stat-line">
              <span>Profit</span>
              <strong>{formatNumber(stats.currentProfit || 0)}c</strong>
            </div>
            <div className="stat-line">
              <span>Coins / h</span>
              <strong>{formatNumber(stats.coinsPerHour || 0)}</strong>
            </div>
            <div className="stat-line">
              <span>Success</span>
              <strong>{formatNumber(stats.successfulFlips || 0)}</strong>
            </div>
            <div className="stat-line">
              <span>Fails</span>
              <strong>{formatNumber(stats.failedFlips || 0)}</strong>
            </div>
          </div>
        </div>

        <div>
          <div className="tabs">
            <button
              className={"tab" + (activeTab === "brain" ? " active" : "")}
              onClick={() => setActiveTab("brain")}
            >
              Bot brain
            </button>
            <button
              className={"tab" + (activeTab === "flips" ? " active" : "")}
              onClick={() => setActiveTab("flips")}
            >
              Flips
            </button>
            <button
              className={"tab" + (activeTab === "config" ? " active" : "")}
              onClick={() => setActiveTab("config")}
            >
              Config
            </button>
            <button
              className={"tab" + (activeTab === "stats" ? " active" : "")}
              onClick={() => setActiveTab("stats")}
            >
              Stats
            </button>
          </div>

          {activeTab === "brain" && <BrainTab brain={brain} />}
          {activeTab === "flips" && (
            <FlipsTab
              account={account}
              onChange={(acc) => onAccountChange(acc, false)}
            />
          )}
          {activeTab === "config" && (
            <GeneralConfigTab
              account={account}
              onChange={(acc) => onAccountChange(acc, false)}
            />
          )}
          {activeTab === "stats" && <StatsTab stats={stats} />}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [password, setPassword] = useState(null);
  const [config, setConfig] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statuses, setStatuses] = useState({});
  const [stats, setStats] = useState({});
  const [brain, setBrain] = useState({});

  const accounts = (config && config.accounts) || [];

  function handleLogin(pw, cfg) {
    setPassword(pw);
    setConfig(cfg);
  }

  function logout() {
    setPassword(null);
    setConfig(null);
    setStatuses({});
    setStats({});
    setBrain({});
  }

  useEffect(() => {
    if (password && accounts.length) {
      const idx = selectedIndex;
      API.botStatus(password, idx).then((s) =>
        setStatuses((prev) => ({ ...prev, [idx]: s }))
      );
      API.botStats(password, idx).then((st) =>
        setStats((prev) => ({ ...prev, [idx]: st }))
      );
      API.botBrain(password, idx).then((b) =>
        setBrain((prev) => ({ ...prev, [idx]: b }))
      );
    }
  }, [password, selectedIndex, accounts.length]);

  function updateAccount(updated, saveAfter = false) {
    const idx =
      updated.index != null ? updated.index : selectedIndex;
    const nextAccounts = accounts.map((acc, i) =>
      i === idx ? updated : acc
    );
    const nextConfig = { ...config, accounts: nextAccounts };
    setConfig(nextConfig);
    if (saveAfter && password != null) {
      API.saveAccount(password, idx, updated).then((saved) => {
        const finalAccounts = accounts.map((acc, i) =>
          i === idx ? saved : acc
        );
        setConfig({ ...config, accounts: finalAccounts });
      });
    }
  }

  if (!password || !config) {
    return <LoginScreen onSuccess={handleLogin} />;
  }

  const currentAccount = accounts[selectedIndex] || accounts[0];
  const currentStats = stats[selectedIndex] || {};
  const currentBrain = brain[selectedIndex] || {};
  const currentStatus = statuses[selectedIndex] || {};

  return (
    <div className="app-shell">
      <Sidebar
        accounts={accounts}
        activeIndex={selectedIndex}
        onSelect={setSelectedIndex}
        statuses={statuses}
        onLogout={logout}
      />
      <BotView
        account={currentAccount}
        index={selectedIndex}
        password={password}
        onAccountChange={updateAccount}
        status={currentStatus}
        stats={currentStats}
        brain={currentBrain}
        onRefreshStatus={() =>
          API.botStatus(password, selectedIndex).then((s) =>
            setStatuses((prev) => ({ ...prev, [selectedIndex]: s }))
          )
        }
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

