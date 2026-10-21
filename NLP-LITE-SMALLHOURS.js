/* NLP-SH.js — the Small Hours natural-language engine, bundled as one standalone file.
   A COPY of the game's text-understanding engine only: normalize -> tokenize -> intents -> sentiment ->
   entities -> facts / memory questions / opinion questions -> topics & meta-talk -> claims -> clause
   splitting. Same code, same layer order, same output shape as the game's SH.NLP.

   Bundled verbatim from the Small Hours sources (engine layers only):
     src/nlp.js      — core: NORM slang table, ~50 intent patterns, POS/NEG sentiment, place words,
                       normalize / analyze / reflect / cap / pick  (the PIP assistant in this file is NOT part
                       of the engine and is not bundled)
     src/vocab.js    — emoji + texting slang + Damerau-Levenshtein fuzzy correction, ~30 more intents,
                       negation handling ("i'm not scared"), honest-feeling detection
     src/lex.js      — deeper parse: phrase rewrites, ~35 more intents, clause list + question type,
                       people/pronoun entities, FACT extraction, MEMORY questions, OPINION questions
     src/converse.js — topics + tset, meta-talk (alreadyTold / whyAsk / changeTopic / listen / askPerm /
                       clarify), about-the-NPC questions, greetings
     src/mind2.js    — self-claims (name / age / from / going / with / parents / story / school),
                       sharper negation, "not going home", broke, money/nights/numbers, pronoun reference
     src/talkfix.js  — negated positives ("things aren't great" = low), urgency ("or nah", "be honest"),
                       question-mark fixer (qfix)
     src/clauses.js  — multi-clause splitter (split): sentences, then ", and/but/also/so/plus" when both
                       sides are real clauses; "because..." stays attached

   NOT bundled (game glue, not engine): the PIP persona + optional LLM bridge (nlp.js), NPC character
   reply banks and SH.Brain wrappers (vocab.js, clauses.js reply merging), the conversation manager's
   voices and per-conversation memory (converse.js, ctx2.js), friend threads and consequences
   (talkfix.js), per-person claim memory / no-re-ask (mind2.js), family-name aliasing (family.js),
   NPC memory store (memory.js). Outside the game host, NLP.fill takes explicit values.

   Usage — node:    const NLP = require('./NLP-SH.js');
   Usage — browser: <script src="NLP-SH.js"></script>  ->  window.NLP_SH (also window.SH.NLP if the host
                    has an SH namespace without NLP; it never overwrites an existing SH.NLP).

   Main API:
     NLP.normalize(raw)            -> cleaned text (slang, typos, emoji, phrase rewrites)
     NLP.analyze(raw)              -> { raw, t, I, has, words, sent, shout, q, loc, honest, len, empty,
                                        negated, clauses, qtype, people, pron, facts, memq, opq, short,
                                        topics, tset, meta, about, greet, claims, nums, money, nights, ref }
     NLP.reflect(t)                -> "i feel X" -> "you feel X", or null
     NLP.cap(s) / NLP.pick(conv, key, arr) / NLP.fill(s, vals)
     NLP.fuzzy(w) / NLP.clean(s) / NLP.dayOffset(t) / NLP.PEOPLE / NLP.claims(raw)
     NLP.splitClauses(raw)         -> ["clause one", "clause two", ...]  (also NLP.Clauses.split)
     NLP.isFiller(s) / NLP.isGreeting(s) / NLP.qfix(s)
     NLP.weekday                   -> 0=Monday..6=Sunday used by dayOffset when there is no game host
*/
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.NLP_SH = api;
    if (root.SH && typeof root.SH === 'object' && !root.SH.NLP) root.SH.NLP = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function () {

  /* ---- tiny host shim: the engine only needs util.pick and the weekday; the game supplies both when present ---- */
  const SH = (typeof window !== 'undefined' && window.SH) || (typeof globalThis !== 'undefined' && globalThis.SH) || {};
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const wd = () => (SH && typeof SH.wd === 'function' ? SH.wd() : (API.weekday | 0));
  const API = {};
  API.weekday = 0; // 0 = Monday ... 6 = Sunday (dayOffset day names when standalone)


  /* ==================== 1. core (src/nlp.js — engine only) ==================== */
  {
    const U = { pick };
  const NORM = { u: 'you', ur: 'your', r: 'are', im: "i'm", ive: "i've", dont: "don't", cant: "can't", wont: "won't", didnt: "didn't",
    idk: "i don't know", pls: 'please', plz: 'please', rn: 'right now', tho: 'though', ya: 'you', thx: 'thanks', ty: 'thanks',
    ok: 'okay', k: 'okay', kk: 'okay', wanna: 'want to', gonna: 'going to', bc: 'because', cuz: 'because', coz: 'because',
    ppl: 'people', wat: 'what', wut: 'what', ima: "i'm going to", w: 'with', abt: 'about', tmrw: 'tomorrow', nite: 'night',
    whats: "what's", thats: "that's", youre: "you're", hes: "he's", shes: "she's", isnt: "isn't", doesnt: "doesn't", its: "it's",
    wheres: "where's", whens: "when's", hows: "how's", whos: "who's", theres: "there's", heres: "here's", lemme: 'let me', gimme: 'give me', gotta: 'got to', kinda: 'kind of', sorta: 'sort of',
    shouldnt: "shouldn't", wouldnt: "wouldn't", couldnt: "couldn't", wasnt: "wasn't", werent: "weren't", havent: "haven't", hasnt: "hasn't", arent: "aren't", aint: "isn't",
    rly: 'really', sry: 'sorry', srsly: 'seriously', ngl: 'not going to lie', tbh: 'to be honest', y: 'why', b4: 'before', '2day': 'today', '2nite': 'tonight', tonite: 'tonight', bout: 'about', cya: 'see you', wyd: 'what are you doing', hbu: 'how about you', wbu: 'what about you' };

  const P = {
    greet: /\b(hi|hey+|hello|yo|sup|hiya|howdy|good (morning|evening|afternoon))\b/,
    bye: /\b(bye|goodbye|later|good ?night|gn|see (you|ya)|gotta go|have to go|leaving now|gtg)\b/,
    thanks: /\b(thanks|thank you|appreciate)\b/,
    sorry: /\b(sorry|my bad|apologi[sz]e|forgive me|i messed up|i screwed up|my fault)\b/,
    love: /\b(love you|miss you|ily|care about you|you're the best|love ya|miss u)\b/,
    hostile: /\b(hate you|shut up|leave me alone|screw you|go away|idiot|stupid|loser|jerk|moron|dumb|pathetic|creep|freak|get lost|piss off|go to hell|you suck|f+u+c+k+|stfu|bitch|asshole|bastard|dick|crap)\b/,
    sad: /\b(sad|depressed|cry|crying|cried|lonely|alone|empty|numb|hopeless|worthless|miserable|awful|terrible|horrible|hurts|broken|tired of|can't take|done with|nobody cares|no one cares)\b/,
    scared: /\b(scared|afraid|terrified|nervous|anxious|unsafe|not safe|fear|worried|panic|freaking out|frightened)\b/,
    angry: /\b(angry|mad|furious|pissed|sick of|fed up|hate (it|this|him|home|school|everything|living))\b/,
    disclose: /\b(rick|stepdad|step dad|yell(s|ing)?|scream(s|ing)?|drinks?|drinking|drunk|beer|hits?|hit me|hurt me|hurts me|grabbed|grab(s|bing)?|bruises?|punch(ed|es)?|throws?|threw|smash(ed)?|broke my|fighting|fights|violent|abuse|abusive)\b/,
    help: /\b(help|what do i do|what should i|advice|i need|can you help|don't know what to do)\b/,
    deflect: /^(fine|okay|nothing|whatever|i don't know|nm|nvm|i'm fine|it's fine|sure|no reason|not really|meh|idc|dunno|good)[.! ]*$/,
    joke: /(\b(lol|lmao|haha+|jk|just kidding|bruh|meme|rofl|lmfao)\b|😂|🤣|💀)/,
    yes: /^(yes|yeah|yep|ya|yup|sure|okay|definitely|of course|i guess|alright|fine)\b/,
    no: /^(no|nah|nope|never|not really|no way|don't)\b/,
    money: /(\b(money|cash|dollars?|bucks|lend|borrow|pay|afford|broke)\b|\$)/,
    stay: /\b(stay (with|at|over)|sleep ?over|crash (at|with|on|here)|place to stay|can i come( over)?|somewhere to sleep|let me in|stay the night|hide)\b/,
    run: /\b(run away|running away|runaway|ran away|leave home|leaving home|left home|get out of (here|there|this house)|escape|disappear|never (come|coming) back|not coming (back|home)|leave forever|leaving for good)\b/,
    where: /\bwhere (are|r|were) (you|u)\b|\bwhere you at\b/,
    selfharm: /\b(kill myself|want to die|wanna die|end it all|suicid\w*|hurt myself|cut myself|don't want to (be here|live|exist)|no point (in )?living|better off without me|better off dead|end my life)\b/,
    compliment: /\b(you're (nice|cool|great|awesome|smart|funny|kind|the best)|good job|well done|you're right)\b/,
    food: /\b(hungry|starving|food|eat|eating|dinner|lunch|breakfast|snack|pancakes?)\b/,
    school: /\b(school|class|grades?|test|homework|teacher|math|dale|report card)\b/,
    bully: /\b(tyler|bull(y|ied|ying)|picks? on|pushed me|made fun|laughed at me)\b/,
    lily: /\b(lily|sister|sis)\b/, mom: /\b(mom|mum|mother|mama|ma)\b/, grandma: /\b(grandma|grandmother|nana|gran|rose|cedar falls)('?s)?\b/,
    jordan: /\bjordan\b/, dex: /\b(dex|dex_19)\b/, dad: /\b(dad|father|daddy)\b/,
    home: /\b(home|house)\b/, tired: /\b(tired|exhausted|sleepy|can't sleep|insomnia)\b/, cold: /\b(cold|freezing|frozen|shivering)\b/,
    battery: /\b(battery|charge|charging|charger|power)\b/, time: /\b(what time|the time|time is it|how late)\b/,
    weather: /\b(weather|rain(ing)?|temperature|temp|forecast|frost|snow)\b/,
    plan: /\b(what (do|should|can) i do|where (should|can|do) i (go|sleep|stay|eat)|next step|plan|advice|suggest|options?|what now|help me)\b/,
    status: /\b(status|how am i|my stats|how('s| is) my|am i ok)\b/,
    who: /\b(who are you|what are you|are you (real|alive|human|ai|a bot|a robot|sentient))\b/,
    police: /\b(police|cops?|officer)\b/, shelter: /\b(shelter|harbor|harbour|safe place|drop.?in)\b/,
    safe: /\b(i'm (ok|okay|safe|fine|alright|good)|i am (ok|okay|safe|fine|alright))\b/,
    promise: /\b(promise|swear)\b/, truth: /\b(honestly|the truth|to be honest|tbh|truth is|i'll be honest|for real|fr)\b/,
    age: /\b(how old|your age|age is|i'm 12|i am 12|twelve|years old|i'm 1[0-7]|you're 19)\b/,
    secret: /\b(secret|don't tell|won't tell|keep it between|delete)\b/,
    report: /\b(report|block|tell (my )?(mom|teacher|counselor|someone|police)|screenshot)\b/,
    meet: /\b(meet|pick me up|come get me|ride|car|drive me|your place|come over)\b/,
    ticket: /\b(ticket|bus to|cedar falls|one way)\b/,
    respect: /\b(yes sir|sir|okay rick|i understand|you're right|i'll do better|i will try|i'll try)\b/,
    meaning: /\b(meaning of life|why am i|what's the point|purpose|existence|universe)\b/,
    jokeReq: /\b(tell me a joke|joke|make me laugh|say something funny)\b/,
    sing: /\b(sing|song|music)\b/,
  };
  const POS = ['good', 'great', 'happy', 'love', 'nice', 'thanks', 'cool', 'awesome', 'glad', 'fun', 'okay', 'better', 'safe', 'best', 'hope', 'calm', 'proud', 'yes'];
  const NEG = ['bad', 'hate', 'sad', 'awful', 'terrible', 'angry', 'scared', 'hurt', 'cry', 'alone', 'worst', 'sick', 'tired', 'never', 'nobody', 'kill', 'die', 'stupid', 'cold', 'hungry', 'afraid', 'broken', 'no'];
  const LOCWORDS = [[/\b(diner|nite owl|night owl)\b/, 'diner'], [/\blibrary\b/, 'library'], [/\b(park|riverside|skate ?park|bowl)\b/, 'park'],
    [/\b(bus (station|depot|stop)|depot|greyline|station)\b/, 'bus'], [/\bmall\b/, 'mall'], [/\b(underpass|bridge|route 9)\b/, 'underpass'],
    [/\b(laundromat|suds|laundry)\b/, 'laundromat'], [/\b(quikmart|quik ?mart|store|gas station)\b/, 'store'], [/\bschool\b/, 'school'],
    [/\b(hospital|st\.? brigid)/, 'hospital'], [/\b(harbor|harbour) house\b/, 'harbor'], [/\bjordan'?s\b/, 'jordan'], [/\b(rail ?yard|train)/, 'trainyard'],
    [/\b(police station)\b/, 'police'], [/\bpatel/, 'patel']];

  const NLP = API;
  NLP.normalize = function (raw) {
    let t = (raw || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
    t = t.split(' ').map((w) => { const m = w.match(/^([a-z']+)([^a-z']*)$/); if (m && NORM[m[1]]) return NORM[m[1]] + m[2]; return w; }).join(' ');
    return t;
  };
  NLP.analyze = function (raw) {
    const t = NLP.normalize(raw);
    const I = {};
    for (const k in P) if (P[k].test(t)) I[k] = 1;
    const words = t.replace(/[^a-z' ]/g, ' ').split(' ').filter(Boolean);
    let sent = 0; words.forEach((w) => { if (POS.includes(w)) sent++; if (NEG.includes(w)) sent--; });
    if (/\b(not|never|don't|no) (good|okay|fine|safe|happy)\b/.test(t)) sent -= 2;
    const letters = (raw || '').replace(/[^A-Za-z]/g, '');
    const shout = letters.length > 5 && letters === letters.toUpperCase();
    const q = /\?\s*$/.test(t) || /^(who|what|where|when|why|how|can|could|would|will|do|does|is|are|should)\b/.test(t);
    let loc = null; for (const [re, id] of LOCWORDS) if (re.test(t)) { loc = id; break; }
    const has = (k) => !!I[k];
    // Honest feeling statement heuristic
    const honest = (has('sad') || has('scared') || has('angry') || has('disclose') || has('truth')) && words.length >= 4 && !has('joke');
    return { raw, t, I, has, words, sent, shout, q, loc, honest, len: words.length, empty: words.length === 0 };
  };
  NLP.reflect = function (t) {
    const m = t.match(/\bi(?: really| just| kind of| kinda)? (feel|am|'m|want|need|hate|can't|don't|wish|think|miss|keep)\b ?(.*)/);
    if (!m) return null;
    const swap = { i: 'you', me: 'you', my: 'your', mine: 'yours', am: 'are', "i'm": "you're", myself: 'yourself', you: 'I', your: 'my', "you're": "I'm" };
    let rest = m[2].replace(/[.!?]+$/, '').split(' ').map((w) => swap[w] || w).join(' ');
    const verb = m[1] === "'m" ? 'are' : m[1] === 'am' ? 'are' : m[1];
    rest = rest.slice(0, 80);
    return ('you ' + verb + (rest ? ' ' + rest : '')).trim();
  };
  NLP.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // pick without repeating inside a conversation
  NLP.pick = function (conv, key, arr) {
    conv.used = conv.used || {};
    const u = conv.used[key] = conv.used[key] || [];
    let opts = arr.map((x, i) => i).filter((i) => !u.includes(i));
    if (!opts.length) { conv.used[key] = []; opts = arr.map((x, i) => i); }
    const i = U.pick(opts); conv.used[key].push(i);
    const v = arr[i]; return typeof v === 'function' ? v() : v;
  };
  /* Template tokens. With the game host (window.SH.G present) this reads live values exactly
     like the game's SH.NLP.fill. Standalone, pass the values: NLP.fill('hi {name}', { name: 'Sam' }). */
  NLP.fill = function (s, vals) {
    const G = SH.G;
    const v = vals || (G && SH.fmt12 ? {
      name: G.name, time: SH.fmt12(), temp: SH.tempF() + '°F',
      money: '$' + G.money.toFixed(2), bat: Math.round(G.phone.bat) + '%', day: SH.WEEKDAYS[SH.wd()],
    } : {});
    return String(s).replace(/\{name\}/g, v.name == null ? '' : v.name).replace(/\{time\}/g, v.time == null ? '' : v.time)
      .replace(/\{temp\}/g, v.temp == null ? '' : v.temp).replace(/\{money\}/g, v.money == null ? '' : v.money)
      .replace(/\{bat\}/g, v.bat == null ? '' : v.bat).replace(/\{day\}/g, v.day == null ? '' : v.day);
  };
  }

  /* ==================== 2. vocabulary (src/vocab.js — engine only) ==================== */
  {
const N = API;
  /* ---------- slang, texting shorthand, common misspellings ---------- */
  const X = {
    rly: 'really', rlly: 'really', srsly: 'seriously', ngl: 'not going to lie', istg: 'i swear to god', fr: 'for real', frfr: 'for real', lowkey: 'kind of', highkey: 'really',
    deadass: 'seriously', bet: 'okay', nocap: 'for real', fam: 'friend', bro: 'bro', bruh: 'bruh', aint: "isn't", "ain't": "isn't", yall: 'you all', "y'all": 'you all', gotta: 'got to', lemme: 'let me',
    kinda: 'kind of', sorta: 'sort of', dunno: "i don't know", prolly: 'probably', cya: 'see you', ttyl: 'talk to you later', brb: 'be right back', omg: 'oh my god', smh: 'shaking my head',
    tbf: 'to be fair', imo: 'in my opinion', irl: 'in real life', hbu: 'how about you', wbu: 'what about you', hru: 'how are you', wyd: 'what are you doing', wbu2: '', sry: 'sorry', soz: 'sorry',
    luv: 'love', ofc: 'of course', obv: 'obviously', idc: "i don't care", idek: "i don't even know", imy: 'i miss you', ilysm: 'i love you so much', ily: 'i love you', gm: 'good morning',
    tysm: 'thank you so much', tyvm: 'thank you', np: 'no problem', yw: "you're welcome", bday: 'birthday', wknd: 'weekend', b4: 'before', '2day': 'today', '2nite': 'tonight', '2morrow': 'tomorrow',
    l8r: 'later', gr8: 'great', becuase: 'because', becasue: 'because', bcuz: 'because', realy: 'really', scard: 'scared', skared: 'scared', hungery: 'hungry', tierd: 'tired', tird: 'tired',
    freind: 'friend', frend: 'friend', sory: 'sorry', sorri: 'sorry', plese: 'please', pleas: 'please', wierd: 'weird', definately: 'definitely', alot: 'a lot', dont: "don't", nothin: 'nothing',
    somethin: 'something', gonna: 'going to', finna: 'going to', tryna: 'trying to', outta: 'out of', lotta: 'lot of', cuz: 'because', coz: 'because', wat: 'what', nuthin: 'nothing', mom: 'mom',
    mum: 'mom', mommy: 'mom', stepdad: 'stepdad', 'step-dad': 'stepdad', grandmom: 'grandma', granny: 'grandma', abuela: 'grandma', pls: 'please', plz: 'please', thnx: 'thanks', thanx: 'thanks',
    ok: 'okay', okk: 'okay', okie: 'okay', oki: 'okay', ya: 'yeah', yea: 'yeah', yeh: 'yeah', ye: 'yeah', nah: 'no', naw: 'no', nope: 'no', yup: 'yes', yep: 'yes', mhm: 'yes', ikr: 'i know right',
    tmr: 'tomorrow', tmrw: 'tomorrow', rn: 'right now', atm: 'right now', asap: 'as soon as possible', bc: 'because', w: 'with', wo: 'without', ppl: 'people', sm: 'so much', ty: 'thanks',
  };
  const EMO = [[/😭|😢|😞|😔|💔|🥲|☹️|🙁/g, ' sad '], [/😡|🤬|😤|😠/g, ' angry '], [/😨|😱|😰|😧/g, ' scared '], [/❤️|❤|💕|💖|🥰|😍|<3/g, ' love you '], [/🥺/g, ' please '],
    [/👍|👌|✅/g, ' yes '], [/👎|❌/g, ' no '], [/😂|🤣|💀|😆/g, ' lol '], [/🙄/g, ' whatever '], [/😴|🥱/g, ' tired '], [/🥶/g, ' cold '], [/🤢|🤮/g, ' sick '], [/🍕|🍔|🍟/g, ' food ']];
  // fuzzy keyword correction (Damerau-Levenshtein, same first letter, never touches common words)
  const KEY = 'scared afraid terrified hungry starving tired exhausted drunk drinking stepdad bruise bruises grabbed yelling screaming sorry please thanks school teacher grandma library shelter police hospital ticket station train money lonely depressed anxious nervous worried angry furious because really definitely probably friend family mother sister brother bully lonely hopeless worthless myself running escape advice battery charger weather freezing homework skyforge drawing business counselor okafor jordan rick'.split(' ');
  const COMMON = new Set('the and but for not you your are was were what when where why how who this that with have has had just like want need know think thing things tried trying drink drank drive dinner stay still mean meet mine time tell told talk walk well will would could should maybe about after again always because before being best better came come didnt doesnt done dont down even ever every feel felt find first from game gave give goes going good got great hard help here home hope into its keep kind last leave left life little long look lost made make many more most much must never next nice night nothing now okay only other over people play pretty real right said same saw say see she some sorry stop sure take than them then there they thought today too took try under until very wait went while wish work worse yeah year years yes yet school sister brother hurry hurt worst world story stupid bored board broke brake sad mad bad dad rich sick scary sleep sleepy tree three trip ride rode side safe same save sale nice mice drunk dunk trunk bruised grabbing drinks'.split(' '));
  const dl = (a, b) => { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; const d = []; for (let i = 0; i <= m; i++) { d[i] = [i]; } for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) { const c = a[i - 1] === b[j - 1] ? 0 : 1; d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); } return d[m][n]; };
  N.fuzzy = function (w) {
    if (w.length < 5 || COMMON.has(w) || KEY.includes(w) || !/^[a-z]+$/.test(w)) return w;
    let best = w, bd = w.length >= 8 ? 2 : 1;
    for (const k of KEY) { if (k[0] !== w[0]) continue; const d = dl(w, k); if (d <= bd && d > 0) { bd = d - 0.01; best = k; } }
    return best;
  };
  const baseNorm = N.normalize;
  N.normalize = function (raw) {
    let s = String(raw || ''); EMO.forEach(([re, rep]) => { s = s.replace(re, rep); });
    let t = baseNorm(s);
    t = t.replace(/(\w)\1{2,}/g, '$1$1'); // soooo -> soo, heyyyy -> heyy
    t = t.split(' ').map((w) => { const m = w.match(/^([a-z0-9'\-]+)([^a-z0-9']*)$/); if (!m) return w; let core = m[1]; if (X[core] != null) core = X[core]; else core = N.fuzzy(core); return core + m[2]; }).join(' ');
    return t.replace(/\s+/g, ' ').trim();
  };

  /* ---------- new intents + extra phrasings for existing ones ---------- */
  const EXTRA = {
    greet: /\b(wassup|whaddup|what's good|heyy|hii+|hola|morning|good morning|howdy|yoo+)\b/,
    bye: /\b(see you|talk to you later|peace out|peace|gotta go|night night|nighty night|catch you later|i'm out|i'm off)\b/,
    thanks: /\b(thank you so much|cheers|appreciate it|appreciate you|means a lot|you're a lifesaver)\b/,
    sorry: /\b(i apologize|didn't mean (it|that)|i shouldn't have|forgive me|i was wrong|that was mean of me)\b/,
    love: /\b(i love you|love you so much|you mean a lot|you're my favorite|grateful for you)\b/,
    hostile: /\b(kys|you're trash|ur trash|clown|you're annoying|nobody asked|get out|mind your (own )?business|go die|drop dead|i don't care about you)\b/,
    sad: /\b(down|bummed|blue|gutted|devastated|heartbroken|lost|overwhelmed|stressed|drained|burnt out|burned out|miserable|not okay|i'm not ok|falling apart|so done|over it|can't do this)\b/,
    scared: /\b(spooked|creeped out|on edge|jumpy|shaking|can't breathe|freaked out|paranoid|nightmare|nightmares)\b/,
    angry: /\b(annoyed|irritated|livid|rage|raging|so done|hate him|hate her|makes me so mad|fuming)\b/,
    disclose: /\b(wasted|hammered|booze|whiskey|vodka|hungover|slap(s|ped)?|shove[sd]?|push(es|ed) me|threaten(s|ed)?|screams at|smacks?|belt|locked me out|kicked me out)\b/,
    selfharm: /\b(kms|unalive|wish i (was|were) dead|don't want to wake up|disappear forever|sewer slide|end it|not be here anymore)\b/,
    yes: /^(bet|ofc|of course|absolutely|for sure|yessir|yes please|uh huh|mhm|totally|obviously)\b/,
    no: /^(no thanks|hell no|pass|i'm good|nah fam|no way)\b/,
    food: /\b(pizza|chips|cereal|mac and cheese|famished|stomach('s)? growling|haven't eaten|didn't eat|no food)\b/,
    money: /\b(poor|rich|allowance|paycheck|savings|saved up|shoebox)\b/,
    stay: /\b(can i sleep (at|over)|put me up|crash at yours|stay at yours|room for me)\b/,
    run: /\b(bounce|dip out|leave town|get outta here|skip town|take off|hit the road|run off|go somewhere else|never go back)\b/,
    help: /\b(i'm stuck|help me out|what would you do|any ideas|i need you)\b/,
    howru: /\b(how are you|how's it going|how you doing|how have you been|how are things|how was your day|you good|you okay|are you ok|and you)\b/,
    wyd: /\b(what are you doing|what you doing|what are you up to|what's up with you|whatcha doing)\b/,
    bored: /\b(bored|boring|nothing to do|so bored)\b/,
    excited: /\b(excited|can't wait|hyped|stoked|pumped|so happy)\b/,
    confused: /\b(confused|don't understand|what do you mean|wdym|makes no sense|i don't get it)\b|^huh\??$/,
    embarrassed: /\b(embarrass\w*|cringe|humiliat\w*|awkward|so dumb of me)\b/,
    guilty: /\b(my fault|guilty|i ruin|ruined everything|i'm the problem|i'm a burden|burden|everyone would be better)\b/,
    unfair: /\b(unfair|not fair|jealous|why does (she|he|lily) get|always my fault)\b/,
    sick: /\b(sick|stomach ?ache|headache|throw up|threw up|nauseous|fever|coughing)\b/,
    games: /\b(skyforge|video games?|gaming|console|xbox|switch|playstation|minecraft|fortnite|roblox|ice wyrm)\b/,
    art: /\b(draw(ing|s)?|art|sketch\w*|paint(ing)?|comic|doodle)\b/,
    skate: /\b(skate\w*|skateboard|kickflip|ollie|the bowl)\b/,
    animals: /\b(dog|cat|turtle|sheldon|newton|puppy|kitten|pet|raccoon)\b/,
    halloween: /\b(halloween|costume|trick or treat|the dance)\b/,
    work: /\b(job|jobs|hustle|business|selling|rak(e|ing) leaves|earn(ing)?|make money|side hustle|car wash|lemonade)\b/,
    train: /\b(train|trains|railway|railroad|amtrak|northline|platform|conductor)\b/,
    future: /\b(when i grow up|the future|someday|one day|college|my dream|i want to be)\b/,
    please: /\b(please|pretty please|i'm begging|i beg you)\b/,
    grandma: /\b(grandma|grandmother|nana|gran|rose|cedar falls|larkspur)\b/,
    mom: /\b(mom|mother|my mom|dana|parent|parents|guardian)\b/,
    time: /\b(what time|when does|when is|next train|how long|schedule|timetable|departs?|leaves? at|arriv\w*)\b/,
    truth: /\b(the truth|honestly|to be honest|tbh|i lied|i'm lying|okay fine|i'll be honest|real talk|i ran away|i'm running away|i'm alone|by myself)\b/,
    ticket: /\b(tickets?|fare|one way|round trip)\b/,
    agree: /^(true|facts|exactly|same|agreed|real|valid|fair|so true|right)\b/,
  };
  const NEG = { sad: 'sad', upset: 'sad', scared: 'scared', afraid: 'scared', worried: 'scared', angry: 'angry', mad: 'angry', hungry: 'food', tired: 'tired', cold: 'cold', bored: 'bored' };
  const baseAn = N.analyze;
  N.analyze = function (raw) {
    const an = baseAn(raw), t = an.t;
    for (const k in EXTRA) if (EXTRA[k].test(t)) an.I[k] = 1;
    if (an.I.selfharm) delete an.I.joke;
    // "i'm not scared" shouldn't count as scared
    const re = /\b(not|never|isn't|aren't|wasn't|no longer)\s+(really\s+|that\s+|very\s+|even\s+|too\s+)?(sad|upset|scared|afraid|worried|angry|mad|hungry|tired|cold|bored)\b/g; let m;
    while ((m = re.exec(t))) { const k = NEG[m[3]]; if (k && !/\b(so|really|very) (sad|scared|angry)\b/.test(t.replace(m[0], ''))) { delete an.I[k]; an.negated = (an.negated || []).concat(k); } }
    if (an.I.bye && an.I.selfharm) delete an.I.bye;
    if (an.I.disclose && /\bdrink(ing)? (some |a |my )?(water|juice|milk|soda|coffee|tea|lemonade|cocoa|pop)\b/.test(t) && !/\b(drunk|beer|hit|grab|bruise|yell|scream|wasted|hammered|shove|push|slap)/.test(t)) delete an.I.disclose;
    if (an.I.wyd) delete an.I.who;
    an.honest = (an.I.sad || an.I.scared || an.I.angry || an.I.disclose || an.I.truth || an.I.guilty) && an.len >= 4 && !an.I.joke;
    return an;
  };
  // understand the new places when people mention them
  const baseLoc = N.analyze;
  N.analyze = function (raw) { const an = baseLoc(raw); if (/\b(train station|harlow station|northline|platform)\b/.test(an.t)) an.loc = 'station'; return an; };
  }

  /* ==================== 3. deeper parse (src/lex.js) ==================== */
  {
const N = API;
  /* ---------- more words ---------- */
  const X2 = {
    // texting shorthand
    wyd: 'what are you doing', wya: 'where are you', hmu: 'hit me up', ily2: 'i love you too', lmk: 'let me know', nvm: 'never mind', nm: 'not much', ikr: 'i know right', icl: "i can't lie",
    iirc: 'if i remember correctly', afaik: 'as far as i know', tbd: 'to be decided', fyi: 'for your information', jk: 'just kidding', btw: 'by the way', ofc: 'of course', idgaf: "i don't care",
    wdym: 'what do you mean', wtv: 'whatever', whatev: 'whatever', whatevs: 'whatever', stfu: 'shut up', gtfo: 'get out', imho: 'in my opinion', tldr: 'basically', ig: 'i guess', iykyk: 'you know',
    hbd: 'happy birthday', gg: 'good game', ez: 'easy', rip: 'rest in peace', oof: 'oof', yikes: 'yikes', ugh: 'ugh', meh: 'meh', huh: 'huh', wut: 'what', wot: 'what', wha: 'what', whut: 'what',
    y: 'why', wy: 'why', bcs: 'because', cause: 'because', cos: 'because', tho: 'though', thru: 'through', nite: 'night', tonite: 'tonight', '2moro': 'tomorrow', tmw: 'tomorrow', yday: 'yesterday', ystd: 'yesterday',
    r: 'are', u: 'you', ur: 'your', urs: 'yours', urself: 'yourself', ure: "you're", im: "i'm", ima: "i'm going to", imma: "i'm going to", ive: "i've", iam: 'i am',
    wont: "won't", cant: "can't", dont: "don't", doesnt: "doesn't", didnt: "didn't", isnt: "isn't", wasnt: "wasn't", werent: "weren't", havent: "haven't", hasnt: "hasn't", shouldnt: "shouldn't", wouldnt: "wouldn't", couldnt: "couldn't",
    thats: "that's", whats: "what's", wheres: "where's", whos: "who's", hows: "how's", theres: "there's", heres: "here's", lets: "let's", its: "it's", hes: "he's", shes: "she's", theyre: "they're", youre: "you're", were2: 'were',
    // slang
    sus: 'suspicious', mid: 'mediocre', bussin: 'really good', slaps: 'is great', goated: 'the best', lit: 'great', dope: 'cool', sick2: 'cool', rad: 'cool', based: 'cool',
    cringe: 'embarrassing', cringy: 'embarrassing', salty: 'annoyed', pressed: 'annoyed', triggered: 'upset', shook: 'shocked', vibe: 'feeling', vibes: 'feeling', vibing: 'relaxing',
    chillin: 'relaxing', chilling: 'relaxing', lowkey2: 'kind of', simp: 'fan', stan: 'fan', bestie: 'best friend', bff: 'best friend', homie: 'friend', buddy: 'friend', pal: 'friend', dawg: 'bro', dude: 'dude', mate: 'friend',
    yeet: 'throw', finna: 'going to', boutta: 'about to', bout: 'about', abt: 'about', ab: 'about', gimme: 'give me', lemme: 'let me', wanna: 'want to', gotta: 'got to', hafta: 'have to', oughta: 'ought to', kinda: 'kind of',
    nah: 'no', nahh: 'no', noo: 'no', nooo: 'no', yass: 'yes', yas: 'yes', yesss: 'yes', yess: 'yes', yuh: 'yeah', yeahh: 'yeah', mhmm: 'yes', uhuh: 'yes', nuh: 'no', nuhuh: 'no',
    // misspellings
    becuz: 'because', becaus: 'because', beacuse: 'because', bcause: 'because', freinds: 'friends', frens: 'friends', gurl: 'girl', gud: 'good', gd: 'good', nvr: 'never', evry: 'every', evryone: 'everyone', evrything: 'everything',
    somthing: 'something', sumthing: 'something', smth: 'something', sth: 'something', nothign: 'nothing', anythign: 'anything', thier: 'their', tommorow: 'tomorrow', tomorow: 'tomorrow', tomorrw: 'tomorrow', tonigth: 'tonight',
    recieve: 'receive', beleive: 'believe', belive: 'believe', untill: 'until', wich: 'which', whith: 'with', wiht: 'with', teh: 'the', hte: 'the', adn: 'and', nad: 'and', waht: 'what', wat2: 'what', whta: 'what', hwo: 'how', ot: 'to',
    sad2: 'sad', saad: 'sad', happpy: 'happy', hapy: 'happy', angy: 'angry', angery: 'angry', scaredd: 'scared', srry: 'sorry', sorrry: 'sorry', sowwy: 'sorry', thnks: 'thanks', thanku: 'thank you', thankyou: 'thank you', tyty: 'thanks',
    pleez: 'please', plox: 'please', pwease: 'please', hlp: 'help', halp: 'help', hepl: 'help', skool: 'school', scool: 'school', shcool: 'school', techer: 'teacher', teecher: 'teacher', homwork: 'homework', hw: 'homework', math2: 'math',
    stepfather: 'stepdad', stepdads: "stepdad's", moms: "mom's", mommas: "mom's", momma: 'mom', mama2: 'mom', ma2: 'mom', grams: 'grandma', gramma: 'grandma', grandmas: "grandma's", nana2: 'grandma', sis2: 'sister', bro2: 'brother',
    favorite: 'favorite', favourite: 'favorite', fave: 'favorite', fav: 'favorite', favs: 'favorites', faves: 'favorites', colour: 'color', colours: 'colors', bday2: 'birthday', birfday: 'birthday', burthday: 'birthday',
  };
  // multi-word rewrites that single-token maps can't do
  const PHR = [
    [/\bhow (are|r) (you|u) doing\b/g, 'how are you'], [/\bhow('s| is) it going\b/g, 'how are you'], [/\bwhat('s| is) up\b/g, 'what are you doing'], [/\bwhat are you up to\b/g, 'what are you doing'],
    [/\bhow have you been\b/g, 'how are you'], [/\byou good\??$/g, 'are you okay'], [/\bu good\??$/g, 'are you okay'], [/\bare you alright\b/g, 'are you okay'],
    [/\bi don't wanna\b/g, "i don't want to"], [/\bi dont know\b/g, "i don't know"], [/\bi do not\b/g, "i don't"], [/\bi can not\b/g, "i can't"], [/\bi am not\b/g, "i'm not"], [/\bi am\b/g, "i'm"],
    [/\bdo you remember\b/g, 'remember'], [/\bdo u remember\b/g, 'remember'], [/\bd'?you remember\b/g, 'remember'], [/\byou remember\b/g, 'remember'],
    [/\bfav(ou?rite)?\b/g, 'favorite'], [/\bmy fave\b/g, 'my favorite'], [/\bi really really\b/g, 'i really'], [/\bkind of\b/g, 'kind of'], [/\bsort of\b/g, 'kind of'],
    [/\bno one\b/g, 'nobody'], [/\bnoone\b/g, 'nobody'], [/\bevery one\b/g, 'everyone'], [/\bwhat do you mean\b/g, 'what do you mean'], [/\bwhy not\b/g, 'why not'],
  ];
  const baseNorm = N.normalize;
  N.normalize = function (raw) {
    let t = String(raw || '').toLowerCase().replace(/[’‘]/g, "'");
    t = t.split(/\s+/).map((w) => { const m = w.match(/^([a-z0-9']+)([^a-z0-9']*)$/); if (!m) return w; const k = m[1].replace(/'/g, ''); if (X2[k] != null && !/\d$/.test(X2[k]) && X2[k] !== k) return X2[k] + m[2]; return w; }).join(' ');
    t = baseNorm(t);
    PHR.forEach(([re, rep]) => { t = t.replace(re, rep); });
    return t.replace(/\s+/g, ' ').trim();
  };

  /* ---------- more intents / phrasings ---------- */
  const MORE = {
    happy: /\b(happy|glad|great day|good day|best day|stoked|pumped|hyped|thrilled|over the moon|so good|feeling good|feel good|amazing|wonderful|awesome day)\b/,
    proud: /\b(proud|i did it|nailed it|aced|got an a|passed|won|finally landed|i made it)\b/,
    jealous: /\b(jealous|envious|not fair that (he|she|they))\b/,
    lonely: /\b(lonely|no friends|nobody to talk to|all alone|by myself all|left out|ignored|invisible)\b/,
    bored: /\b(bored|boring|nothing to do|so dull)\b/,
    excited: /\b(excited|can't wait|cannot wait|so hyped|looking forward)\b/,
    guilty: /\b(my fault|guilty|i ruined|because of me|i caused|blame myself|i'm the problem|i'm a burden)\b/,
    confused: /\b(confused|don't get it|don't understand|makes no sense|what do you mean|wdym|huh\??$)\b/,
    curious: /\b(i wonder|curious|just wondering|why is|how come)\b/,
    howru: /\b(how are you|how you feeling|how do you feel|how was your day|how's your day|you okay\??$|are you okay)\b/,
    wyd: /\b(what are you doing|what you doing|doing anything|busy\??$)\b/,
    sick: /\b(sick|fever|throw(ing)? up|threw up|puked|headache|stomach ?ache|cough|flu|cold (and|&))\b/,
    music: /\b(music|song|songs|band|album|rap|playlist|spotify|headphones|singer|concert)\b/,
    movie: /\b(movie|movies|film|show|series|netflix|youtube|anime|cartoon)\b/,
    sports: /\b(soccer|basketball|football|baseball|hockey|sports?|team|practice|game tonight)\b/,
    animals: /\b(dog|dogs|cat|cats|puppy|kitten|turtle|sheldon|newton|pet|pets|animal|animals|bird|hamster|fish)\b/,
    games: /\b(skyforge|video games?|gaming|console|xbox|playstation|switch|minecraft|fortnite|roblox)\b/,
    art: /\b(draw|drawing|drew|sketch|sketchbook|paint|painting|art|comic|comics|doodle)\b/,
    skate: /\b(skate|skating|skateboard|board|kickflip|ollie|bowl)\b/,
    future: /\b(when i grow up|in the future|someday|one day i|future|college|when i'm older|dream job)\b/,
    halloween: /\b(halloween|costume|trick or treat|candy)\b/,
    what: /^(what|wut|huh|hm+|excuse me|come again|pardon)\??$/,
    why: /^(why|how come|why not|but why|why\?+|for what)\??$/,
    really: /^(really|for real|seriously|are you serious|no way|wait what|fr)\??!?$/,
    agree: /^(true|facts|exactly|same|agreed|real|valid|fair|so true|right|ikr|i know right|mood)\b/,
    laugh: /^(lol|lmao|haha+|hehe+|laughing|rofl|xd)\W*$/,
    idk: /^(i don't know|idk|not sure|dunno|no idea|i'm not sure|beats me|maybe)\W*$/,
  };
  // things the player might name as an opinion topic — map to a canonical id
  const PEOPLE = [['mom', /\b(mom|mother|dana|mama)\b/], ['rick', /\b(rick|stepdad)\b/], ['lily', /\b(lily|sister)\b/], ['jordan', /\bjordan\b/], ['grandma', /\b(grandma|rose)\b/], ['okafor', /\b(okafor|counselor)\b/],
    ['patel', /\b(patel)\b/], ['tyler', /\btyler\b/], ['dex', /\bdex\b/], ['maya', /\bmaya\b/], ['ruiz', /\b(ruiz|librarian)\b/], ['wren', /\bwren\b/], ['dolores', /\bdolores\b/], ['newton', /\bnewton\b/], ['sheldon', /\bsheldon\b/]];
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const clean = (s) => String(s || '').replace(/\b(too|lol|lmao|tbh|honestly|though|i guess|a lot|so much|really|haha)\b/g, '').replace(/[^a-z0-9' \-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  const dayOffset = (t) => { if (/\btonight\b|\btoday\b|\blater\b/.test(t)) return 0; if (/\btomorrow\b/.test(t)) return 1; const m = t.match(/\b(this |next |on )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/); if (!m) return null; const w = wd(); let o = (DAYS.indexOf(m[2]) - w + 7) % 7; if (o === 0 || m[1] === 'next ') o += 7; return o; };

  /* ---------- facts the player states about themselves ---------- */
  const FACTS = [
    [/\bmy (?:all ?time |absolute )?favorite ([a-z ]{2,18}?) (?:is|are|was|would be) (?:probably |definitely |prob )?(.+)/, (m) => ({ kind: 'fav', key: 'fav:' + m[1].trim().replace(/s$/, ''), cat: m[1].trim(), v: clean(m[2]) })],
    [/\bi (?:really |kind of |totally |absolutely )?(?:love|like|adore|enjoy|am obsessed with|'m obsessed with|'m into|am into|'m a fan of) (?!you\b|u\b|ya\b|it when)(.+)/, (m) => ({ kind: 'like', key: 'like:' + clean(m[1]), v: clean(m[1]) })],
    [/\bi (?:really |kind of |totally )?(?:hate|can't stand|don't like|dislike|despise|am sick of|'m sick of) (?!you\b|u\b|ya\b|myself\b|my life\b|it here)(.+)/, (m) => ({ kind: 'dislike', key: 'dislike:' + clean(m[1]), v: clean(m[1]) })],
    [/\bi'?m (?:really |pretty |kind of )?good at (.+)/, (m) => ({ kind: 'skill', key: 'skill:' + clean(m[1]), v: clean(m[1]) })],
    [/\bi'?m (?:really |so |kind of )?(?:scared|afraid|terrified|frightened) of (.+)/, (m) => ({ kind: 'fear', key: 'fear:' + clean(m[1]), v: clean(m[1]) })],
    [/\bi (?:want|wanna|'d like|would like|hope) to (?:be|become) an? (.+?)(?: when i grow up| someday| one day|$)/, (m) => ({ kind: 'dream', key: 'dream', v: clean(m[1]) })],
    [/\bwhen i grow up i (?:want to|wanna|'m going to) be an? (.+)/, (m) => ({ kind: 'dream', key: 'dream', v: clean(m[1]) })],
    [/\bmy birthday(?: is|'s)(?: on)? (.+)/, (m) => ({ kind: 'birthday', key: 'birthday', v: clean(m[1]) })],
    [/\bmy (dog|cat|turtle|pet|fish|hamster|bird|rabbit|lizard)(?:'s)? (?:name is|is called|is named) (\w+)/, (m) => ({ kind: 'pet', key: 'pet', v: m[2] + ' (' + m[1] + ')' })],
    [/\bi have an? (dog|cat|turtle|pet|fish|hamster|bird|rabbit|lizard) (?:named|called) (\w+)/, (m) => ({ kind: 'pet', key: 'pet', v: m[2] + ' (' + m[1] + ')' })],
    [/\b(?:call me|you can call me|everyone calls me|my nickname is) ([a-z]{2,14})\b/, (m) => ({ kind: 'nick', key: 'nick', v: m[1].charAt(0).toUpperCase() + m[1].slice(1) })],
    [/\bmy best friend(?: is|'s) (\w+)/, (m) => ({ kind: 'bff', key: 'bff', v: clean(m[1]) })],
    [/\bi got an? ([a-f][+-]?|\d{1,3}%?)(?: on| in) (?:my |the )?(.+)/, (m) => ({ kind: 'grade', key: 'grade:' + clean(m[2]), v: m[1].toUpperCase() + ' on ' + clean(m[2]) })],
    [/\bi miss (?!you\b|u\b)(.+)/, (m) => ({ kind: 'miss', key: 'miss:' + clean(m[1]), v: clean(m[1]) })],
    [/\bi wish (.+)/, (m) => ({ kind: 'wish', key: 'wish', v: clean(m[1]) })],
    [/\bi (?:have|got|'ve got) (?:a |an |my |this |the )?(?:(?:big|huge|stupid|dumb|important|scary|major|final|little|whole) )?((?:math |science |history |english |spelling |reading |art |band |soccer |basketball |swim |chess |talent )?(?:test|quiz|exam|game|match|tryouts?|recital|practice|presentation|project|appointment|doctor|dentist|field trip|dance|sleepover|party|fair|bee|concert|audition|show|meet|competition|tournament|interview|contest|play|report|essay))(?: due)?(.*)/, (m, t) => { const o = dayOffset(m[2] || t); return o == null ? null : { kind: 'event', key: 'event:' + m[1], v: m[1], due: o }; }],
    [/\bi'?m going to (?:the |a )?([a-z ]{3,24}?) (tomorrow|tonight|on \w+day|this \w+day|next \w+day|friday|saturday|sunday|monday|tuesday|wednesday|thursday)\b/, (m) => { const o = dayOffset(m[2]); return o == null ? null : { kind: 'event', key: 'event:' + clean(m[1]), v: 'going to ' + clean(m[1]), due: o }; }],
  ];

  /* ---------- questions about memory ---------- */
  const MEMQ = [
    [/\b(?:what(?:'s| is| was)|remember|know|tell me) my favorite ([a-z ]{2,18}?)\??$/, (m) => ({ kind: 'fact', key: 'fav:' + m[1].trim().replace(/s$/, ''), desc: 'favorite ' + m[1].trim() })],
    [/\bwhat(?:'s| is) my favorite\b|\bremember my favorite\b/, () => ({ kind: 'favs' })],
    [/\b(?:what(?:'s| is)|remember|know) my (name|nickname)\b/, () => ({ kind: 'fact', key: 'nick', desc: 'name' })],
    [/\b(?:what(?:'s| is)|remember|know|when is|when's) my birthday\b/, () => ({ kind: 'fact', key: 'birthday', desc: 'birthday' })],
    [/\b(?:what(?:'s| is)|remember|know) my (?:dog|cat|turtle|pet|fish|hamster)(?:'s)? name\b|\bremember my (?:dog|cat|pet)\b/, () => ({ kind: 'fact', key: 'pet', desc: "pet's name" })],
    [/\b(?:what do i want to be|remember what i want to be|what's my dream)\b/, () => ({ kind: 'fact', key: 'dream', desc: 'dream' })],
    [/\bwho(?:'s| is) my best friend\b/, () => ({ kind: 'fact', key: 'bff', desc: 'best friend' })],
    [/\bwhat (?:do|did) i (?:like|love|enjoy)\b|\bwhat am i into\b|\bwhat things do i like\b/, () => ({ kind: 'likes' })],
    [/\bwhat (?:do|did) i (?:hate|not like|dislike)\b/, () => ({ kind: 'dislikes' })],
    [/\bwhat (?:am i|i'm) (?:scared|afraid) of\b/, () => ({ kind: 'fears' })],
    [/\bwhat do you know about me\b|\bwhat have i told you\b|\bhow well do you know me\b|\btell me about (?:me|myself)\b/, () => ({ kind: 'about' })],
    [/\bremember me\b|\bdo you know who i am\b|\bhave we (?:met|talked) before\b/, () => ({ kind: 'meet' })],
    [/\b(?:remember|recall) (?:when|what|how|that)? ?i (?:said|told you|mentioned|talked)(?: about)? ?(.*)/, (m) => ({ kind: 'search', who: 'me', q: m[1] })],
    [/\bwhat did i (?:say|tell you|mention)(?: about)? ?(.*)/, (m) => ({ kind: 'search', who: 'me', q: m[1] })],
    [/\bdid i (?:tell you|say|mention)(?: about| that)? ?(.*)/, (m) => ({ kind: 'search', who: 'me', q: m[1] })],
    [/\bwhat did you (?:say|tell me)(?: about)? ?(.*)/, (m) => ({ kind: 'search', who: 'you', q: m[1] })],
    [/\bremember (?:the |our |that |when )(.+)/, (m) => ({ kind: 'search', who: 'both', q: m[1] })],
    [/\bwhat were we (?:talking|texting) about\b|\bwhere were we\b|\bwhat was i saying\b/, () => ({ kind: 'last' })],
  ];
  /* ---------- opinion questions aimed at the character ---------- */
  const OPQ = [
    [/\bwhat(?:'s| is) your favorite ([a-z ]{2,18}?)\??$/, (m) => ({ kind: 'fav', cat: m[1].trim().replace(/s$/, '') })],
    [/\bdo you (?:even )?(?:like|love|enjoy|hate) ([a-z' ]{2,30}?)\??$/, (m) => ({ kind: 'op', x: m[1].trim() })],
    [/\bwhat do you think (?:of|about) ([a-z' ]{2,30}?)\??$/, (m) => ({ kind: 'op', x: m[1].trim() })],
    [/\bhow do you feel about ([a-z' ]{2,30}?)\??$/, (m) => ({ kind: 'op', x: m[1].trim() })],
    [/\bare you (?:into|a fan of) ([a-z' ]{2,30}?)\??$/, (m) => ({ kind: 'op', x: m[1].trim() })],
    [/\b(?:is|are) ([a-z' ]{2,24}?) (?:good|cool|bad|overrated|underrated)\??$/, (m) => ({ kind: 'op', x: m[1].trim() })],
  ];

  const baseAn = N.analyze;
  N.analyze = function (raw) {
    const an = baseAn(raw), t = an.t;
    for (const k in MORE) if (MORE[k].test(t)) an.I[k] = 1;
    if (an.I.love && /\b(love|like) (pizza|it|that|this|games?|skyforge|drawing|music|dogs?|cats?)\b/.test(t) && !/\blove (you|u|ya)\b/.test(t)) delete an.I.love;
    an.clauses = t.split(/[.!?;]+|\bbut\b|\band then\b|,\s*(?=i |my |he |she )/).map((s) => s.trim()).filter(Boolean);
    an.qtype = an.q ? ((t.match(/^(who|what|where|when|why|how)\b/) || [])[1] || 'yn') : null;
    an.people = PEOPLE.filter(([, re]) => re.test(t)).map(([id]) => id);
    an.pron = /\b(he|him|his)\b/.test(t) ? 'm' : /\b(she|her|hers)\b/.test(t) ? 'f' : /\b(they|them)\b/.test(t) ? 'n' : null;
    an.facts = []; const seen = new Set();
    an.clauses.forEach((cl) => FACTS.forEach(([re, fn]) => { const m = cl.match(re); if (!m) return; const f = fn(m, cl); if (f && f.v && f.v.length >= 2 && !seen.has(f.key)) { seen.add(f.key); an.facts.push(f); } }));
    an.memq = null; for (const [re, fn] of MEMQ) { const m = t.match(re); if (m) { an.memq = fn(m); if (an.memq.q != null) an.memq.q = clean(an.memq.q.replace(/\b(yesterday|earlier|last night|before|the other day|today|about)\b/g, '')); an.memq.when = /\byesterday|last night\b/.test(t) ? 1 : /\bearlier|today\b/.test(t) ? 0 : null; break; } }
    an.opq = null; if (!an.memq) for (const [re, fn] of OPQ) { const m = t.match(re); if (m) { an.opq = fn(m); break; } }
    if (an.memq || an.opq) { delete an.I.love; }
    // asking an opinion / recalling a fact / naming a harmless fear is NOT a disclosure
    const ABUSE = /\b(hit|hits|hitting|hurt|hurts|grab|grabbed|bruise|bruises|drunk|drinks|drinking|beer|yell|yells|yelling|scream|screams|screaming|punch|punched|shove|shoved|slap|slapped|threw|throws|wasted|smash|smashed|scared of (him|rick)|afraid of (him|rick))\b/;
    const soft = !ABUSE.test(t);
    const harmlessFear = an.facts.some((f) => f.kind === 'fear' && !/\b(rick|stepdad|him|he|home|house|dad|going home)\b/.test(f.v));
    const chatty = an.facts.some((f) => /^(fav|like|dislike|skill|dream|birthday|pet|nick|bff|wish)$/.test(f.kind));
    if (soft && (an.memq || an.opq || harmlessFear || chatty)) { delete an.I.disclose; if (an.memq || an.opq || harmlessFear) delete an.I.scared; delete an.I.angry; }
    an.short = an.len <= 3;
    return an;
  };
  N.clean = clean; N.dayOffset = dayOffset; N.PEOPLE = PEOPLE;
  }

  /* ==================== 4. topics + meta-talk (src/converse.js — understanding only) ==================== */
  {
const N = API;
  const TOP = {
    home: /\b(home|house|at home|family|parents|apartment)\b/,
    rick: /\b(rick|stepdad|step dad|step-dad|mom'?s boyfriend)\b/,
    mom: /\b(mom|mum|mama|mother|my ma)\b/,
    lily: /\b(lily|little sister|my sister|sis)\b/,
    grandma: /\b(grandma|gran|nana|grandmother|granny)\b/,
    friends: /\b(jordan|friends?|bff|best friend|buddy)\b/,
    tyler: /\b(tyler|bull(y|ies|ied|ying)|push(es|ed|ing)? me|shov(es|ed|ing) me|picks? on me|trips? me)\b/,
    school: /\b(school|class(es)?|teachers?|homework|grades?|tests?|quiz|math|science|english|history|report card)\b/,
    sleep: /\b(sleep(ing)?|slept|tired|exhausted|insomnia|awake|nightmares?|can'?t sleep|up all night)\b/,
    food: /\b(eat(ing)?|ate|food|hungry|starving|dinner|breakfast|lunch|meals?)\b/,
    drink: /\b(drinks?|drinking|drunk|beer|bottles?|wasted|booze|liquor|alcohol)\b/,
    yell: /\b(yell(s|ed|ing)?|scream(s|ed|ing)?|shout(s|ed|ing)?|loud|fight(s|ing)?|argu(e|es|ing|ment)|slam(s|med)?)\b/,
    violence: /\b(hit(s|ting)?|throw(s|ing)?|threw|thrown|smash(es|ed)?|punch(es|ed)?|grab(s|bed)?|bruises?|hurt(s)? (me|her|mom|lily)|slap(s|ped)?|shov(e|es|ed) (me|her|mom)|kick(s|ed)?|choke)\b/,
    mombusy: /\b(works? (nights|late|doubles?|a lot|all the time|two jobs|so much)|night shifts?|double shifts?|doubles|never home|always (at )?work(ing)?|working (nights|late|doubles|all the time)|at work)\b/,
    care: /\b(take care of|taking care of|babysit|watch (lily|her)|make (her|lily) (dinner|food)|put (her|lily) to bed|look after)\b/,
    run: /\b(leave|leaving|run away|running away|runaway|disappear|get out of here|go somewhere else|just go)\b/,
    money: /\b(money|broke|bills?|rent|cash|allowance|afford)\b/,
    art: /\b(draw(ing|s)?|art|sketch(ing|book)?|paint(ing)?|comics?)\b/,
    games: /\b(games?|gaming|skyforge|xbox|playstation|console|kart chaos)\b/,
    feelings: /\b(sad|angry|mad|scared|lonely|anxious|stressed|depressed|upset|numb|empty|hate my life)\b/,
    good: /\b(got an? (a|b)\b|got an a\+?|aced|passed|won|proud|good news|best day|awesome day|went great|went well)\b/,
    process: /\bwhat (will|would|is gonna|is going to) happen\b|\b(will|would|are) you (gonna |going to )?(tell|call|report)\b|\bwho (will|would) you (tell|call)\b|\b(will|would) i (get|be) taken\b|\bfoster\b|\bwill (rick|he) (find out|know)\b|\bwill my mom (get in trouble|find out|know)\b|\bmandated\b|\bwhat does that mean\b/,
  };
  const topicsOf = (t) => { t = String(t || '').toLowerCase().replace(/[’']/g, "'"); return Object.keys(TOP).filter((k) => TOP[k].test(t)); };

  /* ---------- meta & about-you ---------- */
  const META = [
    ['alreadyTold', /\bi (already|just) (told|said|explained|answered)|\bi told you (already|that|before|about|this)|\bi said that\b|\byou (already )?asked (me )?(that|this)( already)?\b|\bi just answered\b/],
    ['whyAsk', /\bwhy (do|would|are|d) ?you (keep|always) (asking|bringing|saying)|\bstop asking\b|\bwhy (do you|you|would you) (care|wanna know|want to know|ask(ing)?)\b|\bwhy (does|is) (it|that) (matter|important)\b|\bwhy (are you|u) (asking|so nosy)\b/],
    ['changeTopic', /\b(can we|could we|lets|let's|can u|can you) (talk about|change|switch) (something else|the subject|the topic|anything else|topics?)|\bchange the (subject|topic)\b|\bi (don't|dont|do not) (want|wanna) (to )?talk about (it|that|this|home|him|rick|school|her|them)\b|\bnot talking about (it|that|this)\b|\bdrop it\b|\bnext topic\b|\bsomething else\b/],
    ['listen', /\bare you (even )?listening\b|\byou('re| are) not listening\b|\byou don'?t listen\b|\bdid you hear (me|what i said)\b/],
    ['askPerm', /^(can|could|may) i ask (you )?(something|a question|you something)\??$/],
    ['clarify', /\bwhat do you mean\b|\bwdym\b|\bi don'?t (get it|understand)\b|\bhuh\??$/],
  ];
  const ABOUT = [
    ['kids', /\b(do|did) (you|u) have (any )?(kids|children|a (son|daughter|kid|baby))\b|\bare (you|u) a (mom|mother|dad|parent)\b/],
    ['married', /\bare (you|u) married\b|\b(do you have|got) a (husband|wife|boyfriend|girlfriend|partner)\b/],
    ['age', /\bhow old (are|r) (you|u)\b|\bwhat'?s your age\b/],
    ['from', /\bwhere (are|r) (you|u) from\b|\bwhere did (you|u) grow up\b|\bwere (you|u) born here\b/],
    ['pets', /\b(do (you|u) have|got) (a |any )?(pets?|dogs?|cats?)\b/],
    ['hobby', /\bwhat do (you|u) do for fun\b|\b(do you have|what are your|what'?s your) hobb(y|ies)\b|\bwhat do (you|u) like to do\b/],
    ['job', /\bwhy (did you become|are you) an? (counselor|teacher|nurse|cop|police)\b|\bwhat do (you|u) do for (work|a living)\b|\bwhat'?s your job\b|\bdo (you|u) like your job\b/],
    ['day', /\bhow (was|is|'s) your (day|week|weekend|night)\b|\bhow (are|r) (you|u)( doing| feeling| today)?\b|\bhow'?s it going\b|\bhow have you been\b|\bwyd\b|\bwhat are you doing\b/],
    ['young', /\bwhat were (you|u) like (at|when you were) (my age|12|twelve|a kid|little)\b|\bwhen (you|u) were (my age|a kid|little)\b|\b(do you have|got) (any )?(brothers?|sisters?|siblings)\b/],
    ['areok', /\bare (you|u) (ok|okay|alright|all right|good|fine|feeling ok)\b|\byou (ok|okay|good)\??$/],
    ['petnews', /\bhow('s| is| are) (newton|duchess|moses|mr\.? buttons|your (cat|dog|pet|bunny))\b/],
    ['invite', /\b(do you |d'?you |u )?(want|wanna) (to )?(play|hang( out)?|come( over)?|watch|go (to|outside)|skate|get food)\b|\blet'?s (play|hang|go|skate|watch)\b/],
    ['real', /\bare (you|u) (a )?(real|robot|ai|bot|human)\b/],
    ['likeme', /\bdo (you|u) (like|hate) me\b|\bare (you|u) mad at me\b/],
    ['name', /\bwhat'?s your (real |first )?name\b/],
  ];
  const GREET = /^(hi+|hey+|hello|yo+|sup|wassup|heya|hiya|howdy|good (morning|afternoon|evening)|morning|hey there|hi there)( (ms\.? okafor|miss okafor|mom|mommy|grandma|gran|jordan|lily|mrs\.? patel|dude|man|bro|again|you))?[!. ]*$/;

  const ba = N.analyze;
  N.analyze = function (raw) {
    const an = ba.apply(this, arguments);
    const t = String(an.t || '').replace(/[’]/g, "'");
    an.topics = topicsOf(t); an.tset = {}; an.topics.forEach((k) => (an.tset[k] = 1));
    // "bad" words around school/home decide good vs bad
    if (an.tset.good && /\b(not|didn'?t|never|failed)\b/.test(t)) delete an.tset.good;
    an.meta = null; for (const [k, re] of META) if (re.test(t)) { an.meta = k; break; }
    an.about = null; for (const [k, re] of ABOUT) if (re.test(t)) { an.about = k; break; }
    an.greet = GREET.test(t.trim());
    return an;
  };
  }

  /* ==================== 5. claims + sharper understanding (src/mind2.js — understanding only) ==================== */
  {
const N = API;
const cap = (s) => { s = s == null ? '' : String(s); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  const NAMEBAD = /^(a|an|the|not|so|just|fine|okay|ok|good|here|there|scared|sad|sorry|tired|hungry|lost|alone|home|going|from|with|staying|visiting|new|back|done|sure|really|in|at|safe|cold|waiting|looking|leaving|running|serious|kidding|joking|bored|hurt|sick|only|still|also|gonna|trying|like|nobody|nothing|no|yes|yeah|nope|idk|what|who|why|hi|hey|hello|thanks|twelve|eleven|thirteen|ten|fourteen|fifteen)$/i;
  const NUMW = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
  const PLACE = "([a-z][a-z .'-]{1,24}?)(?=[.!?]|$| and | but | because | with | to see| tonight| tomorrow| for )";
  N.claims = function (raw) {
    const r = String(raw || ''), t = r.toLowerCase().replace(/\bim\b/g, "i'm"), f = {};
    let m = r.match(/\b(?:my name is|my name's|name's|call me|i go by|the name's)\s+([A-Za-z][A-Za-z'-]{1,14})/i) || r.match(/\b(?:i'?m|I am)\s+([A-Z][a-z'-]{1,14})\b(?!\s*(?:years|yrs))/) || r.match(/\b(?:no,? |wait,? )+it'?s\s+([A-Z][a-z'-]{1,14})\b/);
    if (m && !NAMEBAD.test(m[1])) f.name = cap(m[1].toLowerCase());
    m = t.match(/\b(?:i'm|i am)\s+(1[0-9]|20|[5-9]|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b(?!\s*(?:dollars|bucks|minutes|min|miles|%))/) || t.match(/\b(1[0-9]|[5-9])\s*(?:years?|yrs?) old\b/);
    if (m) f.age = NUMW[m[1]] || +m[1];
    m = t.match(new RegExp("\\b(?:i'm from|i am from|i come from|i live in|we live in|i used to live in|i grew up in)\\s+" + PLACE)); if (m) f.from = m[1].trim();
    m = t.match(new RegExp("\\b(?:going to|heading to|on my way to|trying to get to|want to go to|traveling to|headed to|going up to|going down to)\\s+(?:see\\s+)?" + PLACE));
    if (m && !/^(be|do|sleep|bed|get|go|school|stay|eat|the bathroom|bathroom|buy|try|call|tell|pay|ask|talk|need|have|run|walk|find|make|take|look|wait|work|say|kill|die|cry|hit|hurt|leave|miss)\b/.test(m[1].trim()) && !/\bhome\b/.test(m[1])) f.going = m[1].trim().replace(/^the /, '');
    m = t.match(/\b(?:i'm|i am|we're|we are|i'm here|i'm staying|staying)\s+with\s+(my\s+[a-z]+|[a-z]+(?: and [a-z]+)?)/); if (m && !/^(you|it|that|him|her|them)$/.test(m[1])) f.with = m[1];
    m = t.match(/\bmy (mom|dad|mother|father|parents|aunt|uncle|grandma|grandpa|folks)\s+(?:is|are|'s|'re)\s+((?:in|at|out|over|parking|getting|waiting|inside|outside|coming|picking|on|just|working|back|busy|asleep)[a-z,']{0,36}?)(?=[.!?]|$| so | but )/); if (m) f.parents = `${m[1]} ${/s$/.test(m[1]) || m[1] === 'folks' ? 'are' : 'is'} ${m[2].trim()}`;
    m = t.match(/\b(?:i'm|i am|we're)\s+(visiting (?:my )?[a-z]+(?: [a-z]+)?|homeschooled|new here|new in town|on (?:a )?(?:field|school|band|class) trip|staying at the campground|here for the summer|doing a school project|on vacation)/); if (m) f.story = m[1];
    m = t.match(/\bi go to\s+([a-z .'-]{2,30}?(?:school|academy|middle|elementary|junior high))\b/); if (m) f.school = m[1];
    return f;
  };

  /* ---------- understanding ---------- */
  const NEGATABLE = ['hostile', 'run', 'love', 'sad', 'scared', 'angry', 'tired', 'food', 'disclose'];
  const NEG_RE = /\b(not|never|no longer|isn't|aren't|wasn't|weren't|ain't|didn't|don't|won't|not really|never ever)\s+(?:(?:so|very|that|really|even|too|at all|a|an|going|gonna|ever|been|being)\s+){0,2}([a-z']+)/g;
  const baseA = N.analyze;
  let focus = null; // last person mentioned in the current conversation
  N.analyze = function (raw) {
    const an = baseA.apply(this, arguments), t = an.t;
    // negation (selfharm never gets dropped)
    if (NEG_RE.test(t)) { NEG_RE.lastIndex = 0; const t2 = t.replace(NEG_RE, ' '), r2 = baseA.call(this, t2); an.negated = an.negated || [];
      NEGATABLE.forEach((k) => { if (an.I[k] && !r2.I[k] && !(k === 'disclose' && /\b(hit|hurt|grab|touch)/.test(t))) { delete an.I[k]; an.negated.push(k); } });
      if (/\b(don't|do not|never|not) (feel )?safe\b/.test(t)) { an.I.scared = 1; an.I.unsafe = 1; delete an.I.safe; delete an.I.deflect; } }
    NEG_RE.lastIndex = 0;
    if (/\b(not|never|won't|ain't) (going|gonna|go) (back )?home\b|\bnever going back\b/.test(t)) an.I.refuseHome = 1;
    if (/\b(don't|do not|dont) have (any |much )?(money|cash)|\bno money\b|\bi'm broke\b|\bout of money\b/.test(t)) an.I.broke = 1;
    // claims
    an.claims = N.claims(raw);
    if (an.claims.name) { const nl = an.claims.name.toLowerCase(); delete an.I[nl]; if (an.people) an.people = an.people.filter((p) => p !== nl); if (an.facts) an.facts = an.facts.filter((f) => f.kind !== 'nick' || f.v.toLowerCase() !== nl || /call me/.test(t)); }
    if (an.claims.age) delete an.I.age;
    // memory questions about claims
    if (/\bhow old (am i|did i say i was|i said i was)\b/.test(t)) an.memq = { kind: 'claim', key: 'age' };
    else if (/\bwhere (am i from|did i say i('m| was| am) from|i said i('m| was) from)\b/.test(t)) an.memq = { kind: 'claim', key: 'from' };
    else if (/\bwhere (am i going|am i headed|did i say i was going|was i going)\b/.test(t)) an.memq = { kind: 'claim', key: 'going' };
    else if (/\b(what'?s|what is|what did i say) my name( was| is)?\b|\bdo you (know|remember) my name\b/.test(t)) an.memq = { kind: 'claim', key: 'name' };
    else if (/\bwhat (was|is) my story\b|\bwhat did i tell you about me\b/.test(t)) an.memq = { kind: 'claim', key: '*' };
    // numbers, money, nights
    const nums = (t.match(/\$?\b\d+(?:\.\d+)?\b/g) || []).map((x) => +x.replace('$', '')); an.nums = nums;
    let mm = t.match(/\$\s?(\d+)|\b(\d+)\s*(?:dollars|bucks|usd)\b|\b(?:pay|give you|offer|do|how about|what about|make it)\s+\$?(\d+)\b/); if (mm) an.money = +(mm[1] || mm[2] || mm[3]);
    mm = t.match(/\b(\d+|one|two|three|four|five|six|a couple|a few)\s+(nights?|days?)\b/); if (mm) an.nights = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, 'a couple': 2, 'a few': 3 }[mm[1]] || +mm[1];
    if (/\b(a|one|the|for a|whole) week\b|\bweekly\b/.test(t)) an.nights = 7; if (/\b(a|one|the|for a|whole) month\b|\bmonthly\b/.test(t)) an.nights = 30;
    // he / she / they
    if (an.people && an.people.length) focus = an.people[an.people.length - 1];
    else if (an.pron && focus) { const F = { mom: 'f', grandma: 'f', lily: 'f', okafor: 'f', patel: 'f', rick: 'm', jordan: 'm', tyler: 'm', dex: 'm' }; if (!F[focus] || F[focus] === an.pron || an.pron === 'n') { an.ref = focus; an.people = [focus]; } }
    return an;
  };
  }

  /* ==================== 6. talk fixes (src/talkfix.js — understanding only) ==================== */
  {
const N = API;
  /* ---------- understanding ---------- */
  const bA = N.analyze;
  N.analyze = function () {
    const an = bA.apply(this, arguments), t = an.t || '';
    if (/\b(not|aren'?t|isn'?t|ain'?t|wasn'?t|never|n't) (so |that |very |really |doing |going |feeling )?(great|good|ok|okay|fine|alright|well)\b|\b(been|is|it'?s|things are|life is|home is) (rough|hard|bad|awful|terrible|the worst|a mess)\b|\bbad day\b|\bthings suck\b|\beverything sucks\b|\bnot doing (so )?(good|well)\b/.test(t)) { an.I.low = 1; an.I.sad = 1; delete an.I.safe; delete an.I.deflect; }
    if (/\b(or nah|or not|yes or no|tell (me )?quick|just (say|tell me)|answer me|be honest|for real tho|fr tho)\b/.test(t)) { an.I.urge = 1; an.q = true; }
    return an;
  };

  const QW = /^(where|what|why|how|who|when|are|is|do|does|did|can|could|would|will|wanna)\b/i;
  const qfix = (s) => { s = String(s || ''); const parts = s.split(/(?<=[.!?])\s+/); const last = parts[parts.length - 1]; if (last && !/[.!?]["”]?$/.test(last.trim()) && QW.test(last.trim())) parts[parts.length - 1] = last.trim() + '?'; return parts.join(' '); };

N.qfix = qfix;
  }

  /* ==================== 7. multi-clause splitter (src/clauses.js — split only) ==================== */
  {
  const ABBR = /\b(ms|mr|mrs|dr|st|mt|ft|jr|sr|vs|etc)\./gi;
  const START = /^(i|i'm|im|i'd|i'll|i've|can|could|would|will|do|does|did|is|are|am|was|what|what's|whats|where|when|why|how|who|you|u|your|ur|my|we|he|she|they|it's|its|there|have|has|should|please|also|and|thanks|thank|no|yes|yeah|nah|ok|okay|sorry|maybe|let|let's|lets|tell|give|need|want|wanna|gotta)\b/i;
  const words = (s) => (s.match(/[a-z0-9']+/gi) || []).length;
  const FILLER = /^(fr|lol|lmao+|ok+|okay|go on|wait what|bro same|same|hm+|mhm|\.{2,}|yeah|ya|huh|what\??|and\??|sure|cool|nice|k|idk|dunno|not sure|good question|hm+\. good question|hmm+\.? interesting|mm+|right|i see|uh huh|go on\.?|tell me more|is that so|is that right|oh yeah|really|huh\. ok|oh)\W*$/i;
  const GREETONLY = /^(hi+|hey+|hello|yo+|sup|so|um+|uh+|ok+|okay|well|listen|look|dude|bro|man|like|anyway)\W*$/i;
  function split(raw) {
    let s = String(raw || '').replace(ABBR, (m) => m.slice(0, -1) + '\u2024');
    if (words(s) < 7) return [raw];
    let parts = s.split(/(?<=[.!?;])\s+|(?<=\?)(?=\s*\w)/).map((x) => x.trim()).filter(Boolean);
    const out = [];
    parts.forEach((pt) => {
      // ", and/but/also/so/plus ..." or " but / also / plus ..." or " and <clause start>"
      const bits = pt.split(/\s*,\s*(?:and |but |also |so |plus |then )?(?=\S)|\s+(?:and also|but also|and then|also|plus|but)\s+|\s+and\s+(?=(?:i|i'm|im|can|could|do|does|is|are|what|whats|what's|where|when|why|how|who|you|u|your|ur|my|we|it's|there)\b)/i);
      let cur = '';
      bits.forEach((b) => {
        b = (b || '').trim(); if (!b) return;
        // keep tiny bits and non-clauses attached to what came before ("i'm hungry, cold" / "no, i can't")
        if (cur && (words(b) < 3 || !START.test(b) && words(b) < 5 || /^(because|cause|cuz|since|so that|if|unless|or)\b/i.test(b))) cur += (/^(because|cause|cuz|since|so that|if|unless|or)\b/i.test(b) ? ' ' : ', ') + b;
        else { if (cur) out.push(cur); cur = b; }
      });
      if (cur) out.push(cur);
    });
    // a leading lone "hey" / "no" joins the next clause
    const merged = [];
    out.forEach((x) => { const last = merged[merged.length - 1]; if (last != null && (words(last) <= 2 || words(last) <= 4 && /^(no|nah|nope|yes|yeah|ya|ok|okay|thanks|thank you|sorry|well|hey|yo|i can'?t|i cant)\b/i.test(last))) merged[merged.length - 1] = last + ', ' + x; else merged.push(x); });
    return merged.map((x) => x.replace(/\u2024/g, '.')).filter((x) => !GREETONLY.test(x.trim()));
  }

  API.splitClauses = split;
  API.Clauses = { split };
  API.isFiller = (s) => FILLER.test(String(s == null ? '' : s).trim());
  API.isGreeting = (s) => GREETONLY.test(String(s == null ? '' : s).trim());
  }

  return API;
});
