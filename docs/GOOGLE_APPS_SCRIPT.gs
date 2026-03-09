/**
 * PUENTE PARA MUNDO DONGHUA (v2 funcional)
 * Instrucciones: Pegar esto en Extensiones > Apps Script, Guardar y Publicar como Aplicación Web.
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "getConfig") {
    const sheet = ss.getSheetByName("Configuracion");
    const data = sheet.getDataRange().getValues();
    const config = {};
    data.forEach(row => {
      if (row[0]) config[row[0].toString().trim()] = row[1];
    });
    return ContentService.createTextOutput(JSON.stringify(config)).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "getDonghuas") {
    const sheet = ss.getSheetByName("ListaDeDonghuas");
    const data = sheet.getDataRange().getValues();
    const list = data.slice(1).map(r => ({ id: r[0], name: r[1], img: r[2] || "" }));
    return ContentService.createTextOutput(JSON.stringify(list)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getResults") {
    const vSheet = ss.getSheetByName("Votaciones");
    const rSheet = ss.getSheetByName("Resumen");
    const data = rSheet.getDataRange().getValues();
    // Leer el resumen generado por las fórmulas del Excel
    const results = data.slice(1).filter(r => r[0] && r[0] !== "Votos totales").map(r => ({
      Donghua: r[0],
      Patrocinio: r[1] || 0,
      x2: r[2] || 0,
      VotosPatreon: r[3] || 0,
      Total: r[4] || 0
    }));
    return ContentService.createTextOutput(JSON.stringify(results)).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const body = JSON.parse(e.postData.contents);
  
  if (body.action === "submitVote") {
    const sheet = ss.getSheetByName("Votaciones");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Buscar si ya existe el email en el mes activo (opcional para simplicidad)
    const newRow = new Array(headers.length).fill("");
    newRow[0] = Utilities.formatDate(new Date(), "GMT-5", "yyyy-MM-dd HH:mm:ss");
    newRow[1] = body.email;
    newRow[2] = body.nick;
    newRow[3] = body.tier;
    
    for (let donghua in body.votes) {
      let idx = headers.indexOf(donghua);
      if (idx > -1) newRow[idx] = body.votes[donghua];
    }
    
    sheet.appendRow(newRow);
    return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
  }
}
