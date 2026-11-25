// ================= GEMEINSAME TEILE für Théos Apps =================
// Name, Foto, Vorlesen, Töne, Sammelalbum und das Nachfahren.
// Alles wird im Browser gespeichert. Die Namen der Speicher beginnen mit "theo-",
// damit sie sich NICHT mit Rémis Apps vermischen (gleiche GitHub-Adresse!).

const NAME = "Théo";
const FOTO_SPEICHER = "theo-foto";
const ALBUM_SPEICHER = "theo-sammelalbum";
const STICKER_ALLE = 5;          // alle 5 richtigen Antworten ein Sticker
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
function stimmeWaehlen() {
  if (!window.speechSynthesis) return;
  const v = speechSynthesis.getVoices();
  stimme = v.find(function (x) { return x.lang === "de-CH"; }) ||
           v.find(function (x) { return x.lang === "de-DE" && /anna/i.test(x.name); }) ||
           v.find(function (x) { return /^de/.test(x.lang); }) || null;
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
  u.rate = 0.85;                 // etwas langsamer für Théo
  u.pitch = 1.05;
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
const NOCHMAL = ["Fast! Probier es nochmal.", "Versuch es nochmal.", "Schau nochmal genau."];

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
  setTimeout(function () { sprich((s.gold ? "Ein goldener Sticker! " : "Ein neuer Sticker! ") + s.name + "!"); }, 500);
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
  sprich("Dein Sammelalbum. Du hast " + anzahlSticker(a) + " Sticker.");
}

function albumEinrichten() {
  const k = document.getElementById("albumKnopf");
  if (k) k.onclick = albumOeffnen;
  document.addEventListener("visibilitychange", function () { if (!document.hidden) albumAnzeigen(); });
  window.addEventListener("storage", function (e) { if (e.key === ALBUM_SPEICHER) albumAnzeigen(); });
  albumAnzeigen();
}

// ================= NACHFAHREN =================
// Ein Buchstabe oder eine Zahl wird hell angezeigt. Théo fährt ihn mit dem Finger oder Stift nach.
// Die App prüft, ob er den Buchstaben genug abgedeckt hat und dabei auf dem Buchstaben geblieben ist.
function Nachfahren(leinwand, zeichen, beiErfolg, beiHinweis) {
  const groesse = leinwand.clientWidth;
  const dpr = window.devicePixelRatio || 1;
  leinwand.width = groesse * dpr; leinwand.height = groesse * dpr;
  const ctx = leinwand.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const stiftBreite = groesse * 0.11;
  const schriftPx = groesse * 0.74;
  const schrift = "700 " + schriftPx + "px Andika, 'Trebuchet MS', Arial, sans-serif";

  function glyphe(c, art) {
    c.font = schrift; c.textAlign = "center"; c.textBaseline = "alphabetic";
    const m = c.measureText(zeichen);
    const hoch = m.actualBoundingBoxAscent || schriftPx * 0.7, tief = m.actualBoundingBoxDescent || 0;
    const y = groesse / 2 + (hoch - tief) / 2;
    if (art === "fuellen") c.fillText(zeichen, groesse / 2, y);
    else { c.lineJoin = "round"; c.lineWidth = groesse * 0.09; c.strokeText(zeichen, groesse / 2, y); c.fillText(zeichen, groesse / 2, y); }
  }
  function neueMaske() { const c = document.createElement("canvas"); c.width = groesse; c.height = groesse; return c; }

  // Masken für die Prüfung (in einfacher Auflösung)
  const maskeGenau = neueMaske(), maskeNah = neueMaske(), tinte = neueMaske();
  const mg = maskeGenau.getContext("2d"); mg.fillStyle = "#000"; glyphe(mg, "fuellen");
  const mn = maskeNah.getContext("2d"); mn.fillStyle = "#000"; mn.strokeStyle = "#000"; glyphe(mn, "dick");
  const ti = tinte.getContext("2d");
  const datenGenau = mg.getImageData(0, 0, groesse, groesse).data;
  const datenNah = mn.getImageData(0, 0, groesse, groesse).data;

  let fertig = false, zeichnet = false, letzter = null;

  function hintergrund() {
    ctx.clearRect(0, 0, groesse, groesse);
    // Hilfslinien wie im Schulheft
    ctx.strokeStyle = "#e3eef7"; ctx.lineWidth = 2;
    [0.2, 0.5, 0.8].forEach(function (f) { ctx.beginPath(); ctx.moveTo(14, groesse * f); ctx.lineTo(groesse - 14, groesse * f); ctx.stroke(); });
    ctx.fillStyle = "#dcd3c6"; glyphe(ctx, "fuellen");
  }
  function linie(von, bis) {
    [ctx, ti].forEach(function (c) {
      c.strokeStyle = c === ctx ? "#ff8a00" : "#000";
      c.lineWidth = stiftBreite; c.lineCap = "round"; c.lineJoin = "round";
      c.beginPath(); c.moveTo(von.x, von.y); c.lineTo(bis.x, bis.y); c.stroke();
    });
  }
  function punkt(e) { const r = leinwand.getBoundingClientRect(); return { x: (e.clientX - r.left) * groesse / r.width, y: (e.clientY - r.top) * groesse / r.height }; }

  leinwand.onpointerdown = function (e) {
    if (fertig) return;
    e.preventDefault();
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
    let buchstabe = 0, bedeckt = 0, gemalt = 0, gemaltNah = 0;
    for (let i = 3; i < t.length; i += 4 * 3) {       // jedes dritte Pixel reicht
      const istB = datenGenau[i] > 100, istT = t[i] > 100;
      if (istB) { buchstabe++; if (istT) bedeckt++; }
      if (istT) { gemalt++; if (datenNah[i] > 100) gemaltNah++; }
    }
    const abdeckung = buchstabe ? bedeckt / buchstabe : 0;
    const genauigkeit = gemalt ? gemaltNah / gemalt : 0;
    if ((abdeckung >= 0.68 && genauigkeit >= 0.7) || (abdeckung >= 0.82 && genauigkeit >= 0.6)) {
      fertig = true;
      beiErfolg();
    } else if (gemalt > buchstabe * 0.6 && genauigkeit < 0.6) {
      beiHinweis("Bleib schön auf dem Buchstaben. Probier es nochmal.");
    }
  }

  hintergrund();
  return {
    leeren: function () { ti.clearRect(0, 0, groesse, groesse); fertig = false; hintergrund(); }
  };
}

// Schrift laden, bevor gezeichnet wird (sonst stimmt die Form nicht)
function schriftBereit() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.race([
    document.fonts.load("700 100px Andika"),
    new Promise(function (r) { setTimeout(r, 2500); })
  ]).catch(function () {});
}
