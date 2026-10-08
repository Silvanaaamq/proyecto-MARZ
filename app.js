// usuarios basicos (solo usuario + clave) con estado Activo
var USERS = [
  { u: "solicitante", p: "1234", rol: "Solicitante", activo: true },
  { u: "agente", p: "1234", rol: "Agente", activo: true },
  { u: "agente2", p: "1234", rol: "Agente", activo: true },
  { u: "agente_off", p: "1234", rol: "Agente", activo: false },
  { u: "coordinador", p: "1234", rol: "Coordinador", activo: true },
  { u: "auditor", p: "1234", rol: "Auditor", activo: true }
];
// flujo permitido de estados (HU07)
var TRANS = {
  "Nuevo": ["En Revisión"],
  "En Revisión": ["En Atención"],
  "En Atención": ["Resuelto"],
  "Resuelto": ["Cerrado", "En Atención"],
  "Cerrado": []
};
var ses = null;
var SOLS = JSON.parse(localStorage.getItem("sols") || "[]");
var NOTIFS = JSON.parse(localStorage.getItem("notifs") || "[]");
var AUDIT = JSON.parse(localStorage.getItem("audit") || "[]");

function save() { localStorage.setItem("sols", JSON.stringify(SOLS)); }
function saveNotifs() { localStorage.setItem("notifs", JSON.stringify(NOTIFS)); }
function saveAudit() { localStorage.setItem("audit", JSON.stringify(AUDIT)); }
function fecha() { return new Date().toLocaleString(); }
function agentesActivos() { return USERS.filter(x => x.rol === "Agente" && x.activo); }
// HU11: actor codificado (letra rol + numero, sin datos personales)
function codActor(u) {
  var i = USERS.findIndex(x => x.u === u);
  if (i < 0) return "?-00";
  return USERS[i].rol.charAt(0) + "-" + String(i + 1).padStart(2, "0");
}
// HU10/HU11: evento estructurado fecha + actor + campo + anterior/nuevo
function auditar(sol, campo, ant, nue) {
  AUDIT.push({ sol: sol, fecha: new Date().toISOString(), actor: ses ? codActor(ses.u) : "?-00", campo: campo, ant: String(ant), nue: String(nue) });
  saveAudit();
}
// HU09: filtro combinado texto + estado + prioridad + categoria
function filtra(arr, q, est, prio, cat) {
  q = (q || "").toLowerCase();
  return arr.filter(s => (!q || s.titulo.toLowerCase().indexOf(q) >= 0 || s.desc.toLowerCase().indexOf(q) >= 0) &&
    (!est || s.estado === est) && (!prio || s.prio === prio) && (!cat || s.cat === cat));
}

// entrar, avisos tranquilos en pagina (sin validacion del navegador)
function entrar() {
  var u = document.getElementById("user").value.trim();
  var p = document.getElementById("pass").value;
  document.getElementById("e-user").innerText = u ? "" : "escribe tu usuario";
  document.getElementById("e-pass").innerText = p ? "" : "escribe tu clave";
  document.getElementById("msg").innerText = "";
  if (!u || !p) { document.getElementById("msg").innerText = "te faltan campos por completar"; return; }
  var f = USERS.find(x => x.u === u && x.p === p);
  if (!f) { document.getElementById("msg").innerText = "datos incorrectos"; return; }
  if (!f.activo) { document.getElementById("msg").innerText = "usuario inactivo"; return; }
  ses = { u: f.u, rol: f.rol };
  document.getElementById("login").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("who").innerText = ses.u;
  document.getElementById("rol").innerText = ses.rol;
  mostrar();
}
function salir() { ses = null; location.reload(); }

function mostrar() {
  document.getElementById("v-sol").style.display = ses.rol === "Solicitante" ? "block" : "none";
  document.getElementById("v-coor").style.display = ses.rol === "Coordinador" ? "block" : "none";
  document.getElementById("v-age").style.display = ses.rol === "Agente" ? "block" : "none";
  document.getElementById("v-audi").style.display = ses.rol === "Auditor" ? "block" : "none";
  // notificacion en la app (HU05): el agente ve sus avisos al entrar
  var misN = NOTIFS.filter(n => n.para === ses.u);
  document.getElementById("aviso").innerText = misN.length ? ("Avisos: " + misN.map(n => n.texto).join(" | ")) : "";
  if (ses.rol === "Solicitante") verMias();
  if (ses.rol === "Coordinador") verTodas();
  if (ses.rol === "Agente") verAsignadas();
  if (ses.rol === "Auditor") verHistorial();
}

// solo solicitante, todo obligatorio
function crear() {
  if (!ses || ses.rol !== "Solicitante") return;
  var t = document.getElementById("t").value.trim();
  var d = document.getElementById("d").value.trim();
  var c = document.getElementById("c").value.trim();
  document.getElementById("e-t").innerText = t ? "" : "este campo es obligatorio";
  document.getElementById("e-d").innerText = d ? "" : "este campo es obligatorio";
  document.getElementById("e-c").innerText = c ? "" : "elige una categoría";
  if (!t || !d || !c) { document.getElementById("msg2").innerText = "revisa los campos marcados"; return; }
  document.getElementById("msg2").innerText = "";
  var id = SOLS.length ? Math.max.apply(null, SOLS.map(s => s.id)) + 1 : 1;
  var f = fecha();
  SOLS.push({ id: id, titulo: t, desc: d, cat: c, fecha: f, estado: "Nuevo", dueno: ses.u, prio: "Media", asig: "", hist: ["creada " + f + " por " + ses.u], coments: [], creadaTs: Date.now(), cerradaTs: 0 });
  auditar(id, "creación", "-", "Nuevo");
  save();
  document.getElementById("msg2").innerText = "creada ID " + id;
  document.getElementById("t").value = ""; document.getElementById("d").value = ""; document.getElementById("c").value = "";
  verMias();
}

// HU09: solo las propias + busqueda y filtros; HU08 aceptar/reabrir
function verMias() {
  var ul = document.getElementById("mis");
  ul.innerHTML = "";
  var lista = filtra(SOLS.filter(s => s.dueno === ses.u),
    document.getElementById("q").value, document.getElementById("fs-est").value,
    document.getElementById("fs-prio").value, document.getElementById("fs-cat").value);
  lista.forEach(s => {
    if (!s.coments) s.coments = [];
    var li = document.createElement("li");
    li.innerHTML = s.id + " " + s.titulo + " | " + s.estado + " | " + s.fecha + " | prioridad " + s.prio + "<br>" +
      "<small>" + s.desc + " | " + s.cat + " | asig: " + (s.asig || "-") + "</small><br>" +
      "<small>comentarios: " + (s.coments.length ? s.coments.map(c => c.autor + " " + c.fecha + ": " + c.texto).join(" | ") : "-") + "</small><br>";
    // detalle en pagina (sin ventana del navegador)
    var det = document.createElement("div");
    det.style.display = "none";
    det.innerHTML = "<small>ID " + s.id + " | " + s.titulo + " | " + s.desc + " | " + s.cat + " | " + s.estado + " | " + s.fecha + "<br>historial: " + s.hist.join(" | ") + "</small>";
    var b0 = document.createElement("button");
    b0.innerText = "ver";
    b0.onclick = function () { det.style.display = det.style.display === "none" ? "block" : "none"; };
    li.appendChild(b0);
    li.appendChild(det);
    var msgS = document.createElement("small");
    msgS.className = "campo-msg";
    li.appendChild(msgS);
    // HU08: solo si esta Resuelta, aceptar o reabrir con motivo (todo en pagina)
    if (s.estado === "Resuelto") {
      var b1 = document.createElement("button");
      b1.innerText = "aceptar";
      b1.onclick = function () { aceptarSol(s.id, msgS); };
      var inpM = document.createElement("input");
      inpM.placeholder = "motivo para reabrir...";
      var b2 = document.createElement("button");
      b2.innerText = "reabrir";
      b2.onclick = function () { reabrirSol(s.id, inpM.value, msgS); };
      li.appendChild(b1); li.appendChild(inpM); li.appendChild(b2);
    }
    ul.appendChild(li);
  });
}

// HU08: aceptar Resuelta -> Cerrado
function aceptarSol(id, el) {
  if (!ses || ses.rol !== "Solicitante") return;
  var s = SOLS.find(x => x.id === id);
  if (!s || s.dueno !== ses.u) return;
  if (s.estado !== "Resuelto") { if (el) el.innerText = "solo se puede aceptar una Resuelta"; return; }
  s.estado = "Cerrado"; s.fecha = fecha(); s.cerradaTs = Date.now();
  s.hist.push("aceptada (Cerrado) " + s.fecha + " por " + ses.u);
  auditar(id, "confirmación", "Resuelto", "Cerrado");
  save(); verMias();
}

// HU08: reabrir con motivo -> En Atencion
function reabrirSol(id, motivo, el) {
  if (!ses || ses.rol !== "Solicitante") return;
  var s = SOLS.find(x => x.id === id);
  if (!s || s.dueno !== ses.u) return;
  if (s.estado !== "Resuelto") { if (el) el.innerText = "solo se puede reabrir una Resuelta"; return; }
  motivo = (motivo || "").trim();
  if (!motivo) { if (el) el.innerText = "escribe el motivo para reabrir"; return; }
  s.estado = "En Atención"; s.fecha = fecha(); s.cerradaTs = 0;
  s.hist.push("reabierta a En Atención " + s.fecha + " por " + ses.u + " motivo: " + motivo);
  auditar(id, "reapertura", "Resuelto", "En Atención motivo: " + motivo);
  save(); verMias();
}

// HU09: base coordinador con permisos (todo) + filtros + orden
function baseCoordinador() {
  var ordenEl = document.getElementById("orden");
  var orden = ordenEl ? ordenEl.value : "prioridad";
  var arr = filtra(SOLS,
    document.getElementById("tq").value, document.getElementById("tc-est").value,
    document.getElementById("tc-prio").value, document.getElementById("tc-cat").value);
  if (orden === "prioridad") { var o = { Alta: 0, Media: 1, Baja: 2 }; arr.sort((a, b) => o[a.prio] - o[b.prio]); }
  if (orden === "estado") arr.sort((a, b) => a.estado.localeCompare(b.estado));
  if (orden === "fecha") arr.sort((a, b) => b.id - a.id);
  return arr;
}

// HU05 + HU04: coordinador prioriza y asigna a agente activo
function verTodas() {
  var arr = baseCoordinador();
  var ul = document.getElementById("todas");
  ul.innerHTML = "";
  arr.forEach(s => {
    if (!s.coments) s.coments = [];
    var li = document.createElement("li");
    li.innerHTML = s.id + " " + s.titulo + " | prioridad " + s.prio + " | " + s.estado + " | " + s.fecha + " | " + s.dueno + " | asig: " + (s.asig || "-") + "<br>" +
      "<small>" + s.desc + " | " + s.cat + "</small><br>" +
      "<small>comentarios: " + (s.coments.length ? s.coments.map(c => c.autor + " " + c.fecha + ": " + c.texto).join(" | ") : "-") + "</small><br>";
    var sp = document.createElement("select");
    ["Alta", "Media", "Baja"].forEach(p => {
      var op = document.createElement("option"); op.value = p; op.text = p;
      if (s.prio === p) op.selected = true;
      sp.appendChild(op);
    });
    var se = document.createElement("select");
    ["Nuevo", "En Revisión", "En Atención", "Resuelto", "Cerrado"].forEach(e => {
      var op = document.createElement("option"); op.value = e; op.text = e;
      if (s.estado === e) op.selected = true;
      se.appendChild(op);
    });
    // HU05: desplegable solo con agentes activos
    var sa = document.createElement("select");
    var op0 = document.createElement("option"); op0.value = ""; op0.text = "sin asignar";
    sa.appendChild(op0);
    agentesActivos().forEach(a => {
      var op = document.createElement("option"); op.value = a.u; op.text = a.u;
      if (s.asig === a.u) op.selected = true;
      sa.appendChild(op);
    });
    var b = document.createElement("button");
    b.innerText = "guardar";
    b.onclick = function () { asignar(s.id, sp.value, se.value, sa.value); };
    li.appendChild(sp); li.appendChild(se); li.appendChild(sa); li.appendChild(b);
    ul.appendChild(li);
  });
  verIndicadores(arr);
}

// HU10: volumen por estado + mediana de ciclo + eventos, sin ranking individual
function verIndicadores(lista) {
  var box = document.getElementById("indic");
  if (!box) return;
  var porEstado = {};
  lista.forEach(s => { porEstado[s.estado] = (porEstado[s.estado] || 0) + 1; });
  var ciclos = lista.filter(s => s.cerradaTs && s.creadaTs).map(s => s.cerradaTs - s.creadaTs).sort((a, b) => a - b);
  var med = ciclos.length ? (ciclos.length % 2 ? ciclos[(ciclos.length - 1) / 2] : (ciclos[ciclos.length / 2 - 1] + ciclos[ciclos.length / 2]) / 2) : 0;
  var ids = {};
  lista.forEach(s => { ids[s.id] = true; });
  var ev = {};
  AUDIT.filter(a => ids[a.sol]).forEach(a => { ev[a.campo] = (ev[a.campo] || 0) + 1; });
  var f = "texto=" + (document.getElementById("tq").value || "-") + " estado=" + (document.getElementById("tc-est").value || "-") +
    " prioridad=" + (document.getElementById("tc-prio").value || "-") + " categoria=" + (document.getElementById("tc-cat").value || "-");
  box.innerHTML = "Total: " + lista.length + "<br>" +
    "Por estado: " + Object.keys(porEstado).map(k => k + "=" + porEstado[k]).join(", ") + "<br>" +
    "Mediana de ciclo (creación a cierre): " + fmtDur(med) + "<br>" +
    "Eventos: " + (Object.keys(ev).length ? Object.keys(ev).map(k => k + "=" + ev[k]).join(", ") : "-") + "<br>" +
    "<small>Filtros: " + f + "</small>";
}
function fmtDur(ms) {
  if (!ms) return "-";
  var min = Math.round(ms / 60000);
  if (min < 60) return min + " min";
  var h = Math.floor(min / 60);
  if (h < 48) return h + " h";
  return Math.round(h / 24) + " d";
}

// HU05: valida agente activo, registra quien/cuando, notifica en app
function asignar(id, prio, estado, agente) {
  if (!ses || ses.rol !== "Coordinador") return;
  var s = SOLS.find(x => x.id === id);
  if (!s) return;
  if (prio !== "Alta" && prio !== "Media" && prio !== "Baja") { document.getElementById("msg-coor").innerText = "prioridad invalida"; return; }
  if (agente) {
    var ag = USERS.find(x => x.u === agente && x.rol === "Agente" && x.activo);
    if (!ag) { document.getElementById("msg-coor").innerText = "asignacion invalida: agente no activo"; return; }
  }
  var antP = s.prio, antE = s.estado;
  s.prio = prio; s.estado = estado;
  var f = fecha();
  s.fecha = f;
  s.hist.push("prioridad a " + prio + ", estado a " + estado + " " + f + " por " + ses.u);
  if (antP !== prio) auditar(id, "prioridad", antP, prio);
  if (antE !== estado) auditar(id, "estado", antE, estado);
  if (agente && agente !== s.asig) {
    var antA = s.asig || "-";
    s.asig = agente;
    s.hist.push("asignada a " + agente + " " + f + " por " + ses.u);
    auditar(id, "asignación", antA, agente);
    NOTIFS.push({ para: agente, texto: "Se te asignó solicitud " + s.id + " " + s.titulo, fecha: f });
    saveNotifs();
    document.getElementById("msg-coor").innerText = "asignada a " + agente + " y notificada";
  } else {
    if (!agente) s.asig = "";
    document.getElementById("msg-coor").innerText = "guardado ID " + s.id;
  }
  save(); verTodas();
}

// HU12: CSV con filtros, sin credenciales ni texto innecesario, registra exportacion
function exportarCSV() {
  if (!ses || ses.rol !== "Coordinador") return;
  var lista = baseCoordinador();
  var rows = [["id", "titulo", "categoria", "estado", "prioridad", "asignado", "actualizacion"]];
  lista.forEach(s => { rows.push([s.id, s.titulo, s.cat, s.estado, s.prio, s.asig || "-", s.fecha]); });
  var csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
  var blob = new Blob([csv], { type: "text/csv" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "reporte.csv";
  a.click();
  var fdesc = "texto=" + (document.getElementById("tq").value || "-") + " estado=" + (document.getElementById("tc-est").value || "-") +
    " prioridad=" + (document.getElementById("tc-prio").value || "-") + " categoria=" + (document.getElementById("tc-cat").value || "-");
  AUDIT.push({ sol: 0, fecha: new Date().toISOString(), actor: codActor(ses.u), campo: "exportación", ant: fdesc, nue: lista.length + " filas" });
  saveAudit();
  document.getElementById("msg-coor").innerText = "exportado " + lista.length + " filas (registrado)";
}

// Agente: ver asignadas + filtros HU09 + comentarios (HU06) + cambio estado (HU07)
function verAsignadas() {
  var ul = document.getElementById("asig");
  ul.innerHTML = "";
  var mias = filtra(SOLS.filter(s => s.asig === ses.u),
    document.getElementById("aq").value, document.getElementById("af-est").value,
    document.getElementById("af-prio").value, document.getElementById("af-cat").value);
  if (!mias.length) ul.innerHTML = "<li>Sin asignadas.</li>";
  mias.forEach(s => {
    if (!s.coments) s.coments = [];
    var li = document.createElement("li");
    li.innerHTML = "<b>" + s.id + " " + s.titulo + "</b> | " + s.estado + " | prioridad " + s.prio + "<br>" +
      "<small>" + s.desc + " | " + s.cat + "</small><br>" +
      "<small>comentarios: " + (s.coments.length ? s.coments.map(c => c.autor + " " + c.fecha + ": " + c.texto).join(" | ") : "-") + "</small><br>";
    // HU06: comentario no vacio (aviso tranquilo en pagina)
    var inp = document.createElement("input");
    inp.placeholder = "comentario de avance...";
    inp.removeAttribute("required");
    var msgC = document.createElement("small");
    msgC.className = "campo-msg";
    var bc = document.createElement("button");
    bc.innerText = "comentar";
    bc.onclick = function () { comentar(s.id, inp.value, msgC); };
    // HU07: desplegable solo con transiciones permitidas
    var se = document.createElement("select");
    var permitidos = TRANS[s.estado] || [];
    var op0 = document.createElement("option"); op0.value = s.estado; op0.text = s.estado + " (actual)";
    se.appendChild(op0);
    permitidos.forEach(e => {
      var op = document.createElement("option"); op.value = e; op.text = e;
      se.appendChild(op);
    });
    var msgE = document.createElement("small");
    msgE.className = "campo-msg";
    var be = document.createElement("button");
    be.innerText = "cambiar estado";
    be.onclick = function () { cambiarEstadoAgente(s.id, se.value, msgE); };
    li.appendChild(inp); li.appendChild(bc); li.appendChild(msgC); li.appendChild(document.createElement("br"));
    li.appendChild(se); li.appendChild(be); li.appendChild(msgE);
    ul.appendChild(li);
  });
}

// HU06: autor y fecha inmutables, no editable (no hay editar/borrar)
function comentar(id, texto, el) {
  if (!ses || ses.rol !== "Agente") return;
  var s = SOLS.find(x => x.id === id);
  if (!s || s.asig !== ses.u) return;
  texto = (texto || "").trim();
  if (!texto) { if (el) el.innerText = "escribe un comentario"; return; }
  if (el) el.innerText = "";
  if (!s.coments) s.coments = [];
  s.coments.push({ autor: ses.u, fecha: fecha(), texto: texto });
  s.fecha = fecha();
  s.hist.push("comentario por " + ses.u + " " + s.fecha);
  auditar(id, "comentario", "-", texto.slice(0, 60));
  save(); verAsignadas();
}

// HU07: solo transiciones permitidas, rechaza invalidas (aviso en pagina)
function cambiarEstadoAgente(id, nuevo, el) {
  if (!ses || ses.rol !== "Agente") return;
  var s = SOLS.find(x => x.id === id);
  if (!s || s.asig !== ses.u) return;
  if (nuevo === s.estado) return;
  var ok = (TRANS[s.estado] || []).indexOf(nuevo) >= 0;
  if (!ok) { if (el) el.innerText = "transicion invalida de " + s.estado + " a " + nuevo; return; }
  if (el) el.innerText = "";
  var ant = s.estado;
  s.estado = nuevo; s.fecha = fecha();
  s.hist.push("estado " + ant + " a " + nuevo + " " + s.fecha + " por " + ses.u);
  auditar(id, "estado", ant, nuevo);
  save(); verAsignadas();
}

// HU09 + HU11: auditor solo lectura con filtros + actor codificado + campo + anterior/nuevo
function verHistorial() {
  var ul = document.getElementById("hist");
  ul.innerHTML = "";
  var lista = filtra(SOLS,
    document.getElementById("hq").value, document.getElementById("hf-est").value,
    document.getElementById("hf-prio").value, document.getElementById("hf-cat").value);
  var ids = {};
  lista.forEach(s => { ids[s.id] = s; });
  var evs = AUDIT.filter(a => a.sol !== 0 && ids[a.sol]);
  evs.sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (!evs.length) ul.innerHTML = "<li>Sin eventos.</li>";
  evs.forEach(a => {
    var li = document.createElement("li");
    li.innerText = "sol " + a.sol + " | " + a.fecha + " | actor " + a.actor + " | " + a.campo + " | " + a.ant + " -> " + a.nue;
    ul.appendChild(li);
  });
}
