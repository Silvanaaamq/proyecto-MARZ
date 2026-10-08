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

function save() { localStorage.setItem("sols", JSON.stringify(SOLS)); }
function saveNotifs() { localStorage.setItem("notifs", JSON.stringify(NOTIFS)); }
function fecha() { return new Date().toLocaleString(); }
function agentesActivos() { return USERS.filter(x => x.rol === "Agente" && x.activo); }

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
  if (ses.rol === "Coordinador") verTodas("prioridad");
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
  SOLS.push({ id: id, titulo: t, desc: d, cat: c, fecha: f, estado: "Nuevo", dueno: ses.u, prio: "Media", asig: "", hist: ["creada " + f + " por " + ses.u], coments: [] });
  save();
  document.getElementById("msg2").innerText = "creada ID " + id;
  document.getElementById("t").value = ""; document.getElementById("d").value = ""; document.getElementById("c").value = "";
  verMias();
}

// solo las propias + busqueda por texto (HU08)
function verMias() {
  var q = (document.getElementById("q").value || "").toLowerCase();
  var ul = document.getElementById("mis");
  ul.innerHTML = "";
  SOLS.filter(s => s.dueno === ses.u && (!q || s.titulo.toLowerCase().indexOf(q) >= 0 || s.desc.toLowerCase().indexOf(q) >= 0)).forEach(s => {
    if (!s.coments) s.coments = [];
    var li = document.createElement("li");
    li.innerHTML = s.id + " " + s.titulo + " | " + s.estado + " | " + s.fecha + " | prio " + s.prio + "<br>" +
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
  s.estado = "Cerrado"; s.fecha = fecha();
  s.hist.push("aceptada (Cerrado) " + s.fecha + " por " + ses.u);
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
  s.estado = "En Atención"; s.fecha = fecha();
  s.hist.push("reabierta a En Atención " + s.fecha + " por " + ses.u + " motivo: " + motivo);
  save(); verMias();
}

// HU05 + HU04: coordinador prioriza y asigna a agente activo
function verTodas(orden) {
  if (!orden) { var sel = document.getElementById("orden"); orden = sel ? sel.value : "prioridad"; }
  var arr = SOLS.slice();
  if (orden === "prioridad") { var o = { Alta: 0, Media: 1, Baja: 2 }; arr.sort((a, b) => o[a.prio] - o[b.prio]); }
  if (orden === "estado") arr.sort((a, b) => a.estado.localeCompare(b.estado));
  if (orden === "fecha") arr.sort((a, b) => b.id - a.id);
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
  s.prio = prio; s.estado = estado;
  var f = fecha();
  s.fecha = f;
  s.hist.push("prioridad a " + prio + ", estado a " + estado + " " + f + " por " + ses.u);
  if (agente && agente !== s.asig) {
    s.asig = agente;
    s.hist.push("asignada a " + agente + " " + f + " por " + ses.u);
    NOTIFS.push({ para: agente, texto: "Se te asignó solicitud " + s.id + " " + s.titulo, fecha: f });
    saveNotifs();
    document.getElementById("msg-coor").innerText = "asignada a " + agente + " y notificada";
  } else {
    if (!agente) s.asig = "";
    document.getElementById("msg-coor").innerText = "guardado ID " + s.id;
  }
  save(); verTodas(document.getElementById("orden").value);
}

// Agente: ver asignadas + aviso + comentarios (HU06) + cambio estado (HU07)
function verAsignadas() {
  var ul = document.getElementById("asig");
  ul.innerHTML = "";
  var mias = SOLS.filter(s => s.asig === ses.u);
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
    var be = document.createElement("button");
    be.innerText = "cambiar estado";
    be.onclick = function () { cambiarEstadoAgente(s.id, se.value); };
    li.appendChild(inp); li.appendChild(bc); li.appendChild(msgC); li.appendChild(document.createElement("br"));
    li.appendChild(se); li.appendChild(be);
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
  save(); verAsignadas();
}

// HU07: solo transiciones permitidas, rechaza invalidas
function cambiarEstadoAgente(id, nuevo) {
  if (!ses || ses.rol !== "Agente") return;
  var s = SOLS.find(x => x.id === id);
  if (!s || s.asig !== ses.u) return;
  if (nuevo === s.estado) return;
  var ok = (TRANS[s.estado] || []).indexOf(nuevo) >= 0;
  if (!ok) { alert("transicion invalida de " + s.estado + " a " + nuevo); return; }
  var ant = s.estado;
  s.estado = nuevo; s.fecha = fecha();
  s.hist.push("estado " + ant + " a " + nuevo + " " + s.fecha + " por " + ses.u);
  save(); verAsignadas();
}

// Auditor: solo lectura, ve historial + comentarios
function verHistorial() {
  var ul = document.getElementById("hist");
  ul.innerHTML = "";
  SOLS.forEach(s => {
    if (!s.coments) s.coments = [];
    var li = document.createElement("li");
    var h = s.hist.map(x => String(x).replace(/\bprio\b/g, "prioridad"));
    li.innerText = s.id + " " + s.titulo + " [" + s.estado + "] asig:" + (s.asig || "-") +
      " -> " + h.join(" | ") +
      " || comentarios: " + (s.coments.length ? s.coments.map(c => c.autor + " " + c.fecha + ": " + c.texto).join(" | ") : "-");
    ul.appendChild(li);
  });
}
