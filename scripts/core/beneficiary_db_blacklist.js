/*************************** BLACKLIST SPREADSHEET ID ***************************/
const BLACKLIST_ID = CONFIG.BLACKLIST_ID;
/*********************************************************************************/

/************* COLUMN INDEXES IN THE BENEFICIARY DATABASE SHEET *************/
const COL = {
  PHONE:      1, // A
  NOM:        2, // B
  PRENOM:     3, // C
  DOB:        4, // D
  ETUDIANT:   5, // E
  BLACKLIST:  6  // F
};
/*********************************************************************************/

/**
 * Must be installed as an installable "On edit" trigger.
 */
function handleBDDBlacklist(e) {
  const ui    = SpreadsheetApp.getUi();
  const range = e.range;
  const sheet = range.getSheet();
  const row   = range.getRow();
  const col   = range.getColumn();
  const raw   = (e.value || '').toString().trim().toLowerCase();

  Logger.log(`handleBDDBlacklist -> ligne ${row}, col ${col}, valeur="${raw}"`);

  // 1) Only react to column F
  if (col !== COL.BLACKLIST) {
    Logger.log("Colonne ignorée");
    return;
  }

  // 2) Retrieve row data
  const rowData = sheet.getRange(row, 1, 1, COL.BLACKLIST).getValues()[0];
  const phone   = String(rowData[COL.PHONE - 1]).trim();
  const nom     = String(rowData[COL.NOM - 1]).trim();
  const prenom  = String(rowData[COL.PRENOM - 1]).trim();

  Logger.log(`Données ligne -> ${phone}, ${nom}, ${prenom}`);

  // 3) Prepare the yearly blacklist sheet
  const year  = getAcademicYear(new Date());
  const blSS  = SpreadsheetApp.openById(BLACKLIST_ID);
  let blSheet = blSS.getSheetByName(`Blacklist_${year}`);

  if (!blSheet) {
    blSheet = blSS.insertSheet(`Blacklist_${year}`);
    blSheet.appendRow([
      'Nom', 'Prénom', 'Numéro_Tel',
      'Activité1', 'Raison1', 'Activité2', 'Raison2',
      'Nombre Croix', 'Retiré du groupe', 'Ban définitif'
    ]);
    Logger.log(`Création de l'onglet Blacklist_${year}`);
  }

  // 4) Check whether the number already exists in Blacklist_*
  const existingPhones = blSheet
    .getRange(2, 3, blSheet.getLastRow() - 1)
    .getValues()
    .flat()
    .map(String);

  const idx = existingPhones.indexOf(phone);
  Logger.log(`Phone ${phone} en Blacklist ? index = ${idx}`);

  // 5) If value becomes "xx" and does not exist yet, add it anyway
  if (raw === 'xx' && idx === -1) {
    Logger.log("Deuxième croix sur un numéro non présent -> ajout initial");

    // case: second strike but first appearance
    blSheet.appendRow([
      nom, prenom, phone,
      '', '', '', '',
      'xx', false, false
    ]);

    sheet.deleteRow(row);
    Logger.log("Suppression de la ligne BDD bénéficiaires");

    ui.alert(
      '⚠️ 2ᵉ croix (nouvelle entrée)',
      `La personne ${nom} ${prenom} (${phone}) a été ajoutée à la Blacklist_${year} avec 2 croix et supprimée de la BDD.\n` +
      `-> Lien : ${blSS.getUrl()}`,
      ui.ButtonSet.OK
    );
    return;
  }

  // 6) First pass: raw === 'x' and idx === -1
  if (raw === 'x' && idx === -1) {
    Logger.log("1ʳᵉ croix -> ajout");

    blSheet.appendRow([
      nom, prenom, phone,
      '', '', '', '',
      'x', false, false
    ]);

    ui.alert(
      '⚠️ 1ʳᵉ croix',
      `La personne ${nom} ${prenom} (${phone}) a été ajoutée à la Blacklist_${year}.\n` +
      `-> Complétez activité/date/raison dans ce fichier :\n${blSS.getUrl()}`,
      ui.ButtonSet.OK
    );
    return;
  }

  // 7) If value becomes "xx" and already exists, update it
  if (raw === 'xx' && idx >= 0) {
    Logger.log("2ᵉ croix -> mise à jour existante");

    const targetRow = idx + 2; // +2 because of the header row
    blSheet.getRange(targetRow, 8).setValue('xx');
    sheet.deleteRow(row);

    Logger.log(`Mise à jour ligne ${targetRow}, suppression BDD`);

    ui.alert(
      '⚠️ 2ᵉ croix',
      `La personne ${nom} ${prenom} (${phone}) a vu sa croix passée à “xx” dans Blacklist_${year} et a été supprimée de la BDD.\n` +
      `-> Lien : ${blSS.getUrl()}`,
      ui.ButtonSet.OK
    );
    return;
  }

  // 8) Any other case
  Logger.log("Valeur ignorée ou état inchangé");
}

/**
 * Returns the academic year, for example: "2024_2025"
 */
function getAcademicYear(date) {
  const y = date.getFullYear();
  return date.getMonth() >= 6
    ? `${y}_${y + 1}`
    : `${y - 1}_${y}`;
}