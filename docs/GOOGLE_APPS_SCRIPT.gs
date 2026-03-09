/**
 * PUENTE PARA MUNDO DONGHUA
 * Instrucciones: Pegar esto en Extensiones > Apps Script, Guardar y Publicar como Aplicación Web.
 */

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "getConfig") {
    const sheet = ss.getSheetByName("Configuracion");
    const data = sheet.getDataRange().getValues();
    const config = {};
    data.slice(1).forEach(row => {
      config[row[0]] = row[1];
    });
    return ContentService.createTextOutput(JSON.stringify(config)).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "getDonghuas") {
    const sheet = ss.getSheetByName("ListaDeDonghuas");
    const data = sheet.getDataRange().getValues();
    const list = data.slice(1).map(r => ({ id: r[0], name: r[1], img: r[2] || "" }));
    return ContentService.createTextOutput(JSON.stringify(list)).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const body = JSON.parse(e.postData.contents);
  const action = body.action;

  if (action === "submitVote") {
    const sheet = ss.getSheetByName("Votaciones");
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Lógica de inserción/sobrescritura simplificada
    const newRow = new Array(headers.length).fill("");
    newRow[0] = new Date();
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
