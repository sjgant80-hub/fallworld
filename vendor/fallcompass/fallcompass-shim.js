// ═══════════════════════════════════════════════════════════════════
//  fallcompass-shim.js · sovereign LLM cascade · ◊·κ=1
//
//  Drop this into any sovereign tool's <head> via:
//    <script src="https://sjgant80-hub.github.io/fallcompass/shim.js"></script>
//
//  Then call:
//    const reply = await window.FallCompass.chat({
//      messages: [{ role: 'user', content: 'hello' }],
//      preferredOrder: ['webllm','ollama','anthropic','openai','gemini','openrouter','mistral'],
//    });
//
//  The cascade tries providers in order. First success wins. If one
//  provider rate-limits / errors / 4xx-5xx · falls through to next.
//
//  Provider keys are pulled from:
//    1. localStorage[ 'fallcompass.<provider>.key' ]   ← user-set, sovereign
//    2. window.FALLCOMPASS_KEYS = { anthropic:'sk-ant-...', openai:'sk-...' }
//    3. URL fragment ?fc.anthropic=...  (single-session, never persisted)
//
//  Free / local options need no key:
//    · webllm   — in-browser via @mlc-ai/web-llm CDN (zero cost, slowest)
//    · ollama   — local http://127.0.0.1:11434 (free, fast, your hardware)
//    · openrouter — has free tier models
//
//  Telemetry: ZERO. The shim never phones home. Provider chosen is
//  broadcast on BroadcastChannel('fall-signal') so peer tools can react.
//
//  MIT · part of the AI Native Solutions estate · prime 271+
// ═══════════════════════════════════════════════════════════════════
(function(){
  if (window.FallCompass) return;   // idempotent

  const VERSION = '2.0.0';  // ◊ nas-aware cascade · cube-enriched routing · prime 1303
  const CHAN = 'fall-signal';
  let signal = null;
  try { signal = new BroadcastChannel(CHAN); } catch {}

  function getKey(provider) {
    try {
      const ls = localStorage.getItem('fallcompass.' + provider + '.key');
      if (ls) return ls;
    } catch {}
    if (window.FALLCOMPASS_KEYS && window.FALLCOMPASS_KEYS[provider]) return window.FALLCOMPASS_KEYS[provider];
    const m = location.hash.match(new RegExp('[#&]fc\\.'+provider+'=([^&]+)'));
    if (m) return decodeURIComponent(m[1]);
    return null;
  }

  // ─────── adapters ───────
  const adapters = {
    // ── webllm: in-browser LLM via CDN ──
    webllm: {
      label: 'WebLLM (browser-local)',
      free: true,
      async ready() { return 'gpu' in navigator; },
      _engine: null,
      async ensure() {
        if (this._engine) return this._engine;
        const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm@0.2.79');
        this._engine = await CreateMLCEngine('Llama-3.2-3B-Instruct-q4f32_1-MLC');
        return this._engine;
      },
      async chat({ messages }) {
        const engine = await this.ensure();
        const r = await engine.chat.completions.create({ messages });
        return r.choices[0].message.content;
      },
    },
    // ── ollama: local server, free ──
    ollama: {
      label: 'Ollama (local)',
      free: true,
      async ready() {
        try { const r = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2000) }); return r.ok; }
        catch { return false; }
      },
      async chat({ messages, model }) {
        const m = model || (await fetch('http://127.0.0.1:11434/api/tags').then(r=>r.json())).models?.[0]?.name || 'llama3.2';
        const r = await fetch('http://127.0.0.1:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: m, messages, stream: false })
        });
        const j = await r.json();
        return j.message?.content || '';
      },
    },
    // ── anthropic ──
    anthropic: {
      label: 'Anthropic Claude',
      free: false,
      async ready() { return !!getKey('anthropic'); },
      async chat({ messages, model }) {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': getKey('anthropic'),
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: model || 'claude-haiku-4-5',
            max_tokens: 2000,
            messages,
          }),
        });
        if (!r.ok) throw new Error('anthropic ' + r.status);
        const j = await r.json();
        return j.content?.[0]?.text || '';
      },
    },
    // ── openai ──
    openai: {
      label: 'OpenAI',
      free: false,
      async ready() { return !!getKey('openai'); },
      async chat({ messages, model }) {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getKey('openai') },
          body: JSON.stringify({ model: model || 'gpt-4o-mini', messages }),
        });
        if (!r.ok) throw new Error('openai ' + r.status);
        const j = await r.json();
        return j.choices?.[0]?.message?.content || '';
      },
    },
    // ── gemini ──
    gemini: {
      label: 'Google Gemini',
      free: false,
      async ready() { return !!getKey('gemini'); },
      async chat({ messages, model }) {
        const m = model || 'gemini-2.0-flash';
        const contents = messages.map(x => ({ parts: [{ text: x.content }], role: x.role === 'assistant' ? 'model' : 'user' }));
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${getKey('gemini')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        });
        if (!r.ok) throw new Error('gemini ' + r.status);
        const j = await r.json();
        return j.candidates?.[0]?.content?.parts?.[0]?.text || '';
      },
    },
    // ── openrouter (has free models) ──
    openrouter: {
      label: 'OpenRouter',
      free: false,  // mostly paid · some free models on the platform
      async ready() { return !!getKey('openrouter'); },
      async chat({ messages, model }) {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getKey('openrouter') },
          body: JSON.stringify({ model: model || 'meta-llama/llama-3.2-3b-instruct:free', messages }),
        });
        if (!r.ok) throw new Error('openrouter ' + r.status);
        const j = await r.json();
        return j.choices?.[0]?.message?.content || '';
      },
    },
    // ── mistral ──
    mistral: {
      label: 'Mistral',
      free: false,
      async ready() { return !!getKey('mistral'); },
      async chat({ messages, model }) {
        const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getKey('mistral') },
          body: JSON.stringify({ model: model || 'mistral-small-latest', messages }),
        });
        if (!r.ok) throw new Error('mistral ' + r.status);
        const j = await r.json();
        return j.choices?.[0]?.message?.content || '';
      },
    },
    // ── fallcore (your own local proxy) ──
    fallcore: {
      label: 'fallcore (self-hosted)',
      free: true,
      async ready() {
        try { const r = await fetch('http://127.0.0.1:8787/v1/models', { signal: AbortSignal.timeout(2000) }); return r.ok; }
        catch { return false; }
      },
      async chat({ messages, model }) {
        const r = await fetch('http://127.0.0.1:8787/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: model || 'claude-haiku-4-5', max_tokens: 2000, messages }),
        });
        if (!r.ok) throw new Error('fallcore ' + r.status);
        const j = await r.json();
        return j.content?.[0]?.text || '';
      },
    },
  };

  const DEFAULT_ORDER = ['ollama', 'fallcore', 'anthropic', 'openrouter', 'gemini', 'openai', 'mistral', 'webllm'];

  // ───────── ◊·κ=φ⁴ · NAS cube enrichment (L4 ← L5) ─────────
  // If nas-shim is present + fork loaded, recall from cube before routing
  // and ingest the result after. Falls through silently when unavailable.
  async function _nasRecall(opts) {
    if (!window.nas || !window.nas.isForkPresent || !window.nas.isForkPresent()) return null;
    try {
      const lastUserMsg = (opts.messages || []).filter(m => m.role === 'user').slice(-1)[0];
      if (!lastUserMsg || !lastUserMsg.content) return null;
      const hits = await window.nas.recall(String(lastUserMsg.content).slice(0, 400), 3);
      if (!hits || !hits.length) return null;
      return hits.map(h => `(prior · score ${(h.score||0).toFixed(2)}): ${h.text}`).join('\n');
    } catch { return null; }
  }
  async function _nasIngest(opts, reply, provider) {
    if (!window.nas || !window.nas.isForkPresent || !window.nas.isForkPresent()) return;
    try {
      const lastUserMsg = (opts.messages || []).filter(m => m.role === 'user').slice(-1)[0];
      const text = (lastUserMsg?.content || '') + ' → ' + (reply || '').slice(0, 1500);
      await window.nas.ingest(text, { kind: 'cascade-reply', provider, tool: 'fallcompass' });
      window.nas.broadcast('bloom_pulse', { provider, intensity: 0.6, color: '#b8974a' });
    } catch {}
  }

  async function chat(opts = {}) {
    // L4 reads L5 before routing · cube-aware cascade
    const nasContext = await _nasRecall(opts);
    if (nasContext && Array.isArray(opts.messages)) {
      opts = {
        ...opts,
        messages: [
          { role: 'system', content: 'Prior context from the user\'s sovereign cube:\n' + nasContext },
          ...opts.messages,
        ],
      };
    }

    // Fork-aware reordering: if user is `prefer-to-write` skip explainer-heavy providers first
    let order = opts.preferredOrder || DEFAULT_ORDER;
    if (window.nas?.isForkPresent?.()) {
      const depth = window.nas.fork?.verdict?.technical_depth || '';
      if (depth.includes('write')) order = ['ollama','fallcore', ...order.filter(p => p !== 'ollama' && p !== 'fallcore')];
    }

    const errors = [];
    for (const name of order) {
      const a = adapters[name];
      if (!a) continue;
      try {
        if (!await a.ready()) { errors.push(name + ':not-ready'); continue; }
        const t0 = performance.now();
        const reply = await a.chat({ messages: opts.messages, model: opts.model });
        const ms = (performance.now() - t0) | 0;
        signal?.postMessage({ kind: 'fallcompass:success', provider: name, ms, ts: Date.now() });
        _nasIngest(opts, reply, name);  // fire and forget
        return { provider: name, label: a.label, reply, ms, nasEnriched: !!nasContext };
      } catch (e) {
        errors.push(name + ':' + e.message.slice(0, 60));
        signal?.postMessage({ kind: 'fallcompass:fail', provider: name, error: e.message.slice(0,80), ts: Date.now() });
      }
    }
    throw new Error('all providers failed: ' + errors.join(' | '));
  }

  async function probe() {
    const out = {};
    for (const name of Object.keys(adapters)) {
      try { out[name] = await adapters[name].ready(); } catch { out[name] = false; }
    }
    return out;
  }

  function setKey(provider, key) {
    try { localStorage.setItem('fallcompass.' + provider + '.key', key); } catch {}
  }

  function listProviders() {
    return Object.fromEntries(Object.entries(adapters).map(([k,v]) => [k, { label: v.label, free: v.free }]));
  }

  window.FallCompass = { version: VERSION, chat, probe, setKey, listProviders, adapters };
  signal?.postMessage({ kind: 'fallcompass:loaded', version: VERSION, ts: Date.now() });
})();
