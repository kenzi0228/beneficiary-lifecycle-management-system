/*************************** ID DU CLASSEUR BLACKLIST ***************************/
const BLACKLIST_ID = 'YOUR_BLACKLIST_SHEET_ID';
/*********************************************************************************/

/************* INDEX DES COLONNES DANS LA FEUILLE BDD BÃƒâ€°NÃƒâ€°FICIAIRES *************/
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
 * Ã¢â€žÂ¹Ã¯Â¸Â Doit ÃƒÂªtre installÃƒÂ© en tant que "DÃƒÂ©clencheur sur modification" (installable)
 */
function handleBDDBlacklist(e) {
  const ui    = SpreadsheetApp.getUi();
  const range = e.range;
  const sheet = range.getSheet();
  const row   = range.getRow();
  const col   = range.getColumn();
  const raw   = (e.value || '').toString().trim().toLowerCase();
  Logger.log(`handleBDDBlacklist Ã¢â€ â€™ ligne ${row}, col ${col}, valeur="${raw}"`);

  // 1) On ne rÃƒÂ©agit que sur la colonne F
  if (col !== COL.BLACKLIST) {
    Logger.log("Colonne ignorÃƒÂ©e");
    return;
  }

  // 2) RÃƒÂ©cupÃƒÂ©ration des donnÃƒÂ©es de la ligne
  const rowData = sheet.getRange(row, 1, 1, COL.BLACKLIST).getValues()[0];
  const phone   = String(rowData[COL.PHONE-1]).trim();
  const nom     = String(rowData[COL.NOM-1]).trim();
  const prenom  = String(rowData[COL.PRENOM-1]).trim();
  Logger.log(`DonnÃƒÂ©es ligne Ã¢â€ â€™ ${phone}, ${nom}, ${prenom}`);

  // 3) PrÃƒÂ©paration de la feuille Blacklist annuelle
  const year  = getAcademicYear(new Date());
  const blSS  = SpreadsheetApp.openById(BLACKLIST_ID);
  let blSheet = blSS.getSheetByName(`Blacklist_${year}`);
  if (!blSheet) {
    blSheet = blSS.insertSheet(`Blacklist_${year}`);
    blSheet.appendRow([
      'Nom','PrÃƒÂ©nom','NumÃƒÂ©ro_Tel',
      'ActivitÃƒÂ©1','Raison1','ActivitÃƒÂ©2','Raison2',
      'Nombre Croix','RetirÃƒÂ© du groupe','Ban dÃƒÂ©finitif'
    ]);
    Logger.log(`CrÃƒÂ©ation de l'onglet Blacklist_${year}`);
  }

  // 4) DÃƒÂ©tection existant en BDD Blacklist_*
  const existingPhones = blSheet.getRange(2,3,blSheet.getLastRow()-1).getValues().flat().map(String);
  const idx = existingPhones.indexOf(phone);
  Logger.log(`Phone ${phone} en Blacklist ? index = ${idx}`);

  // 5) Si tu passes Ã¢â‚¬Å“xxÃ¢â‚¬Â et quÃ¢â‚¬â„¢il nÃ¢â‚¬â„¢existe pas encore => on lÃ¢â‚¬â„¢ajoute quand mÃƒÂªme
  if (raw === 'xx' && idx === -1) {
    Logger.log("DeuxiÃƒÂ¨me croix sur un numÃƒÂ©ro non prÃƒÂ©sent Ã¢â€ â€™ ajout initial");
    // cas de 2e croix mais premiÃƒÂ¨re apparition
    blSheet.appendRow([
      nom, prenom, phone,
      '','','','',
      'xx', false, false
    ]);
    sheet.deleteRow(row);
    Logger.log("Suppression de la ligne BDD bÃƒÂ©nÃƒÂ©ficiaires");
    ui.alert(
      'Ã¢Å¡Â Ã¯Â¸Â 2Ã¡Âµâ€° croix (nouvelle entrÃƒÂ©e)',
      `La personne ${nom} ${prenom} (${phone}) a ÃƒÂ©tÃƒÂ© ajoutÃƒÂ©e ÃƒÂ  la Blacklist_${year} avec 2 croix et supprimÃƒÂ©e de la BDD.\n`+
      `Ã¢â€ â€™ Lien : ${blSS.getUrl()}`,
      ui.ButtonSet.OK
    );
    return;
  }

  // 6) Premier passage : raw==='x' et idx===-1
  if (raw === 'x' && idx === -1) {
    Logger.log("1ÃŠÂ³Ã¡Âµâ€° croix Ã¢â€ â€™ ajout");
    blSheet.appendRow([
      nom, prenom, phone,
      '','','','',
      'x', false, false
    ]);
    ui.alert(
      'Ã¢Å¡Â Ã¯Â¸Â 1ÃŠÂ³Ã¡Âµâ€° croix',
      `La personne ${nom} ${prenom} (${phone}) a ÃƒÂ©tÃƒÂ© ajoutÃƒÂ©e ÃƒÂ  la Blacklist_${year}.\n`+
      `Ã¢â€ â€™ ComplÃƒÂ©tez activitÃƒÂ©/date/raison dans ce fichier :\n${blSS.getUrl()}`,
      ui.ButtonSet.OK
    );
    return;
  }

  // 7) Passage en Ã¢â‚¬Å“xxÃ¢â‚¬Â et idx>=0 Ã¢â€ â€™ mise ÃƒÂ  jour
  if (raw === 'xx' && idx >= 0) {
    Logger.log("2Ã¡Âµâ€° croix Ã¢â€ â€™ mise ÃƒÂ  jour existante");
    const targetRow = idx + 2; // +2 ÃƒÂ  cause de l'en-tÃƒÂªte
    blSheet.getRange(targetRow, 8).setValue('xx');
    sheet.deleteRow(row);
    Logger.log(`Mise ÃƒÂ  jour ligne ${targetRow}, suppression BDD`);
    ui.alert(
      'Ã¢Å¡Â Ã¯Â¸Â 2Ã¡Âµâ€° croix',
      `La personne ${nom} ${prenom} (${phone}) a vu sa croix passÃƒÂ©e ÃƒÂ  Ã¢â‚¬Å“xxÃ¢â‚¬Â dans Blacklist_${year} et a ÃƒÂ©tÃƒÂ© supprimÃƒÂ©e de la BDD.\n`+
      `Ã¢â€ â€™ Lien : ${blSS.getUrl()}`,
      ui.ButtonSet.OK
    );
    return;
  }

  // 8) Tout autre cas
  Logger.log("Valeur ignorÃƒÂ©e ou ÃƒÂ©tat inchangÃƒÂ©");
}
  
/**
 * Ã°Å¸â€œâ€  Retourne lÃ¢â‚¬â„¢annÃƒÂ©e scolaire : ex. "2024_2025"
 */
function getAcademicYear(date) {
  const y = date.getFullYear();
  return date.getMonth() >= 6
    ? `${y}_${y+1}`
    : `${y-1}_${y}`;
}
