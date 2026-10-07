// usuarios basicos (solo usuario + clave)
var USERS = [
  { u: "solicitante", p: "1234", rol: "Solicitante" },
  { u: "agente", p: "1234", rol: "Agente" },
  { u: "coordinador", p: "1234", rol: "Coordinador" },
  { u: "auditor", p: "1234", rol: "Auditor" }
];
var ses = null; // {u, rol}
var SOLS = JSON.parse(localStorage.getItem("sols") || "[]");

function save() { localStorage.setItem("sols", JSON.stringify(SOLS)); }

// entrar, error generico, guardar sesion simple
function entrar() {
  var u = document.getElementById("user").value.trim();
  var p = document.getElementById("pass").value;
  var f = USERS.find(x => x.u === u && x.p === p);
  if (!f) { document.getElementById("msg").innerText = "datos incorrectos"; return; }
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
  if (!t || !d || !c) { document.getElementById("msg2").innerText = "titulo, descripcion y categoria obligatorios"; return; }
  var id = SOLS.length + 1;
  var f = new Date().toLocaleString();
  SOLS.push({ id: id, titulo: t, desc: d, cat: c, fecha: f, estado: "Nuevo", dueno: ses.u, prio: "Media", asig: "", hist: ["creada " + f + " por " + ses.u] });
  save();
  document.getElementById("msg2").innerText = "creada ID " + id;
  verMias();
}

// solo las propias
function verMias() {
  var ul = document.getElementById("mis");
  ul.innerHTML = "";
  SOLS.filter(s => s.dueno === ses.u).forEach(s => {
    var li = document.createElement("li");
    li.innerText = s.id + " " + s.titulo + " | " + s.estado + " | " + s.fecha;
    li.onclick = function () { alert(s.id + "\n" + s.titulo + "\n" + s.desc + "\n" + s.cat + "\n" + s.estado + "\n" + s.fecha); };
    ul.appendChild(li);
  });
}

// solo coordinador cambia prioridad, lista ordenable
function verTodas(orden) {
  if (!orden) { var sel = document.getElementById("orden"); orden = sel ? sel.value : "prioridad"; }
  var arr = SOLS.slice();
  if (orden === "prioridad") { var o = { Alta: 0, Media: 1, Baja: 2 }; arr.sort((a, b) => o[a.prio] - o[b.prio]); }
  if (orden === "estado") arr.sort((a, b) => a.estado.localeCompare(b.estado));
  if (orden === "fecha") arr.sort((a, b) => b.id - a.id);
  var ul = document.getElementById("todas");
  ul.innerHTML = "";
  arr.forEach(s => {
    var li = document.createElement("li");
    li.innerHTML = s.id + " " + s.titulo + " | " + s.prio + " | " + s.estado + " | " + s.fecha + " | " + s.dueno + "<br>";
    // desplegables de prioridad y estado
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
    var b = document.createElement("button");
    b.innerText = "guardar";
    b.onclick = function () {
      if (!ses || ses.rol !== "Coordinador") return;
      s.prio = sp.value; s.estado = se.value;
      s.fecha = new Date().toLocaleString();
      s.hist.push("prio a " + s.prio + " estado a " + s.estado + " por " + ses.u);
      save(); verTodas(orden);
    };
    li.appendChild(sp); li.appendChild(se); li.appendChild(b);
    ul.appendChild(li);
  });
}

// Agente: solo asignadas, registra avance
function verAsignadas() {
  var ul = document.getElementById("asig");
  ul.innerHTML = "";
  SOLS.filter(s => s.asig === ses.u).forEach(s => {
    var li = document.createElement("li");
    li.innerText = s.id + " " + s.titulo + " | " + s.estado + " ";
    var b = document.createElement("button");
    b.innerText = "avance";
    b.onclick = function () {
      var a = prompt("registrar avance");
      if (!a) return;
      s.hist.push("avance por " + ses.u + ": " + a);
      s.fecha = new Date().toLocaleString(); save(); verAsignadas();
    };
    li.appendChild(b);
    ul.appendChild(li);
  });
}

// Auditor: solo lectura, no crea ni modifica
function verHistorial() {
  var ul = document.getElementById("hist");
  ul.innerHTML = "";
  SOLS.forEach(s => {
    var li = document.createElement("li");
    li.innerText = s.id + " " + s.titulo + " -> " + s.hist.join(" | ");
    ul.appendChild(li);
  });
}
