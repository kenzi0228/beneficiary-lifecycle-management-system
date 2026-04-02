/*************************** FILE IDENTIFIERS ***************************/
const BLACKLIST_ID = CONFIG.BLACKLIST_ID;
const DASHBOARD_ID = CONFIG.DASHBOARD_ID;
const BENEF_DB_ID = 'YOUR_BENEFICIARY_DB_ID';

/*********************************************************************************/

/*************************** FORM COLUMN INDEXES ***************************/
const COL = {
  PHONE:       6,   // Numéro WhatsApp
  DOB:         7,   // Date de naissance
  STUDENT:     8,   // Es-tu encore étudiant ?
  STUDY_LEVEL: 9,   // Niveau d'étude
  ADMISSIBLE: 13,   // Colonne "Admissible" (à ajuster)
  WHATSAPP:   14    // Colonne "Ajouté sur WhatsApp" (X)
};
/*********************************************************************************/

/**
 * Deletes all installed triggers in the script.
 */
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log(`🧹 Suppression de ${triggers.length} déclencheur(s)`);
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

/**
 * Run ONCE to activate the triggers.
 */
function installTriggers() {
  deleteAllTriggers();

  ScriptApp.newTrigger('handleFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
  Logger.log('✅ Trigger handleFormSubmit');

  ScriptApp.newTrigger('handleEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  Logger.log('✅ Trigger handleEdit');

  ScriptApp.newTrigger('syncBlacklist')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
  Logger.log('✅ Trigger syncBlacklist');

  ScriptApp.newTrigger('duplicateAllAnnualSheets')
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .create();
  Logger.log('✅ Trigger duplicateAllAnnualSheets');
}

/**
 * Duplicates all BDD / Dashboard / Blacklist sheets on July 1st.
 */
function duplicateAllAnnualSheets() {
  const today = new Date();
  Logger.log(`🔄 Vérification date pour duplication annuelle : ${today}`);

  if (today.getMonth() !== 6 || today.getDate() !== 1) {
    Logger.log("⏭️ Pas le 1er juillet, on s'arrête");
    return;
  }

  const year = today.getFullYear();
  const nextYear = `${year}_${year + 1}`;
  Logger.log(`📆 Duplication pour l'année scolaire : ${nextYear}`);

  duplicateBeneficiaryDB(nextYear);
  duplicateBlacklistYearSheet(nextYear);
  duplicateDashboardSheet(nextYear);
}

/**
 * Duplicates the beneficiary database sheet for the new year and clears its contents.
 */
function duplicateBeneficiaryDB(newYear) {
  Logger.log(`📁 duplicateBeneficiaryDB(${newYear})`);
  const ss = SpreadsheetApp.openById(BENEF_DB_ID);
  const sheets = ss.getSheets();
  const last = sheets[sheets.length - 1];
  const headers = last.getRange(1, 1, 1, last.getLastColumn()).getValues();
  const newSheet = last.copyTo(ss).setName(`BDDbenef_${newYear}`);

  newSheet.clearContents();
  newSheet.getRange(1, 1, 1, headers[0].length).setValues(headers);

  Logger.log('✅ Feuille BDD dupliquée et purgée');
}

/**
 * Duplicates the yearly Blacklist sheet for the new year and clears its contents.
 */
function duplicateBlacklistYearSheet(newYear) {
  Logger.log(`🚫 duplicateBlacklistYearSheet(${newYear})`);
  const ss = SpreadsheetApp.openById(BLACKLIST_ID);
  const prev = ss.getSheets().find(s => s.getName().startsWith('Blacklist_'));

  if (!prev) {
    Logger.log('⚠️ Aucune feuille Blacklist_ trouvée');
    return;
  }

  const headers = prev.getRange(1, 1, 1, prev.getLastColumn()).getValues();
  const newSheet = prev.copyTo(ss).setName(`Blacklist_${newYear}`);

  newSheet.clearContents();
  newSheet.getRange(1, 1, 1, headers[0].length).setValues(headers);

  Logger.log('✅ Feuille Blacklist dupliquée et purgée');
}

/**
 * Duplicates the Dashboard sheet for the new year and clears its contents.
 */
function duplicateDashboardSheet(newYear) {
  Logger.log(`📊 duplicateDashboardSheet(${newYear})`);
  const ss = SpreadsheetApp.openById(DASHBOARD_ID);
  const last = ss.getSheets().slice(-1)[0];
  const headers = last.getRange(1, 1, 1, last.getLastColumn()).getValues();
  const newSheet = last.copyTo(ss).setName(`Dashboard_${newYear}`);

  newSheet.clearContents();
  newSheet.getRange(1, 1, 1, headers[0].length).setValues(headers);

  Logger.log('✅ Feuille Dashboard dupliquée et purgée');
}

/**
 * Handles form submission.
 *   0️⃣ Reject if the phone number already exists in form responses.
 *   1️⃣ Reject if the phone number is already registered this year in the BDD.
 *   2️⃣ Reject if present in the definitive blacklist.
 *   3️⃣ Reject if not eligible by age/student status.
 *   4️⃣ Otherwise, add to the BDD and update the dashboard.
 */
function handleFormSubmit(e) {
  const formSS = SpreadsheetApp.getActiveSpreadsheet();
  const formSh = formSS.getSheetByName('Réponses au formulaire 1');
  const row = e.range.getRow();
  const data = formSh.getRange(row, 1, 1, formSh.getLastColumn()).getValues()[0];
  const phone = normalizePhone(String(data[COL.PHONE - 1]));
  const naissance = new Date(data[COL.DOB - 1]);
  const etu = String(data[COL.STUDENT - 1]).trim();
  const age = getAge(naissance);

  Logger.log(`▶️ handleFormSubmit #${row} — phone:${phone}, age:${age}, etu:${etu}`);

  // 0️⃣ Duplicate in responses?
  const allPhones = formSh
    .getRange(2, COL.PHONE, formSh.getLastRow() - 1, 1)
    .getValues()
    .flat()
    .map(p => normalizePhone(String(p)));

  if (allPhones.filter(p => p === phone).length > 1) {
    Logger.log(`⛔ Doublon de réponse détecté: ${phone}`);
    markRejected(formSh, row, 'réponse en double', true);
    return;
  }

  // Locate the BDD for the academic year
  const year = getAcademicYear(new Date());
  const bddSh = SpreadsheetApp.openById(BENEF_DB_ID).getSheetByName(`BDDbenef_${year}`);

  if (!bddSh) {
    Logger.log(`❌ Feuille BDD introuvable: BDDbenef_${year}`);
    return;
  }

  // 1️⃣ Duplicate in this year's BDD?
  const bddPhones = bddSh
    .getRange(2, 1, bddSh.getLastRow() - 1, 1)
    .getValues()
    .flat()
    .map(p => normalizePhone(String(p)));

  if (bddPhones.includes(phone)) {
    Logger.log(`⛔ Num déjà en BDD: ${phone}`);
    markRejected(formSh, row, 'inscrit cette année', true);
    return;
  }

  // 2️⃣ Definitive blacklist?
  if (isInDefinitiveBlacklist(phone)) {
    markRejected(formSh, row, 'Blacklisté définitif', true);
    return;
  }

  // 3️⃣ Eligibility by age/student status
  if (/^ *[oOyY]/.test(etu) && age >= 30) {
    markRejected(formSh, row, 'âge ≥30', true);
    return;
  }
  if (!/^ *[oOyY]/.test(etu) && age >= 26) {
    markRejected(formSh, row, 'non-étudiant ≥26', true);
    return;
  }

  // 4️⃣ Everything is OK -> add and update stats
  bddSh.appendRow([phone, data[2], data[3], naissance, etu, '']);
  Logger.log(`✅ Ajouté en BDD (formSubmit): ${phone}`);
  updateDashboardStats();
}

/**
 * Handles the manually checked "Ajouté sur WhatsApp" box.
 *   0️⃣ Reject if already registered this year (without striking through).
 *   1️⃣ Reject if in the definitive blacklist.
 *   2️⃣ Reject if not eligible by age/student status.
 *   3️⃣ Reject if in the yearly blacklist.
 *   4️⃣ Otherwise, add to the BDD and update the dashboard.
 */
function handleEdit(e) {
  const { range, value } = e;
  const sheet = range.getSheet();
  const row = range.getRow();
  const col = range.getColumn();

  if (col !== COL.WHATSAPP || String(value).toUpperCase().trim() !== 'X') return;

  const data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const phone = normalizePhone(String(data[COL.PHONE - 1]));
  const naissance = new Date(data[COL.DOB - 1]);
  const etu = String(data[COL.STUDENT - 1]).trim();
  const age = getAge(naissance);

  Logger.log(`▶️ handleEdit #${row} — phone:${phone}, age:${age}, etu:${etu}`);

  // BDD for the current year
  const year = getAcademicYear(new Date());
  const bddSh = SpreadsheetApp.openById(BENEF_DB_ID).getSheetByName(`BDDbenef_${year}`);
  if (!bddSh) return;

  // 0️⃣ Duplicate in BDD?
  const bddPhones = bddSh
    .getRange(2, 1, bddSh.getLastRow() - 1, 1)
    .getValues()
    .flat()
    .map(p => normalizePhone(String(p)));

  if (bddPhones.includes(phone)) {
    sheet.getRange(row, COL.ADMISSIBLE)
      .setValue('Non (inscrit cette année)')
      .setFontColor('red');
    return;
  }

  // 1️⃣ Definitive blacklist?
  if (isInDefinitiveBlacklist(phone)) {
    markRejected(sheet, row, 'Blacklisté définitif', true);
    return;
  }

  // 2️⃣ Eligibility by age/student status
  if (/^ *[oOyY]/.test(etu) && age >= 30) {
    markRejected(sheet, row, 'âge ≥30', true);
    return;
  }
  if (!/^ *[oOyY]/.test(etu) && age >= 26) {
    markRejected(sheet, row, 'non-étudiant ≥26', true);
    return;
  }

  // 3️⃣ Yearly blacklist?
  if (isBlacklisted(phone)) {
    markRejected(sheet, row, 'Blacklisté annuel', false);
    return;
  }

  // 4️⃣ Add to BDD + stats
  bddSh.appendRow([phone, data[2], data[3], naissance, etu, '']);
  Logger.log(`✅ Ajouté en BDD (edit): ${phone}`);
  updateDashboardStats();
}

/**
 * Strikes through the row and writes NO (reason) in the Admissible column.
 * @param {Sheet} sheet
 * @param {number} row
 * @param {string} reason
 * @param {boolean} strike if true, strike through the entire row
 */

/**
 * Recalculates and writes stats into the Dashboard.
 */
function updateDashboardStats() {
  Logger.log('📊 updateDashboardStats déclenché');

  const formSS = SpreadsheetApp.getActiveSpreadsheet();
  const formSheet = formSS.getSheetByName('Réponses au formulaire 1');
  const data = formSheet.getDataRange().getValues();

  if (data.length < 2) {
    Logger.log('⏹️ Pas assez de lignes pour stats');
    return;
  }

  const header = data[0];
  const rows = data.slice(1);

  // Flexible search for column indexes:
  const idxWhatsapp = header.findIndex(h => /ajouté.*whatsapp/i.test(h));
  const idxStudent = header.findIndex(h => /étudiant|student/i.test(h));
  const idxLevel = header.findIndex(h => /niveau.*study/i.test(h));
  const idxDOB = header.findIndex(h => /date.*naissance|Date of birth/i.test(h));

  Logger.log(`🔢 Indices (souples) => whatsapp:${idxWhatsapp}, student:${idxStudent}, level:${idxLevel}, dob:${idxDOB}`);

  if ([idxWhatsapp, idxStudent, idxLevel, idxDOB].some(i => i < 0)) {
    Logger.log('❌ Impossible de trouver toutes les colonnes, stats annulées');
    return;
  }

  let nbReponses = rows.length,
      nbAdmis = 0,
      etuAd = 0,
      etuCand = 0,
      nonEtuAd = 0,
      nonEtuCand = 0;

  let bacCount = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '>5': 0 };
  let ages = [];

  rows.forEach(row => {
    const rawWhatsapp = row[idxWhatsapp] || '';
    const rawStudent = row[idxStudent] || '';
    const rawLevel = row[idxLevel] || '';
    const rawDOB = row[idxDOB] || '';

    const whatsapp = String(rawWhatsapp).toUpperCase().trim() === 'X';
    const student = String(rawStudent).toLowerCase().startsWith('o');
    const level = String(rawLevel).replace(/\D/g, '');
    const dob = new Date(rawDOB);
    const age = isNaN(dob) ? NaN : getAge(dob);

    if (!isNaN(age)) ages.push(age);
    if (whatsapp) nbAdmis++;
    if (student) etuCand++; else nonEtuCand++;
    if (whatsapp && student) etuAd++;
    if (whatsapp && !student) nonEtuAd++;

    if (bacCount[level] !== undefined) bacCount[level]++;
    else if (parseInt(level) > 5) bacCount['>5']++;
  });

  const moyenneAge = ages.length
    ? Math.round(ages.reduce((a, b) => a + b) / ages.length)
    : '';

  const stats = [
    nbReponses, nbAdmis,
    bacCount['1'], bacCount['2'], bacCount['3'], bacCount['4'], bacCount['5'], bacCount['>5'],
    etuAd, etuCand, nonEtuCand, nonEtuAd, moyenneAge
  ];

  const year = getAcademicYear(new Date());
  const dashSheet = SpreadsheetApp.openById(DASHBOARD_ID)
    .getSheetByName(`Dashboard_${year}`);

  if (!dashSheet) {
    Logger.log(`❌ Feuille Dashboard_${year} introuvable`);
    return;
  }

  dashSheet.getRange(2, 1, 1, stats.length).setValues([stats]);
  Logger.log('✅ Dashboard mis à jour :', stats);
}

/**
 * Synchronizes the blacklist daily:
 *   - Loops through each BDDbenef_<year> sheet
 *   - For each number present in Blacklist_<year> with 1 strike ("x"),
 *     shows an alert asking the user to fill activity/date/reason
 *   - For each number with 2 strikes ("xx"),
 *     adds the row to Blacklist_définitive and deletes the row from the BDD
 */
function syncBlacklist() {
  Logger.log('▶️ syncBlacklist démarré');

  const blSS = SpreadsheetApp.openById(BLACKLIST_ID);
  const year = getAcademicYear(new Date());
  const blSheet = blSS.getSheetByName(`Blacklist_${year}`);

  if (!blSheet) {
    Logger.log(`❌ Feuille Blacklist_${year} introuvable`);
    return;
  }

  const defSheet = blSS.getSheetByName('Blacklist_définitive')
    || blSS.insertSheet('Blacklist_définitive');

  Logger.log('ℹ️ Blacklist annuelle et définitive prêtes');

  // Retrieve all entries from the yearly blacklist sheet
  const blData = blSheet.getDataRange().getValues();
  if (blData.length < 2) {
    Logger.log('⚠️ Pas de données dans Blacklist annuelle');
    return;
  }

  // Loop through each BDDbenef_<year> sheet in BENEF_DB_ID
  const dbSS = SpreadsheetApp.openById(BENEF_DB_ID);
  dbSS.getSheets().forEach(sheet => {
    if (!sheet.getName().startsWith(`BDDbenef_${year}`)) return;

    Logger.log(`🔎 Traitement de la feuille ${sheet.getName()}`);
    const data = sheet.getDataRange().getValues();
    const toDelete = [];

    // For each row in the BDD
    for (let r = 1; r < data.length; r++) {
      const phone = normalizePhone(String(data[r][COL.PHONE - 1]));

      // Search this number in the yearly blacklist
      const blRow = blData.findIndex((row, i) => i > 0 && normalizePhone(String(row[2])) === phone);
      if (blRow < 1) continue;

      const croix = String(blData[blRow][7]).toLowerCase().trim(); // column H = index 7

      if (croix === 'x') {
        // First strike: simple alert
        SpreadsheetApp.getUi().alert(
          `⚠ Une croix a été posée sur ${phone}.\n` +
          `Merci de renseigner activité/date/raison dans Blacklist_${year}.\n` +
          `Voir : https://docs.google.com/spreadsheets/d/${BLACKLIST_ID}`
        );
        Logger.log(`⚠ 1ʳᵉ croix pour ${phone} (alertée)`);
      } else if (croix === 'xx') {
        // Second strike: move to definitive blacklist + delete
        const [nom, prenom, , act1, raison1, act2, raison2] = blData[blRow];
        const finalReason = `${raison1 || ''} ${raison2 || ''}`.trim();
        defSheet.appendRow([nom, prenom, phone, finalReason, new Date()]);
        toDelete.push(r + 1); // +1 because data is 0-indexed, sheet rows are 1-indexed
        Logger.log(`✅ ${phone} ajouté à Blacklist_définitive, ligne ${r + 1} marquée pour suppression`);
      }
    }

    // Delete marked rows starting from the bottom
    toDelete.reverse().forEach(r => {
      sheet.deleteRow(r);
      Logger.log(`🗑️ Ligne ${r} supprimée de ${sheet.getName()}`);
    });
  });

  Logger.log('✅ syncBlacklist terminé');
}

/** 
 * Checks the yearly blacklist
 */
function isBlacklisted(phone) {
  const year = getAcademicYear(new Date());
  const sheet = SpreadsheetApp.openById(BLACKLIST_ID).getSheetByName(`Blacklist_${year}`);
  if (!sheet || sheet.getLastRow() < 2) return false;

  const list = sheet.getRange(2, 3, sheet.getLastRow() - 1).getValues().flat()
    .map(p => normalizePhone(String(p)));

  const ok = list.includes(phone);
  Logger.log(`🔍 blacklist annuel ${phone}: ${ok}`);
  return ok;
}

/** 
 * Checks the definitive blacklist
 */
function isInDefinitiveBlacklist(phone) {
  const ss = SpreadsheetApp.openById(BLACKLIST_ID);
  const sheet = ss.getSheetByName('Blacklist_définitive');
  if (!sheet || sheet.getLastRow() < 2) return false;

  const list = sheet.getRange(2, 3, sheet.getLastRow() - 1).getValues().flat()
    .map(p => normalizePhone(String(p)));

  const ok = list.includes(phone);
  Logger.log(`🔍 blacklist définitive ${phone}: ${ok}`);
  return ok;
}

/**
 * Strikes through the row and writes NO (reason) in the Admissible column.
 */
function markRejected(sheet, row, reason) {
  Logger.log(`❌ Rejeté [${reason}] ligne ${row}`);
  sheet.getRange(row, COL.ADMISSIBLE)
    .setValue(`Non (${reason})`)
    .setFontColor('red');

  sheet.getRange(row, 1, 1, sheet.getLastColumn())
    .setFontLine('line-through');

  // Clickable pop-up
  SpreadsheetApp.getUi().alert(
    `⚠ Entrée rejetée: ${reason}\n` +
    `Voir Blacklist: https://docs.google.com/spreadsheets/d/${BLACKLIST_ID}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Normalizes FR / +33 / 0033 / intl
 */
function normalizePhone(raw) {
  let p = raw.trim().replace(/[.\s]/g, '');
  if (p.startsWith('+33')) p = '0' + p.slice(3);
  else if (p.startsWith('0033')) p = '0' + p.slice(4);
  else if (!p.startsWith('0') && /^[1-9]\d{8}$/.test(p)) p = '0' + p;

  Logger.log(`📞 normalized: ${p}`);
  return p;
}

/** 
 * Calculates age from a date.
 */
function getAge(dob) {
  const now = new Date(), a = now.getFullYear() - dob.getFullYear();
  return now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? a - 1 : a;
}

/**
 * Generates the academic year "2024_2025" or "2023_2024".
 */
function getAcademicYear(d) {
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? `${y}_${y + 1}` : `${y - 1}_${y}`;
}