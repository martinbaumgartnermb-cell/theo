// ================= GEMEINSAME TEILE für Théos Apps =================
// Name, Foto, Vorlesen, Töne, Sammelalbum und das Nachfahren.
// Alles wird im Browser gespeichert. Die Namen der Speicher beginnen mit "theo-",
// damit sie sich NICHT mit Rémis Apps vermischen (gleiche GitHub-Adresse!).

const NAME = "Théo";
const FOTO_SPEICHER = "theo-foto";
const ALBUM_SPEICHER = "theo-sammelalbum";
const STICKER_ALLE = 15;         // alle 15 richtigen Antworten ein Sticker (wie bei Rémi)
const ALBUM_VERSION = "2";       // Version erhöhen = Album wird einmalig geleert
const GOLD_CHANCE = 0.1;         // ab und zu ist ein Sticker golden

function zufall(liste) { return liste[Math.floor(Math.random() * liste.length)]; }
function mischen(liste) {
  const l = liste.slice();
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = l[i]; l[i] = l[j]; l[j] = t; }
  return l;
}

// ================= VORLESEN =================
// Théo kann noch nicht lesen: Jede Aufgabe wird vorgelesen.
let stimme = null;
// Möglichst natürliche Stimme: zuerst "Premium" oder "Erweitert" (auf dem iPad herunterladbar),
// dann eine weibliche deutsche Stimme.
function stimmeWaehlen() {
  if (!window.speechSynthesis) return;
  const alle = speechSynthesis.getVoices().filter(function (x) { return /^de/i.test(x.lang); });
  function punkte(v) {
    let p = 0;
    if (/premium/i.test(v.name)) p += 40;
    if (/erweitert|enhanced|verbessert/i.test(v.name)) p += 30;
    if (/anna|petra|helena|marlene|vicki|katja/i.test(v.name)) p += 10;
    if (v.lang === "de-CH") p += 5;
    if (v.localService) p += 1;
    return p;
  }
  alle.sort(function (a, b) { return punkte(b) - punkte(a); });
  stimme = alle[0] || null;
}
if (window.speechSynthesis) {
  stimmeWaehlen();
  speechSynthesis.onvoiceschanged = stimmeWaehlen;
}
function sprich(text) {
  if (!window.speechSynthesis || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = stimme ? stimme.lang : "de-DE";
  if (stimme) u.voice = stimme;
  u.rate = 0.92;                 // ruhig, aber nicht künstlich langsam
  u.pitch = 1.0;
  speechSynthesis.speak(u);
}

// ================= TÖNE =================
let tonKontext = null;
function tonStart() {
  if (!tonKontext) { try { tonKontext = new (window.AudioContext || window.webkitAudioContext)(); } catch (f) {} }
  if (tonKontext && tonKontext.state === "suspended") tonKontext.resume();
}
document.addEventListener("pointerdown", tonStart);
function ton(noten) {               // noten: Liste von [Frequenz, Start, Dauer]
  if (!tonKontext) return;
  const jetzt = tonKontext.currentTime;
  noten.forEach(function (n) {
    const o = tonKontext.createOscillator(), g = tonKontext.createGain();
    o.type = "sine"; o.frequency.value = n[0];
    g.gain.setValueAtTime(0.0001, jetzt + n[1]);
    g.gain.exponentialRampToValueAtTime(0.25, jetzt + n[1] + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, jetzt + n[1] + n[2]);
    o.connect(g); g.connect(tonKontext.destination);
    o.start(jetzt + n[1]); o.stop(jetzt + n[1] + n[2] + 0.05);
  });
}
function tonRichtig() { ton([[659, 0, .18], [880, .12, .3]]); }
function tonSticker() { ton([[523, 0, .15], [659, .12, .15], [784, .24, .15], [1047, .36, .45]]); }

const LOB = ["Super!", "Toll gemacht!", "Bravo!", "Genau!", "Richtig!", "Wow, super!", "Das hast du toll gemacht!"];
// Die Stimme sagt nur etwas, wenn eine Antwort falsch ist – kurz und freundlich.
const NOCHMAL = ["Das stimmt noch nicht. Versuch es nochmal.", "Nicht ganz. Probier es nochmal.", "Hmm, schau nochmal genau."];

// ================= NAME UND FOTO =================
function fotoAnzeigen() {
  let bild = null;
  try { bild = localStorage.getItem(FOTO_SPEICHER); } catch (f) {}
  const img = document.getElementById("foto"), hinweis = document.getElementById("fotoHinweis");
  if (!img) return;
  if (bild) { img.src = bild; img.style.display = "block"; hinweis.style.display = "none"; }
}
function fotoEinrichten() {
  const n = document.getElementById("name");
  if (n) n.textContent = NAME;
  const wahl = document.getElementById("fotoWahl");
  if (!wahl) return;
  wahl.onchange = function () {
    const datei = wahl.files[0];
    if (!datei) return;
    const leser = new FileReader();
    leser.onload = function () {
      const original = new Image();
      original.onload = function () {
        // Foto verkleinern, damit es in den Speicher passt
        const groesse = 300, leinwand = document.createElement("canvas");
        leinwand.width = groesse; leinwand.height = groesse;
        const k = Math.min(original.width, original.height);
        leinwand.getContext("2d").drawImage(original, (original.width - k) / 2, (original.height - k) / 2, k, k, 0, 0, groesse, groesse);
        try { localStorage.setItem(FOTO_SPEICHER, leinwand.toDataURL("image/jpeg", 0.85)); } catch (f) {}
        fotoAnzeigen();
      };
      original.src = leser.result;
    };
    leser.readAsDataURL(datei);
  };
  fotoAnzeigen();
}

// ================= SAMMELALBUM =================
// Gehört zu beiden Apps von Théo (Buchstaben und Zahlen). Richtige Antworten aus beiden zählen.
const STICKER_SEITEN = [
  { titel: "🚜 Auf dem Bauernhof", sticker: [["🐄","Kuh"],["🐷","Schwein"],["🐔","Huhn"],["🐴","Pferd"],["🐑","Schaf"],
                                            ["🐐","Ziege"],["🐥","Küken"],["🐶","Hund"],["🐱","Katze"],["🚜","Traktor"]] },
  { titel: "🦖 Dinos", sticker: [["🦖","T-Rex"],["🦕","Langhals"],["🐉","Drache"],["🐲","Drachenkopf"],["🦎","Echse"],
                                 ["🐊","Krokodil"],["🥚","Dino-Ei"],["🌋","Vulkan"],["🦴","Knochen"],["🐢","Schildkröte"]] },
  { titel: "🌊 Im Meer", sticker: [["🐬","Delfin"],["🦈","Hai"],["🐙","Krake"],["🐠","Fisch"],["🐳","Wal"],
                                   ["🦀","Krebs"],["🦭","Robbe"],["🐡","Kugelfisch"],["🦑","Tintenfisch"],["🐚","Muschel"]] },
  { titel: "🚒 Fahrzeuge", sticker: [["🚒","Feuerwehr"],["🚓","Polizei"],["🚑","Krankenwagen"],["🚂","Lokomotive"],["🚁","Helikopter"],
                                     ["🚀","Rakete"],["🏎️","Rennauto"],["🚌","Bus"],["✈️","Flugzeug"],["🚲","Velo"]] },
  { titel: "🍦 Leckereien", sticker: [["🍦","Glace"],["🍰","Kuchen"],["🍓","Erdbeere"],["🍌","Banane"],["🍕","Pizza"],
                                      ["🧁","Muffin"],["🍩","Donut"],["🍎","Apfel"],["🍪","Guetzli"],["🍭","Lolli"]] },
  { titel: "🌈 Wunderwelt", sticker: [["🦄","Einhorn"],["🌈","Regenbogen"],["⭐","Stern"],["🌙","Mond"],["☀️","Sonne"],
                                      ["🎈","Ballon"],["🎁","Geschenk"],["👑","Krone"],["🧸","Teddy"],["🪁","Drachen"]] }
];
const ALLE_STICKER = [];
STICKER_SEITEN.forEach(function (s) { s.sticker.forEach(function (x) { ALLE_STICKER.push({ emoji: x[0], name: x[1] }); }); });

// Album einmalig leeren, wenn die Version neu ist
(function () {
  try {
    if (localStorage.getItem("theo-album-version") !== ALBUM_VERSION) {
      localStorage.removeItem(ALBUM_SPEICHER);
      localStorage.setItem("theo-album-version", ALBUM_VERSION);
    }
  } catch (f) {}
})();

function albumLaden() {
  let a = null;
  try { const t = localStorage.getItem(ALBUM_SPEICHER); if (t) a = JSON.parse(t); } catch (f) {}
  return Object.assign({ zaehler: 0, sticker: {}, serie: 0, letzterTag: "" }, a || {});
}
function albumSpeichern(a) { try { localStorage.setItem(ALBUM_SPEICHER, JSON.stringify(a)); } catch (f) {} }
function tagText(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function gesternText() { const d = new Date(); d.setDate(d.getDate() - 1); return tagText(d); }
function anzahlSticker(a) { return ALLE_STICKER.filter(function (s) { return a.sticker[s.emoji]; }).length; }

function stickerZiehen(a) {
  const fehlen = ALLE_STICKER.filter(function (s) { return !a.sticker[s.emoji]; });
  const nichtGold = ALLE_STICKER.filter(function (s) { return a.sticker[s.emoji] && !a.sticker[s.emoji].gold; });
  let s, gold;
  if (fehlen.length) { s = zufall(fehlen); gold = Math.random() < GOLD_CHANCE; }
  else if (nichtGold.length) { s = zufall(nichtGold); gold = true; }
  else return null;
  a.sticker[s.emoji] = { gold: gold, zeit: Date.now() };
  return { emoji: s.emoji, name: s.name, gold: gold };
}

// Bei jeder richtigen Antwort aufrufen. Gibt true zurück, wenn es einen Sticker gab.
function albumRichtig() {
  const a = albumLaden();
  const heute = tagText(new Date());
  if (a.letzterTag !== heute) {
    a.serie = a.letzterTag === gesternText() ? a.serie + 1 : 1;
    a.letzterTag = heute;
  }
  a.zaehler++;
  let neu = null;
  if (a.zaehler >= STICKER_ALLE) {
    a.zaehler = 0;
    neu = stickerZiehen(a);
    if (!neu) neu = { emoji: "🏆", name: "Album komplett!", gold: true, fertig: true };
  }
  albumSpeichern(a);
  albumAnzeigen(a);
  if (neu) stickerFeiern(neu, a);
  return !!neu;
}

function punkteHtml(anzahl) {
  let p = "";
  for (let i = 0; i < STICKER_ALLE; i++) p += '<i class="' + (i < anzahl ? "voll" : "") + '"></i>';
  return p;
}
function albumAnzeigen(a) {
  a = a || albumLaden();
  const z = document.getElementById("albumZahl");
  if (z) z.textContent = anzahlSticker(a);
  const p = document.getElementById("albumPunkte");
  if (p) p.innerHTML = punkteHtml(a.zaehler);
  document.querySelectorAll(".bis-sticker").forEach(function (b) { b.innerHTML = "🎁 " + punkteHtml(a.zaehler); });
  const serie = (a.letzterTag === tagText(new Date()) || a.letzterTag === gesternText()) ? a.serie : 0;
  const feld = document.getElementById("serie");
  if (feld) { feld.hidden = serie < 2; feld.textContent = "🔥 " + serie + " Tage hintereinander geübt!"; }
}

function stickerFeiern(s, a) {
  const box = document.getElementById("stickerPlus");
  box.className = s.gold ? "gold" : "";
  box.innerHTML =
    '<div class="s-titel">' + (s.fertig ? "Alles gesammelt!" : s.gold ? "✨ Goldener Sticker! ✨" : "🎁 Neuer Sticker!") + '</div>' +
    '<div class="s-bild">' + s.emoji + '</div>' +
    '<div class="s-name">' + s.name + '</div>' +
    '<div class="s-info">📒 ' + anzahlSticker(a) + ' von ' + ALLE_STICKER.length + '</div>';
  void box.offsetWidth;
  box.classList.add("zeigen");
  tonSticker();
  const knopf = document.getElementById("albumKnopf");
  setTimeout(function () { knopf.classList.remove("landet"); void knopf.offsetWidth; knopf.classList.add("landet"); }, 2500);
}

function albumOeffnen() {
  const a = albumLaden();
  let html = '<h3>📒 Théos Sammelalbum</h3><div class="a-stand">' + anzahlSticker(a) + ' von ' + ALLE_STICKER.length + ' Stickern</div>';
  STICKER_SEITEN.forEach(function (seite) {
    html += '<div class="a-seite">' + seite.titel + '</div><div class="a-raster">';
    seite.sticker.forEach(function (x) {
      const hat = a.sticker[x[0]];
      html += '<div class="a-sticker ' + (hat ? (hat.gold ? "hat gold" : "hat") : "fehlt") + '"><b>' + x[0] + '</b>' + (hat ? x[1] : "?") + '</div>';
    });
    html += '</div>';
  });
  html += '<button class="a-zu" id="albumZu">Fertig</button>';
  const d = document.getElementById("album");
  d.innerHTML = html;
  document.getElementById("albumZu").onclick = function () { d.close(); };
  d.showModal();
  d.scrollTop = 0;
  if (document.activeElement) document.activeElement.blur();
}

function albumEinrichten() {
  const k = document.getElementById("albumKnopf");
  if (k) k.onclick = albumOeffnen;
  document.addEventListener("visibilitychange", function () { if (!document.hidden) albumAnzeigen(); });
  window.addEventListener("storage", function (e) { if (e.key === ALBUM_SPEICHER) albumAnzeigen(); });
  albumAnzeigen();
}

// ================= HANDSCHRIFT =================
// Jeder Buchstabe und jede Zahl ist als Folge von Strichen gezeichnet, so wie man sie von Hand schreibt.
// Koordinaten in einem Feld von 0 bis 100: Oberlinie 20, Mittellinie 50, Grundlinie 80.
// Bögen: Winkel in Grad, 0 = rechts, 90 = unten. Abnehmende Winkel = gegen den Uhrzeigersinn.
function bogen(cx, cy, rx, ry, von, bis) {
  const p = [], n = Math.max(2, Math.ceil(Math.abs(bis - von) / 6));
  for (let i = 0; i <= n; i++) {
    const t = (von + (bis - von) * i / n) * Math.PI / 180;
    p.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return p;
}
function strich() {
  const p = [];
  for (let i = 0; i < arguments.length; i++) {
    const t = arguments[i];
    if (typeof t[0] === "number") p.push(t); else t.forEach(function (q) { p.push(q); });
  }
  return p;
}
const GLYPHEN = {
  // Grossbuchstaben
  A: [strich([50,20],[28,80]), strich([50,20],[72,80]), strich([36,60],[64,60])],
  B: [strich([32,20],[32,80]), strich([32,20],[50,20],bogen(50,35,14,15,-90,90),[32,50]), strich([32,50],[52,50],bogen(52,65,16,15,-90,90),[32,80])],
  C: [strich(bogen(52,50,24,30,-40,-320))],
  D: [strich([32,20],[32,80]), strich([32,20],[42,20],bogen(42,50,26,30,-90,90),[32,80])],
  E: [strich([32,20],[32,80]), strich([32,20],[66,20]), strich([32,50],[60,50]), strich([32,80],[66,80])],
  F: [strich([32,20],[32,80]), strich([32,20],[66,20]), strich([32,50],[60,50])],
  G: [strich(bogen(52,50,24,30,-40,-355)), strich([60,55],[76,55])],
  H: [strich([32,20],[32,80]), strich([68,20],[68,80]), strich([32,50],[68,50])],
  I: [strich([50,20],[50,80])],
  J: [strich([60,20],[60,66],bogen(46,66,14,14,0,170))],
  K: [strich([34,20],[34,80]), strich([66,20],[35,52],[66,80])],
  L: [strich([34,20],[34,80],[66,80])],
  M: [strich([28,80],[28,20],[50,58],[72,20],[72,80])],
  N: [strich([32,80],[32,20],[68,80],[68,20])],
  O: [strich(bogen(50,50,24,30,-90,-450))],
  P: [strich([32,20],[32,80]), strich([32,20],[48,20],bogen(48,36,16,16,-90,90),[32,52])],
  Q: [strich(bogen(50,50,24,30,-90,-450)), strich([56,66],[74,86])],
  R: [strich([32,20],[32,80]), strich([32,20],[48,20],bogen(48,36,16,16,-90,90),[32,52]), strich([46,52],[68,80])],
  S: [strich(bogen(50,35,18,15,-25,-270), bogen(50,65,18,15,-90,155))],
  T: [strich([50,20],[50,80]), strich([28,20],[72,20])],
  U: [strich([32,20],[32,60],bogen(50,60,18,20,180,0),[68,20])],
  V: [strich([28,20],[50,80],[72,20])],
  W: [strich([22,20],[35,80],[50,38],[65,80],[78,20])],
  X: [strich([30,20],[70,80]), strich([70,20],[30,80])],
  Y: [strich([30,20],[50,50]), strich([70,20],[50,50],[50,80])],
  Z: [strich([30,20],[70,20],[30,80],[70,80])],
  // Kleinbuchstaben
  a: [strich(bogen(48,65,14,15,-20,-380),[62,50],[62,80])],
  b: [strich([36,20],[36,80]), strich(bogen(50,65,14,15,180,540))],
  c: [strich(bogen(52,65,14,15,-40,-320))],
  d: [strich(bogen(48,65,14,15,-20,-380)), strich([62,20],[62,80])],
  e: [strich([36,65],[64,65],bogen(50,65,14,15,0,-315))],
  f: [strich(bogen(56,30,9,9,-30,-180),[47,30],[47,80]), strich([36,50],[60,50])],
  g: [strich(bogen(48,65,14,15,-20,-380)), strich([62,50],[62,88],bogen(50,88,12,8,0,165))],
  h: [strich([36,20],[36,80]), strich([36,64],bogen(50,64,14,13,180,360),[64,80])],
  i: [strich([50,50],[50,80]), strich([50,37],[50,39])],
  j: [strich([54,50],[54,88],bogen(44,88,10,8,0,165)), strich([54,37],[54,39])],
  k: [strich([36,20],[36,80]), strich([62,50],[37,66],[62,80])],
  l: [strich([50,20],[50,74],bogen(56,74,6,6,180,60))],
  m: [strich([30,50],[30,80],[30,62],bogen(40,62,10,12,180,360),[50,80],[50,62],bogen(60,62,10,12,180,360),[70,80])],
  n: [strich([34,50],[34,80],[34,62],bogen(48,62,14,12,180,360),[62,80])],
  o: [strich(bogen(50,65,14,15,-90,-450))],
  p: [strich([36,50],[36,95]), strich(bogen(50,65,14,15,180,540))],
  q: [strich(bogen(48,65,14,15,-20,-380)), strich([62,50],[62,95])],
  r: [strich([38,50],[38,80],[38,62],bogen(50,62,12,10,180,300))],
  s: [strich(bogen(50,57.5,12,7.5,-25,-270), bogen(50,72.5,12,7.5,-90,155))],
  t: [strich([48,30],[48,74],bogen(54,74,6,6,180,60)), strich([38,50],[60,50])],
  u: [strich([36,50],[36,68],bogen(49,68,13,12,180,0),[62,50],[62,80])],
  v: [strich([34,50],[50,80],[66,50])],
  w: [strich([26,50],[38,80],[50,58],[62,80],[74,50])],
  x: [strich([36,50],[64,80]), strich([64,50],[36,80])],
  y: [strich([36,50],[50,80]), strich([64,50],[44,95])],
  z: [strich([36,50],[64,50],[36,80],[64,80])],
  // Zahlen, wie man sie in der Schule schreibt (die 1 ohne Fuss, die 7 mit Querstrich)
  "0": [strich(bogen(50,50,18,30,-90,-450))],
  "1": [strich([40,32],[56,20],[56,80])],
  "2": [strich(bogen(50,36,16,16,200,400),[32,80],[70,80])],
  "3": [strich(bogen(48,35,16,15,210,450), bogen(48,65,18,15,270,510))],
  "4": [strich([46,20],[32,58],[70,58]), strich([60,32],[60,80])],
  "5": [strich([38,20],[36,46],bogen(50,62,17,17,-150,150)), strich([38,20],[66,20])],
  "6": [strich([60,20],[50,30],[40,44],[35,60],bogen(50,65,15,14,180,-180))],
  "7": [strich([32,20],[68,20],[44,80]), strich([42,50],[62,50])],
  "8": [strich(bogen(50,35,14,15,-30,-270), bogen(50,65,17,15,-90,270), bogen(50,35,14,15,90,-30))],
  "9": [strich(bogen(50,36,16,16,-10,-370),[66,40],[62,80])]
};

// Zahl als handgeschriebenes Bild (SVG), z.B. für Knöpfe und Rechnungen
function pfad(punkte) { return "M" + punkte.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" L"); }
function zahlSvg(zahl, hoehe) {
  const ziffern = String(zahl).split("");
  const breite = 44 * (ziffern.length - 1) + 52;
  let inhalt = "";
  ziffern.forEach(function (z, i) {
    (GLYPHEN[z] || []).forEach(function (s) {
      inhalt += '<path transform="translate(' + (i * 44) + ' 0)" d="' + pfad(s) + '"/>';
    });
  });
  return '<svg class="handzahl" viewBox="24 12 ' + breite + ' 76" height="' + hoehe + '" width="' + Math.round(hoehe * breite / 76) +
         '" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" aria-label="' + zahl + '">' + inhalt + '</svg>';
}

// ================= NACHFAHREN =================
// Die Vorlage zeigt mit grünen Punkten, wo jeder Strich beginnt, und mit Pfeilen die Richtung.
// "Zeigen" macht das Schreiben langsam vor. Richtig ist es erst, wenn JEDER Strich ganz nachgefahren ist.
function Nachfahren(box, zeichen, beiErfolg, beiHinweis) {
  box.innerHTML = "";
  const striche = GLYPHEN[zeichen] || [];
  const groesse = box.clientWidth;
  const dpr = window.devicePixelRatio || 1;
  function neueLeinwand(sichtbar) {
    const c = document.createElement("canvas");
    if (sichtbar) {
      c.width = groesse * dpr; c.height = groesse * dpr;
      box.appendChild(c);
      c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    } else { c.width = groesse; c.height = groesse; }
    return c;
  }
  const leinwand = neueLeinwand(true), ctx = leinwand.getContext("2d");
  const vormachen = neueLeinwand(true); vormachen.className = "vormachen";
  const vctx = vormachen.getContext("2d");
  const tinte = neueLeinwand(false), ti = tinte.getContext("2d");
  const nah = neueLeinwand(false), nctx = nah.getContext("2d");

  const k = groesse / 100;
  const stiftBreite = groesse * 0.1;
  function zeichneStriche(c, breite, farbe, liste) {
    c.strokeStyle = farbe; c.lineWidth = breite; c.lineCap = "round"; c.lineJoin = "round";
    (liste || striche).forEach(function (s) {
      c.beginPath(); c.moveTo(s[0][0] * k, s[0][1] * k);
      for (let i = 1; i < s.length; i++) c.lineTo(s[i][0] * k, s[i][1] * k);
      if (s.length === 2 && Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) < 3) c.lineTo(s[0][0] * k + 0.1, s[0][1] * k);
      c.stroke();
    });
  }
  zeichneStriche(nctx, groesse * 0.24, "#000");
  const datenNah = nctx.getImageData(0, 0, groesse, groesse).data;

  // Prüfpunkte entlang jedes Strichs (alle 2 Einheiten)
  const pruefpunkte = striche.map(function (s) {
    const p = [s[0]];
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1], b = s[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(d / 2));
      for (let j = 1; j <= n; j++) p.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    }
    return p;
  });

  function pfeil(c, s, nummer, zeigeNummer) {
    const a = s[0];
    let b = s[s.length - 1];
    for (let i = 1; i < s.length; i++) { if (Math.hypot(s[i][0] - a[0], s[i][1] - a[1]) > 9) { b = s[i]; break; } }
    const w = Math.atan2(b[1] - a[1], b[0] - a[0]);
    // Pfeil ein Stück hinter dem Startpunkt
    const px = (a[0] + Math.cos(w) * 9) * k, py = (a[1] + Math.sin(w) * 9) * k, l = groesse * 0.035;
    c.fillStyle = "#2a9d8f";
    c.beginPath();
    c.moveTo(px + Math.cos(w) * l, py + Math.sin(w) * l);
    c.lineTo(px + Math.cos(w + 2.5) * l, py + Math.sin(w + 2.5) * l);
    c.lineTo(px + Math.cos(w - 2.5) * l, py + Math.sin(w - 2.5) * l);
    c.closePath(); c.fill();
    // Startpunkt
    c.fillStyle = "#06d6a0";
    c.beginPath(); c.arc(a[0] * k, a[1] * k, groesse * 0.038, 0, Math.PI * 2); c.fill();
    if (zeigeNummer) {
      c.fillStyle = "white"; c.font = "bold " + Math.round(groesse * 0.045) + "px Arial"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(String(nummer), a[0] * k, a[1] * k + 1);
    }
  }

  function hintergrund() {
    ctx.clearRect(0, 0, groesse, groesse);
    ctx.strokeStyle = "#e3eef7"; ctx.lineWidth = 2;
    [20, 50, 80].forEach(function (y) { ctx.beginPath(); ctx.moveTo(14, y * k); ctx.lineTo(groesse - 14, y * k); ctx.stroke(); });
    zeichneStriche(ctx, groesse * 0.11, "#e6ddd0");
    ctx.setLineDash([2, 7]); zeichneStriche(ctx, 2.5, "#b9ab96"); ctx.setLineDash([]);
    striche.forEach(function (s, i) { pfeil(ctx, s, i + 1, striche.length > 1); });
  }

  let fertig = false, zeichnet = false, letzter = null, animation = null;

  function linie(von, bis) {
    [ctx, ti].forEach(function (c) {
      c.strokeStyle = c === ctx ? "rgba(255,138,0,.85)" : "#000";
      c.lineWidth = stiftBreite; c.lineCap = "round"; c.lineJoin = "round";
      c.beginPath(); c.moveTo(von.x, von.y); c.lineTo(bis.x, bis.y); c.stroke();
    });
  }
  function punkt(e) { const r = leinwand.getBoundingClientRect(); return { x: (e.clientX - r.left) * groesse / r.width, y: (e.clientY - r.top) * groesse / r.height }; }

  leinwand.onpointerdown = function (e) {
    if (fertig) return;
    e.preventDefault();
    stopVormachen();
    zeichnet = true; letzter = punkt(e);
    linie(letzter, { x: letzter.x + 0.1, y: letzter.y });
    try { leinwand.setPointerCapture(e.pointerId); } catch (f) {}
  };
  leinwand.onpointermove = function (e) {
    if (!zeichnet || fertig) return;
    e.preventDefault();
    const p = punkt(e); linie(letzter, p); letzter = p;
  };
  leinwand.onpointerup = leinwand.onpointercancel = function () {
    if (!zeichnet) return;
    zeichnet = false;
    pruefen();
  };

  function pruefen() {
    const t = ti.getImageData(0, 0, groesse, groesse).data;
    function hatTinte(x, y) {
      const r = groesse * 0.035;
      const proben = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]];
      for (let i = 0; i < proben.length; i++) {
        const px = Math.round(x * k + proben[i][0]), py = Math.round(y * k + proben[i][1]);
        if (px >= 0 && py >= 0 && px < groesse && py < groesse && t[(py * groesse + px) * 4 + 3] > 100) return true;
      }
      return false;
    }
    // 1. Jeder Strich muss fast vollständig nachgefahren sein
    const abdeckung = pruefpunkte.map(function (pp) {
      let ja = 0; pp.forEach(function (p) { if (hatTinte(p[0], p[1])) ja++; });
      return ja / pp.length;
    });
    const alleStriche = abdeckung.every(function (a) { return a >= 0.85; });
    // 2. Théo soll nicht wild über das ganze Feld malen
    let gemalt = 0, gemaltNah = 0;
    for (let i = 3; i < t.length; i += 4 * 3) { if (t[i] > 100) { gemalt++; if (datenNah[i] > 100) gemaltNah++; } }
    const genauigkeit = gemalt ? gemaltNah / gemalt : 0;
    if (alleStriche && genauigkeit >= 0.6) {
      fertig = true;
      beiErfolg();
    } else if (genauigkeit < 0.5 && gemalt > 400) {
      beiHinweis("Das stimmt noch nicht. Fahr genau auf der grauen Linie.");
    }
  }

  // Langsam vormachen: ein blauer Stift fährt die Striche nach
  function stopVormachen() {
    if (animation) cancelAnimationFrame(animation);
    animation = null;
    vctx.clearRect(0, 0, groesse, groesse);
  }
  function zeigen() {
    stopVormachen();
    const tempo = 55;           // Einheiten pro Sekunde
    const laengen = striche.map(function (s) { let l = 0; for (let i = 1; i < s.length; i++) l += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return Math.max(l, 2); });
    const pause = 0.45;
    let start = null;
    function bild(zeit) {
      if (start === null) start = zeit;
      let t = (zeit - start) / 1000;
      vctx.clearRect(0, 0, groesse, groesse);
      vctx.strokeStyle = "#219ebc"; vctx.lineWidth = groesse * 0.05; vctx.lineCap = "round"; vctx.lineJoin = "round";
      let stift = null;
      for (let n = 0; n < striche.length; n++) {
        const dauer = laengen[n] / tempo;
        const s = striche[n];
        const anteil = Math.max(0, Math.min(1, t / dauer));
        let rest = anteil * laengen[n];
        vctx.beginPath(); vctx.moveTo(s[0][0] * k, s[0][1] * k);
        stift = s[0];
        for (let i = 1; i < s.length && rest > 0; i++) {
          const d = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
          const f = Math.min(1, rest / d);
          stift = [s[i - 1][0] + (s[i][0] - s[i - 1][0]) * f, s[i - 1][1] + (s[i][1] - s[i - 1][1]) * f];
          vctx.lineTo(stift[0] * k, stift[1] * k);
          rest -= d;
        }
        vctx.stroke();
        if (t < dauer) break;
        t -= dauer + pause;
        if (t < 0) break;
      }
      if (stift) { vctx.fillStyle = "#ff8a00"; vctx.beginPath(); vctx.arc(stift[0] * k, stift[1] * k, groesse * 0.03, 0, Math.PI * 2); vctx.fill(); }
      const gesamt = laengen.reduce(function (a, l) { return a + l / tempo + pause; }, 0);
      if ((zeit - start) / 1000 < gesamt + 0.8) animation = requestAnimationFrame(bild);
      else { animation = null; vctx.clearRect(0, 0, groesse, groesse); }
    }
    animation = requestAnimationFrame(bild);
  }

  hintergrund();
  return {
    leeren: function () { ti.clearRect(0, 0, groesse, groesse); fertig = false; hintergrund(); },
    zeigen: zeigen
  };
}
