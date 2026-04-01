/*************************** IDENTIFIANTS DES FICHIERS ***************************/
const BLACKLIST_ID = 'YOUR_BLACKLIST_SHEET_ID';
const BENEF_DB_ID = 'YOUR_BENEFICIARY_DB_ID';
const DASHBOARD_ID = 'YOUR_DASHBOARD_SHEET_ID';
/*********************************************************************************/

/*************************** INDEX DES COLONNES DU FORMULAIRE *******************/
const COL = {
  PHONE:       6,   // NumÃƒÂ©ro WhatsApp
  DOB:         7,   // Date de naissance
  STUDENT:     8,   // Es-tu encore ÃƒÂ©tudiant ?
  STUDY_LEVEL: 9,   // Niveau dÃ¢â‚¬â„¢ÃƒÂ©tude
  ADMISSIBLE: 13,   // Colonne "Admissible" (ÃƒÂ  ajuster)
  WHATSAPP:   14    // Colonne "AjoutÃƒÂ© sur WhatsApp" (X)
};
/*********************************************************************************/

/**
 * Ã°Å¸Å¡Â¨ Supprime tous les dÃƒÂ©clencheurs installÃƒÂ©s dans le script.
 */
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log(`Ã°Å¸Â§Â¹ Suppression de ${triggers.length} dÃƒÂ©clencheur(s)`);
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

/**
 * Ã°Å¸â€œÅ’ Ãƒâ‚¬ exÃƒÂ©cuter UNE FOIS pour activer les dÃƒÂ©clencheurs.
 */
function installTriggers() {
  deleteAllTriggers();
  ScriptApp.newTrigger('handleFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
  Logger.log('Ã¢Å“â€¦ Trigger handleFormSubmit');
  ScriptApp.newTrigger('handleEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  Logger.log('Ã¢Å“â€¦ Trigger handleEdit');
  ScriptApp.newTrigger('syncBlacklist')
    .timeBased().everyDays(1).atHour(3).create();
  Logger.log('Ã¢Å“â€¦ Trigger syncBlacklist');
  ScriptApp.newTrigger('duplicateAllAnnualSheets')
    .timeBased().everyDays(1).atHour(1).create();
  Logger.log('Ã¢Å“â€¦ Trigger duplicateAllAnnualSheets');
}

/**
 * Ã°Å¸â€Â Duplique toutes les feuilles BDD / Dashboard / Blacklist le 1er juillet.
 */
function duplicateAllAnnualSheets() {
  const today = new Date();
  Logger.log(`Ã°Å¸â€â€ž VÃƒÂ©rification date pour duplication annuelle : ${today}`);
  if (today.getMonth() !== 6 || today.getDate() !== 1) {
    Logger.log("Ã¢ÂÂ­Ã¯Â¸Â Pas le 1er juillet, on s'arrÃƒÂªte");
    return;
  }
  const year = today.getFullYear();
  const nextYear = `${year}_${year+1}`;
  Logger.log(`Ã°Å¸â€œâ€  Duplication pour l'annÃƒÂ©e scolaire : ${nextYear}`);

  duplicateBeneficiaryDB(nextYear);
  duplicateBlacklistYearSheet(nextYear);
  duplicateDashboardSheet(nextYear);
}

/**
 * Ã°Å¸â€œÂ Duplique la feuille BDD bÃƒÂ©nÃƒÂ©ficiaires pour la nouvelle annÃƒÂ©e et purge le contenu.
 */
function duplicateBeneficiaryDB(newYear) {
  Logger.log(`Ã°Å¸â€œÂ duplicateBeneficiaryDB(${newYear})`);
  const ss = SpreadsheetApp.openById(BENEF_DB_ID);
  const sheets = ss.getSheets();
  const last = sheets[sheets.length - 1];
  const headers = last.getRange(1,1,1,last.getLastColumn()).getValues();
  const newSheet = last.copyTo(ss).setName(`BDDbenef_${newYear}`);
  newSheet.clearContents();
  newSheet.getRange(1,1,1,headers[0].length).setValues(headers);
  Logger.log("Ã¢Å“â€¦ Feuille BDD dupliquÃƒÂ©e et purgÃƒÂ©e");
}

/**
 * Ã°Å¸Å¡Â« Duplique la feuille Blacklist annuelle pour la nouvelle annÃƒÂ©e et purge le contenu.
 */
function duplicateBlacklistYearSheet(newYear) {
  Logger.log(`Ã°Å¸Å¡Â« duplicateBlacklistYearSheet(${newYear})`);
  const ss = SpreadsheetApp.openById(BLACKLIST_ID);
  const prev = ss.getSheets().find(s => s.getName().startsWith('Blacklist_'));
  if (!prev) {
    Logger.log("Ã¢Å¡Â Ã¯Â¸Â Aucune feuille Blacklist_ trouvÃƒÂ©e");
    return;
  }
  const headers = prev.getRange(1,1,1,prev.getLastColumn()).getValues();
  const newSheet = prev.copyTo(ss).setName(`Blacklist_${newYear}`);
  newSheet.clearContents();
  newSheet.getRange(1,1,1,headers[0].length).setValues(headers);
  Logger.log("Ã¢Å“â€¦ Feuille Blacklist dupliquÃƒÂ©e et purgÃƒÂ©e");
}

/**
 * Ã°Å¸â€œÅ  Duplique la feuille Dashboard pour la nouvelle annÃƒÂ©e et purge le contenu.
 */
function duplicateDashboardSheet(newYear) {
  Logger.log(`Ã°Å¸â€œÅ  duplicateDashboardSheet(${newYear})`);
  const ss = SpreadsheetApp.openById(DASHBOARD_ID);
  const last = ss.getSheets().slice(-1)[0];
  const headers = last.getRange(1,1,1,last.getLastColumn()).getValues();
  const newSheet = last.copyTo(ss).setName(`Dashboard_${newYear}`);
  newSheet.clearContents();
  newSheet.getRange(1,1,1,headers[0].length).setValues(headers);
  Logger.log("Ã¢Å“â€¦ Feuille Dashboard dupliquÃƒÂ©e et purgÃƒÂ©e");
}

/**
 * Ã°Å¸â€œÂ¥ GÃƒÂ¨re la soumission du formulaire.
 *   0Ã¯Â¸ÂÃ¢Æ’Â£ Refuse si le numÃƒÂ©ro est dÃƒÂ©jÃƒÂ  prÃƒÂ©sent dans les rÃƒÂ©ponses du formulaire.
 *   1Ã¯Â¸ÂÃ¢Æ’Â£ Refuse si le numÃƒÂ©ro est dÃƒÂ©jÃƒÂ  inscrit cette annÃƒÂ©e en BDD.
 *   2Ã¯Â¸ÂÃ¢Æ’Â£ Refuse si prÃƒÂ©sent en blacklist dÃƒÂ©finitive.
 *   3Ã¯Â¸ÂÃ¢Æ’Â£ Refuse si non admissible par ÃƒÂ¢ge/ÃƒÂ©tudiant.
 *   4Ã¯Â¸ÂÃ¢Æ’Â£ Sinon, ajoute en BDD et met ÃƒÂ  jour le dashboard.
 */
function handleFormSubmit(e) {
  const formSS    = SpreadsheetApp.getActiveSpreadsheet();
  const formSh    = formSS.getSheetByName('RÃƒÂ©ponses au formulaire 1');
  const row       = e.range.getRow();
  const data      = formSh.getRange(row, 1, 1, formSh.getLastColumn()).getValues()[0];
  const phone     = normalizePhone(String(data[COL.PHONE - 1]));
  const naissance = new Date(data[COL.DOB - 1]);
  const etu       = String(data[COL.STUDENT - 1]).trim();
  const age       = getAge(naissance);
  Logger.log(`Ã¢â€“Â¶Ã¯Â¸Â handleFormSubmit #${row} Ã¢â‚¬â€ phone:${phone}, age:${age}, etu:${etu}`);

  // 0Ã¯Â¸ÂÃ¢Æ’Â£ Doublon dans les rÃƒÂ©ponses ?
  const allPhones = formSh
    .getRange(2, COL.PHONE, formSh.getLastRow() - 1, 1)
    .getValues()
    .flat()
    .map(p => normalizePhone(String(p)));
  if (allPhones.filter(p => p === phone).length > 1) {
    Logger.log(`Ã¢â€ºâ€ Doublon de rÃƒÂ©ponse dÃƒÂ©tectÃƒÂ©: ${phone}`);
    markRejected(formSh, row, 'rÃƒÂ©ponse en double', true);
    return;
  }

  // repÃƒÂ¨re la BDD de l'annÃƒÂ©e scolaire
  const year  = getAcademicYear(new Date());
  const bddSh = SpreadsheetApp.openById(BENEF_DB_ID).getSheetByName(`BDDbenef_${year}`);
  if (!bddSh) {
    Logger.log(`Ã¢ÂÅ’ Feuille BDD introuvable: BDDbenef_${year}`);
    return;
  }

  // 1Ã¯Â¸ÂÃ¢Æ’Â£ Doublon en BDD cette annÃƒÂ©e ?
  const bddPhones = bddSh.getRange(2, 1, bddSh.getLastRow() - 1, 1)
    .getValues().flat().map(p => normalizePhone(String(p)));
  if (bddPhones.includes(phone)) {
    Logger.log(`Ã¢â€ºâ€ Num dÃƒÂ©jÃƒÂ  en BDD: ${phone}`);
    markRejected(formSh, row, 'inscrit cette annÃƒÂ©e', true);
    return;
  }

  // 2Ã¯Â¸ÂÃ¢Æ’Â£ Blacklist dÃƒÂ©finitive ?
  if (isInDefinitiveBlacklist(phone)) {
    markRejected(formSh, row, 'BlacklistÃƒÂ© dÃƒÂ©finitif', true);
    return;
  }

  // 3Ã¯Â¸ÂÃ¢Æ’Â£ AdmissibilitÃƒÂ© ÃƒÂ¢ge/ÃƒÂ©tudiant
  if (/^ *[oOyY]/.test(etu) && age >= 30) {
    markRejected(formSh, row, 'ÃƒÂ¢ge Ã¢â€°Â¥30', true);
    return;
  }
  if (!/^ *[oOyY]/.test(etu) && age >= 26) {
    markRejected(formSh, row, 'non-ÃƒÂ©tudiant Ã¢â€°Â¥26', true);
    return;
  }

  // 4Ã¯Â¸ÂÃ¢Æ’Â£ Tout est OK Ã¢â€ â€™ on ajoute et met ÃƒÂ  jour les stats
  bddSh.appendRow([phone, data[2], data[3], naissance, etu, '']);
  Logger.log(`Ã¢Å“â€¦ AjoutÃƒÂ© en BDD (formSubmit): ${phone}`);
  updateDashboardStats();
}


/**
 * Ã¢Å“â€¦ GÃƒÂ¨re la case Ã¢â‚¬Å“AjoutÃƒÂ© sur WhatsAppÃ¢â‚¬Â cochÃƒÂ©e manuellement.
 *   0Ã¯Â¸ÂÃ¢Æ’Â£ Refuse si dÃƒÂ©jÃƒÂ  inscrit cette annÃƒÂ©e (sans barrer).
 *   1Ã¯Â¸ÂÃ¢Æ’Â£ Refuse si en blacklist dÃƒÂ©finitive.
 *   2Ã¯Â¸ÂÃ¢Æ’Â£ Refuse si non admissible par ÃƒÂ¢ge/ÃƒÂ©tudiant.
 *   3Ã¯Â¸ÂÃ¢Æ’Â£ Refuse si en blacklist annuelle.
 *   4Ã¯Â¸ÂÃ¢Æ’Â£ Sinon, ajoute en BDD et met ÃƒÂ  jour le dashboard.
 */
function handleEdit(e) {
  const { range, value } = e;
  const sheet = range.getSheet();
  const row   = range.getRow();
  const col   = range.getColumn();
  if (col !== COL.WHATSAPP || String(value).toUpperCase().trim() !== 'X') return;
  const data      = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const phone     = normalizePhone(String(data[COL.PHONE - 1]));
  const naissance = new Date(data[COL.DOB - 1]);
  const etu       = String(data[COL.STUDENT - 1]).trim();
  const age       = getAge(naissance);
  Logger.log(`Ã¢â€“Â¶Ã¯Â¸Â handleEdit #${row} Ã¢â‚¬â€ phone:${phone}, age:${age}, etu:${etu}`);

  // BDD de l'annÃƒÂ©e
  const year     = getAcademicYear(new Date());
  const bddSh    = SpreadsheetApp.openById(BENEF_DB_ID).getSheetByName(`BDDbenef_${year}`);
  if (!bddSh) return;

  // 0Ã¯Â¸ÂÃ¢Æ’Â£ Doublon BDD ?
  const bddPhones = bddSh.getRange(2, 1, bddSh.getLastRow() - 1, 1)
    .getValues().flat().map(p => normalizePhone(String(p)));
  if (bddPhones.includes(phone)) {
    sheet.getRange(row, COL.ADMISSIBLE)
         .setValue('Non (inscrit cette annÃƒÂ©e)').setFontColor('red');
    return;
  }

  // 1Ã¯Â¸ÂÃ¢Æ’Â£ Blacklist dÃƒÂ©finitive ?
  if (isInDefinitiveBlacklist(phone)) {
    markRejected(sheet, row, 'BlacklistÃƒÂ© dÃƒÂ©finitif', true);
    return;
  }

  // 2Ã¯Â¸ÂÃ¢Æ’Â£ AdmissibilitÃƒÂ© ÃƒÂ¢ge/ÃƒÂ©tudiant
  if (/^ *[oOyY]/.test(etu) && age >= 30) {
    markRejected(sheet, row, 'ÃƒÂ¢ge Ã¢â€°Â¥30', true);
    return;
  }
  if (!/^ *[oOyY]/.test(etu) && age >= 26) {
    markRejected(sheet, row, 'non-ÃƒÂ©tudiant Ã¢â€°Â¥26', true);
    return;
  }

  // 3Ã¯Â¸ÂÃ¢Æ’Â£ Blacklist annuelle ?
  if (isBlacklisted(phone)) {
    markRejected(sheet, row, 'BlacklistÃƒÂ© annuel', false);
    return;
  }

  // 4Ã¯Â¸ÂÃ¢Æ’Â£ Ajout en BDD + stats
  bddSh.appendRow([phone, data[2], data[3], naissance, etu, '']);
  Logger.log(`Ã¢Å“â€¦ AjoutÃƒÂ© en BDD (edit): ${phone}`);
  updateDashboardStats();
}



/**
 * Ã°Å¸Å¡Â« Barre la ligne et ÃƒÂ©crit NON (raison) dans la colonne Admissible.
 * @param {Sheet}  sheet
 * @param {number} row
 * @param {string} reason
 * @param {boolean} strike  si true, barre la ligne entiÃƒÂ¨re
 */
function markRejected(sheet, row, reason, strike) {
  Logger.log(`Ã¢ÂÅ’ RejetÃƒÂ© [${reason}] ligne ${row}`);
  sheet.getRange(row, COL.ADMISSIBLE)
       .setValue(`Non (${reason})`)
       .setFontColor('red');
  if (strike) {
    sheet.getRange(row, 1, 1, sheet.getLastColumn())
         .setFontLine('line-through');
  }
  SpreadsheetApp.getUi().alert(
    `Ã¢Å¡Â  EntrÃƒÂ©e rejetÃƒÂ©e: ${reason}\n` +
    `Voir Blacklist dÃƒÂ©finitive: https://docs.google.com/spreadsheets/d/${BLACKLIST_ID}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}



/**
 * Ã°Å¸â€œÅ  Recalcule et ÃƒÂ©crit les stats dans le Dashboard.
 */
function updateDashboardStats() {
  Logger.log("Ã°Å¸â€œÅ  updateDashboardStats dÃƒÂ©clenchÃƒÂ©");

  const formSS    = SpreadsheetApp.getActiveSpreadsheet();
  const formSheet = formSS.getSheetByName('RÃƒÂ©ponses au formulaire 1');
  const data      = formSheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log("Ã¢ÂÂ¹Ã¯Â¸Â Pas assez de lignes pour stats");
    return;
  }

  const header = data[0];
  const rows   = data.slice(1);

  // Recherche souple des colonnes :
  const idxWhatsapp = header.findIndex(h => /ajoutÃƒÂ©.*whatsapp/i.test(h));
  const idxStudent  = header.findIndex(h => /ÃƒÂ©tudiant|student/i.test(h));
  const idxLevel    = header.findIndex(h => /niveau.*study/i.test(h));
  const idxDOB      = header.findIndex(h => /date.*naissance|Date of birth/i.test(h));

  Logger.log(`Ã°Å¸â€Â¢ Indices (souples) => whatsapp:${idxWhatsapp}, student:${idxStudent}, level:${idxLevel}, dob:${idxDOB}`);

  if ([idxWhatsapp, idxStudent, idxLevel, idxDOB].some(i => i < 0)) {
    Logger.log("Ã¢ÂÅ’ Impossible de trouver toutes les colonnes, stats annulÃƒÂ©es");
    return;
  }

  let nbReponses = rows.length,
      nbAdmis    = 0,
      etuAd      = 0,
      etuCand    = 0,
      nonEtuAd   = 0,
      nonEtuCand = 0;
  let bacCount = { "1":0,"2":0,"3":0,"4":0,"5":0,">5":0 };
  let ages = [];

  rows.forEach(row => {
    const rawWhatsapp = row[idxWhatsapp] || '';
    const rawStudent  = row[idxStudent]  || '';
    const rawLevel    = row[idxLevel]    || '';
    const rawDOB      = row[idxDOB]      || '';

    const whatsapp = String(rawWhatsapp).toUpperCase().trim() === 'X';
    const student  = String(rawStudent).toLowerCase().startsWith('o');
    const level    = String(rawLevel).replace(/\D/g, '');
    const dob      = new Date(rawDOB);
    const age      = isNaN(dob) ? NaN : getAge(dob);

    if (!isNaN(age)) ages.push(age);
    if (whatsapp) nbAdmis++;
    if (student) etuCand++; else nonEtuCand++;
    if (whatsapp && student) etuAd++;
    if (whatsapp && !student) nonEtuAd++;

    if (bacCount[level] !== undefined) bacCount[level]++;
    else if (parseInt(level) > 5) bacCount[">5"]++;
  });

  const moyenneAge = ages.length
    ? Math.round(ages.reduce((a,b) => a+b) / ages.length)
    : '';

  const stats = [
    nbReponses, nbAdmis,
    bacCount["1"], bacCount["2"], bacCount["3"], bacCount["4"], bacCount["5"], bacCount[">5"],
    etuAd, etuCand, nonEtuCand, nonEtuAd, moyenneAge
  ];

  const year = getAcademicYear(new Date());
  const dashSheet = SpreadsheetApp.openById(DASHBOARD_ID)
                              .getSheetByName(`Dashboard_${year}`);
  if (!dashSheet) {
    Logger.log(`Ã¢ÂÅ’ Feuille Dashboard_${year} introuvable`);
    return;
  }

  dashSheet.getRange(2, 1, 1, stats.length).setValues([stats]);
  Logger.log("Ã¢Å“â€¦ Dashboard mis ÃƒÂ  jour :", stats);
}

/**
 * Ã°Å¸â€â€ž Synchronise quotidiennement la blacklist :
 *   - Parcourt chaque feuille BDDbenef_<annÃƒÂ©e>
 *   - Pour chaque numÃƒÂ©ro prÃƒÂ©sent dans la feuille Blacklist_<annÃƒÂ©e> avec 1 croix ("x"),
 *     affiche une alerte invitant ÃƒÂ  renseigner activitÃƒÂ©/date/raison.
 *   - Pour chaque numÃƒÂ©ro avec 2 croix ("xx"),
 *     ajoute la ligne ÃƒÂ  la feuille Blacklist_dÃƒÂ©finitive et supprime la ligne de la BDD.
 */
function syncBlacklist() {
  Logger.log('Ã¢â€“Â¶Ã¯Â¸Â syncBlacklist dÃƒÂ©marrÃƒÂ©');

  const blSS   = SpreadsheetApp.openById(BLACKLIST_ID);
  const year   = getAcademicYear(new Date());
  const blSheet = blSS.getSheetByName(`Blacklist_${year}`);
  if (!blSheet) {
    Logger.log(`Ã¢ÂÅ’ Feuille Blacklist_${year} introuvable`);
    return;
  }
  const defSheet = blSS.getSheetByName('Blacklist_dÃƒÂ©finitive') 
                 || blSS.insertSheet('Blacklist_dÃƒÂ©finitive');
  Logger.log(`Ã¢â€žÂ¹Ã¯Â¸Â Blacklist annuelle et dÃƒÂ©finitive prÃƒÂªtes`);

  // RÃƒÂ©cupÃƒÂ¨re toutes les entrÃƒÂ©es de la feuille blacklist annuelle
  const blData = blSheet.getDataRange().getValues();
  if (blData.length < 2) {
    Logger.log('Ã¢Å¡Â Ã¯Â¸Â Pas de donnÃƒÂ©es dans Blacklist annuelle');
    return;
  }

  // Parcourt chaque feuille BDDbenef_<annÃƒÂ©e> dans le fichier BENEF_DB_ID
  const dbSS = SpreadsheetApp.openById(BENEF_DB_ID);
  dbSS.getSheets().forEach(sheet => {
    if (!sheet.getName().startsWith(`BDDbenef_${year}`)) return;

    Logger.log(`Ã°Å¸â€Å½ Traitement de la feuille ${sheet.getName()}`);
    const data = sheet.getDataRange().getValues();
    const toDelete = [];
    
    // Pour chaque ligne de la BDD
    for (let r = 1; r < data.length; r++) {
      const phone = normalizePhone(String(data[r][COL.PHONE-1]));
      // Cherche ce numÃƒÂ©ro dans la blacklist annuelle
      const blRow = blData.findIndex((row,i) => i>0 && normalizePhone(String(row[2])) === phone);
      if (blRow < 1) continue;

      const croix = String(blData[blRow][7]).toLowerCase().trim(); // colonne H = index 7
      if (croix === 'x') {
        // 1ÃƒÂ¨re croix : simple alerte
        SpreadsheetApp.getUi().alert(
          `Ã¢Å¡Â  Une croix a ÃƒÂ©tÃƒÂ© posÃƒÂ©e sur ${phone}.\n` +
          `Merci de renseigner activitÃƒÂ©/date/raison dans Blacklist_${year}.\n` +
          `Voir : https://docs.google.com/spreadsheets/d/${BLACKLIST_ID}`
        );
        Logger.log(`Ã¢Å¡Â  1ÃŠÂ³Ã¡Âµâ€° croix pour ${phone} (alertÃƒÂ©e)`);
      }
      else if (croix === 'xx') {
        // 2Ã¡Âµâ€° croix : bascule en dÃƒÂ©finitive + suppression
        const [nom, prenom, , act1, raison1, act2, raison2] = blData[blRow];
        const finalReason = `${raison1||''} ${raison2||''}`.trim();
        defSheet.appendRow([nom, prenom, phone, finalReason, new Date()]);
        toDelete.push(r+1);  // +1 car `data` est 0-index et on veut 1-index dans sheet
        Logger.log(`Ã¢Å“â€¦ ${phone} ajoutÃƒÂ© ÃƒÂ  Blacklist_dÃƒÂ©finitive, ligne ${r+1} marquÃƒÂ©e pour suppression`);
      }
    }

    // Supprime les lignes marquÃƒÂ©es, en partant du bas
    toDelete.reverse().forEach(r => {
      sheet.deleteRow(r);
      Logger.log(`Ã°Å¸â€”â€˜Ã¯Â¸Â Ligne ${r} supprimÃƒÂ©e de ${sheet.getName()}`);
    });
  });

  Logger.log('Ã¢Å“â€¦ syncBlacklist terminÃƒÂ©');
}

/** 
 * Ã°Å¸â€Â Blacklist annuelle 
 */
function isBlacklisted(phone) {
  const year = getAcademicYear(new Date());
  const sheet = SpreadsheetApp.openById(BLACKLIST_ID).getSheetByName(`Blacklist_${year}`);
  if (!sheet || sheet.getLastRow()<2) return false;
  const list = sheet.getRange(2,3,sheet.getLastRow()-1).getValues().flat()
    .map(p=>normalizePhone(String(p)));
  const ok = list.includes(phone);
  Logger.log(`Ã°Å¸â€Â blacklist annuel ${phone}: ${ok}`);
  return ok;
}

/** 
 * Ã°Å¸â€Â Blacklist dÃƒÂ©finitive 
 */
function isInDefinitiveBlacklist(phone) {
  const ss    = SpreadsheetApp.openById(BLACKLIST_ID);
  const sheet = ss.getSheetByName('Blacklist_dÃƒÂ©finitive');
  if (!sheet || sheet.getLastRow()<2) return false;
  const list = sheet.getRange(2,3,sheet.getLastRow()-1).getValues().flat()
    .map(p=>normalizePhone(String(p)));
  const ok = list.includes(phone);
  Logger.log(`Ã°Å¸â€Â blacklist dÃƒÂ©finitive ${phone}: ${ok}`);
  return ok;
}

/**
 * Ã°Å¸Å¡Â« Barre la ligne et ÃƒÂ©crit NON (raison) dans la colonne Admissible.
 */
function markRejected(sheet, row, reason) {
  Logger.log(`Ã¢ÂÅ’ RejetÃƒÂ© [${reason}] ligne ${row}`);
  sheet.getRange(row, COL.ADMISSIBLE)
       .setValue(`Non (${reason})`)
       .setFontColor('red');
  sheet.getRange(row, 1, 1, sheet.getLastColumn())
       .setFontLine('line-through');
  // Pop-up cliquable
  SpreadsheetApp.getUi().alert(
    `Ã¢Å¡Â  EntrÃƒÂ©e rejetÃƒÂ©e: ${reason}\n` +
    `Voir Blacklist: https://docs.google.com/spreadsheets/d/${BLACKLIST_ID}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Ã°Å¸â€Â Normalise FR / +33 / 0033 / intl
 */
function normalizePhone(raw) {
  let p = raw.trim().replace(/[.\s]/g,'');
  if (p.startsWith('+33')) p = '0'+p.slice(3);
  else if (p.startsWith('0033')) p = '0'+p.slice(4);
  else if (!p.startsWith('0') && /^[1-9]\d{8}$/.test(p)) p = '0'+p;
  Logger.log(`Ã°Å¸â€œÅ¾ normalized: ${p}`);
  return p;
}

/** 
 * Ã°Å¸â€¢â€™ Calcule lÃ¢â‚¬â„¢ÃƒÂ¢ge ÃƒÂ  partir dÃ¢â‚¬â„¢une date. 
 */
function getAge(dob) {
  const now = new Date(), a = now.getFullYear() - dob.getFullYear();
  return now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())? a-1: a;
}

/**
 * Ã°Å¸â€œâ€¦ GÃƒÂ©nÃƒÂ¨re lÃ¢â‚¬â„¢annÃƒÂ©e scolaire Ã¢â‚¬Å“2024_2025Ã¢â‚¬Â ou Ã¢â‚¬Å“2023_2024Ã¢â‚¬Â.
 */
function getAcademicYear(d) {
  const y = d.getFullYear();
  return d.getMonth()>=6? `${y}_${y+1}` : `${y-1}_${y}`;
}