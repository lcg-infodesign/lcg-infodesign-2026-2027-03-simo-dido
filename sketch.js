let myTable, numRivers;

// Margini del grafico e continenti
let marginLeft = 140, marginRight = 60, marginTop = 130, marginBottom = 120;
let continents = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];

// Metriche per l'asse X
let metrics = ["length", "area", "tributaries"];
let metricLabels = ["Lunghezza (km)", "Bacino idrografico (km²)", "Numero di affluenti"];
let metricMax = [0, 0, 0];
let activeMetric = 0;

// Valori minimi e massimi per colore e diametro
let minDischarge, maxDischarge, minTemp, maxTemp;
let buttons = [];

async function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);

  myTable = await loadTable("assets/rivers.csv", ",", "header");

  numRivers = myTable.getRowCount();
  prepareData();
  createInterfaceButtons();
}

// Calcolo di massimi e minimi in setup
function prepareData() {
  minDischarge = myTable.getNum(0, "discharge");
  maxDischarge = 0;
  minTemp = myTable.getNum(0, "avg_temp");
  maxTemp = minTemp;

  for (let i = 0; i < numRivers; i++) {
    for (let m = 0; m < metrics.length; m++) {
      let val = myTable.getNum(i, metrics[m]);
      if (val > metricMax[m]) metricMax[m] = val;
    }
    let d = myTable.getNum(i, "discharge");
    if (d < minDischarge) minDischarge = d;
    if (d > maxDischarge) maxDischarge = d;

    let t = myTable.getNum(i, "avg_temp");
    if (t < minTemp) minTemp = t;
    if (t > maxTemp) maxTemp = t;
  }
}

// Creazione dei 3 bottoni filtro
function createInterfaceButtons() {
  let btnX = windowWidth / 2 - 200;
  for (let m = 0; m < metrics.length; m++) {
    let btn = createButton(metricLabels[m]);
    btn.position(btnX, 82);
    
    // Stile di base per sfondo scuro (Scritta bianca, sfondo trasparente)
    btn.style("padding", "6px 14px");
    btn.style("font-size", "12px");
    btn.style("font-weight", "500");
    btn.style("border-radius", "6px");
    btn.style("cursor", "pointer");
    btn.style("background-color", "transparent");
    btn.style("color", "#FFFFFF");
    btn.style("transition", "background-color 0.2s, border-color 0.2s");

    // Gestione dell'effetto HOVER (Azzurro elettrico)
    btn.elt.addEventListener("mouseenter", () => {
      if (m !== activeMetric) {
        btn.style("background-color", "#00E5FF"); // Azzurro elettrico
        btn.style("border-color", "#00E5FF");
        btn.style("color", "#000000"); // Testo nero per leggibilità sull'azzurro
      }
    });
    
    // Ripristino quando il mouse esce dal bottone non selezionato
    btn.elt.addEventListener("mouseleave", () => {
      if (m !== activeMetric) {
        btn.style("background-color", "transparent");
        btn.style("color", "#FFFFFF");
        btn.style("border-left", m > 0 ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid transparent");
        btn.style("border-top", "1px solid transparent");
        btn.style("border-right", "1px solid transparent");
        btn.style("border-bottom", "1px solid transparent");
      }
    });

    btn.mousePressed(() => { activeMetric = m; });
    buttons.push(btn);
    btnX += btn.elt.offsetWidth + 10;
  }
}


// Aggiorna lo stile visivo del bottone attivo
function updateButtons() {
  for (let m = 0; m < buttons.length; m++) {
    let isActive = (m === activeMetric);
    if (isActive) {
      // Se SELEZIONATO: Tutto il bottone diventa Blu con scritta Bianca
      buttons[m].style("background-color", "#0052FF"); // Blu
      buttons[m].style("color", "#FFFFFF");
      buttons[m].style("border", "1px solid #0052FF");
    } else {
      // Se NON SELEZIONATO: Sfondo trasparente e separazione con barra verticale a sinistra (tranne il primo)
      buttons[m].style("background-color", "transparent");
      buttons[m].style("color", "#FFFFFF");
      buttons[m].style("border-top", "1px solid transparent");
      buttons[m].style("border-right", "1px solid transparent");
      buttons[m].style("border-bottom", "1px solid transparent");
      // Crea la barra verticale di divisione sfruttando il bordo sinistro dei bottoni successivi al primo
      buttons[m].style("border-left", m > 0 ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid transparent");
    }
  }
}


// Indice della riga del continente
function continentIndex(name) {
  for (let k = 0; k < continents.length; k++) {
    if (continents[k] === name) return k;
  }
  return 0;
}

// Normalizza il valore: lineare per lunghezza, radice quadrata per le altre
function scaleValue(val, m) {
  return (m === 0) ? (val / metricMax[0]) : (sqrt(val) / sqrt(metricMax[m]));
}

// Posizione X e Y del fiume
function getX(row) {
  let val = myTable.getNum(row, metrics[activeMetric]);
  return map(scaleValue(val, activeMetric), 0, 1, marginLeft, width - marginRight);
}

function getY(row) {
  let rowH = (height - marginTop - marginBottom) / continents.length;
  let c = continentIndex(myTable.getString(row, "continent"));
  let jitter = (((row * 37) % 100) / 100 - 0.5) * (rowH * 0.55);
  return marginTop + (c + 0.5) * rowH + jitter;
}

// Diametro proporzionale alla portata d'acqua
function diameterFromDischarge(discharge) {
  return map(sqrt(discharge), sqrt(minDischarge), sqrt(maxDischarge), 8, 46);
}

// Colore in base alla temperatura: azzurro (freddo) -> rosso (caldo)
function getRiverColor(temp, alpha) {
  let t = map(temp, minTemp, maxTemp, 0, 1);
  let c = lerpColor(color(0, 0, 255), color(255, 0, 0), t);
  c.setAlpha(alpha);
  return c;
}

// Identifica il fiume sotto il mouse (-1 se nessuno)
function getHoverIndex() {
  let found = -1, minD = 99999;
  for (let i = 0; i < numRivers; i++) {
    let px = getX(i), py = getY(i);
    let d = diameterFromDischarge(myTable.getNum(i, "discharge"));
    let distMouse = dist(mouseX, mouseY, px, py);
    if (distMouse < d / 2 && d < minD) {
      found = i;
      minD = d;
    }
  }
  return found;
}

// Titolo e sottotitolo
function drawHeader() {
  push();
  noStroke();
  textAlign(CENTER, TOP);
  fill(255);
  textSize(44);
  textStyle(BOLD);
  text("I 100 FIUMI PIÙ GRANDI DEL MONDO", width / 2, 28);
  pop();
}

// Corsie dei continenti
function drawRows() {
  let rowH = (height - marginTop - marginBottom) / continents.length;
  push();
  for (let k = 0; k < continents.length; k++) {
    let y = marginTop + k * rowH;
    stroke(230);
    strokeWeight(1);
    line(marginLeft, y, width - marginRight, y);

    noStroke();
    fill(255);
    textSize(12);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(continents[k], 35, y + rowH / 2);
  }
  pop();
}

// Asse X con tacche e griglia
function drawAxis() {
  let axisY = height - marginBottom;
  push();
  stroke(250);
  strokeWeight(1);
  line(marginLeft, axisY, width - marginRight, axisY);

  for (let k = 0; k <= 4; k++) {
    let f = k / 4;
    let x = map(f, 0, 1, marginLeft, width - marginRight);
    stroke(50);
    line(x, marginTop, x, axisY);
    stroke(50);
    line(x, axisY, x, axisY + 5);

    let val = (activeMetric === 0) ? f * metricMax[0] : f * f * metricMax[activeMetric];
    noStroke();
    fill(255);
    textSize(10);
    textAlign(CENTER, TOP);
    text(Math.round(val).toLocaleString("it-IT"), x, axisY + 10);
  }

  noStroke();
  fill(15, 23, 42);
  textSize(12);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(metricLabels[activeMetric], marginLeft, axisY + 30);

  if (activeMetric !== 0) {
    fill(148, 163, 184);
    textSize(10);
    textStyle(NORMAL);
    text("(scala a radice quadrata per bilanciare i valori estremi)", marginLeft, axisY + 46);
  }
  pop();
}

// Disegno dei cerchi per ogni fiume
function drawRivers(hoverIdx) {
  push();
  for (let i = 0; i < numRivers; i++) {
    let px = getX(i), py = getY(i);
    let d = diameterFromDischarge(myTable.getNum(i, "discharge"));
    let temp = myTable.getNum(i, "avg_temp");
    let alpha = (hoverIdx !== -1 && hoverIdx !== i) ? 50 : 185;

    fill(getRiverColor(temp, alpha));
    stroke(255, alpha * 0.9);
    strokeWeight(1);
    ellipse(px, py, d, d);
  }
  pop();
}

// Evidenziazione del fiume selezionato
function drawHighlight(idx) {
  let px = getX(idx), py = getY(idx);
  let d = diameterFromDischarge(myTable.getNum(idx, "discharge"));
  let temp = myTable.getNum(idx, "avg_temp");

  push();
  stroke(148, 163, 184, 120);
  strokeWeight(1);
  line(px, marginTop, px, height - marginBottom);
  fill(getRiverColor(temp, 255));
  stroke(15, 23, 42);
  strokeWeight(2);
  ellipse(px, py, d, d);
  pop();
}

// Scheda dettagli al passaggio del mouse
function drawTooltip(idx) {
  let tw = 260, th = 175, tx = mouseX + 16, ty = mouseY + 16;
  if (tx + tw > width - 20) tx = mouseX - tw - 16;
  if (ty + th > height - 20) ty = mouseY - th - 16;

  push();
  fill(15, 23, 42, 240);
  noStroke();
  rect(tx, ty, tw, th, 8);

  fill(255);
  textSize(13);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(myTable.getString(idx, "name"), tx + 14, ty + 12, tw - 28);

  fill(203, 213, 225);
  textSize(11);
  textStyle(NORMAL);
  let yTxt = ty + 50, gap = 16;
  text("Continente: " + myTable.getString(idx, "continent"), tx + 14, yTxt);
  text("Sfocia in: " + myTable.getString(idx, "outflow"), tx + 14, yTxt + gap);
  text("Lunghezza: " + myTable.getNum(idx, "length").toLocaleString("it-IT") + " km", tx + 14, yTxt + gap * 2);
  text("Bacino: " + myTable.getNum(idx, "area").toLocaleString("it-IT") + " km²", tx + 14, yTxt + gap * 3);
  text("Portata: " + myTable.getNum(idx, "discharge").toLocaleString("it-IT") + " m³/s", tx + 14, yTxt + gap * 4);
  text("Temp. media: " + myTable.getNum(idx, "avg_temp") + " °C", tx + 14, yTxt + gap * 5);
  pop();
}

// Legende per colore (temperatura) e grandezza (portata)
function drawLegends() {
  push();
  let legY = height - marginBottom + 50;

  // Legenda Temperatura
  let xTemp = width - 420;
  fill(255);
  textSize(10);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("Temperatura media", xTemp, legY - 15);

  let barW = 120, barH = 8;
  for (let b = 0; b < barW; b++) {
    stroke(lerpColor(color(0, 0, 255), color(255, 0, 0), b / barW));
    line(xTemp + b, legY + 6, xTemp + b, legY + 26 + barH);
  }
  noStroke();
  fill(255);
  textSize(9);
  textStyle(NORMAL);
  text(minTemp + " °C", xTemp, legY + 46);
  textAlign(RIGHT, TOP);
  text(maxTemp + " °C", xTemp + barW, legY + 46);

  // Legenda Portata
  let xPort = width - 230;
  textAlign(LEFT, TOP);
  fill(255);
  textSize(10);
  textStyle(BOLD);
  text("Portata d'acqua", xPort, legY - 15);

  let samples = [1000, 10000, 100000], cx = xPort + 15;
  for (let s = 0; s < samples.length; s++) {
    let cd = diameterFromDischarge(samples[s]);
    noFill();
    stroke(255);
    strokeWeight(1);
    ellipse(cx, legY + 20, cd, cd);

    noStroke();
    fill(255);
    textSize(8.5);
    textAlign(CENTER, TOP);
    text(samples[s].toLocaleString("it-IT"), cx, legY + 46);
    cx += cd + 24;
  }
  pop();
}

// Ciclo di disegno principale
function draw() {
  background(25);

  updateButtons();
  drawHeader();
  drawRows();
  drawAxis();

  let hoverIdx = getHoverIndex();
  drawRivers(hoverIdx);

  if (hoverIdx !== -1) {
    drawHighlight(hoverIdx);
    drawTooltip(hoverIdx);
  }

  drawLegends();
}