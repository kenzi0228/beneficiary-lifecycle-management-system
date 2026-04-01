/*************** CONSTANTES & INDEX ****************/
// ID du classeur Blacklist (mÃƒÂªme pour annuel et dÃƒÂ©finitive)
const BLACKLIST_ID = 'YOUR_BLACKLIST_SHEET_ID';

// Colonnes de la feuille annuelle Ã‚Â« Blacklist_<annÃƒÂ©e> Ã‚Â»
const COL = {
  NOM:            1,  // A
  PRENOM:         2,  // B
  PHONE:          3,  // C
  ACTIVITE1:      4,  // D
  RAISON1:        5,  // E
  ACTIVITE2:      6,  // F
  RAISON2:        7,  // G
  NOMBRE_CROIX:   8,  // H
  RETIRE_GRP:     9,  // I (case ÃƒÂ  cocher)
  BAN_DEFINITIF: 10   // J (case ÃƒÂ  cocher) Ã¢â€ Â onEdit surveillÃƒÂ©
};

/**
 * Ã°Å¸Å¡Â¨ Installe le dÃƒÂ©clencheur installable onEdit pour handleBanDefinitif
 * Appelle-le UNE FOIS manuellement.
 */
function installBanTriggers() {
  // supprime anciens onEdit
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction()==='handleBanDefinitif')
    .forEach(t=>ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('handleBanDefinitif')
    .forSpreadsheet(SpreadsheetApp.openById(BLACKLIST_ID))
    .onEdit()
    .create();
  Logger.log('Ã¢Å“â€¦ Trigger handleBanDefinitif installÃƒÂ©');
}

/**
 * Ã¢Å“â€¦ DÃƒÂ©clenchÃƒÂ© sur chaque modification de la feuille Blacklist_<annÃƒÂ©e>.
 * Si on coche J (Ban dÃƒÂ©finitif), on copie en Blacklist_dÃƒÂ©finitive.
 */
function handleBanDefinitif(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const row   = range.getRow();
  const col   = range.getColumn();
  const val   = e.value;

  Logger.log(`onEdit Ã¢â€ â€™ ligne ${row}, col ${col}, val="${val}"`);

  // 1) Seulement si modification de la colonne Ã‚Â« Ban dÃƒÂ©finitif Ã‚Â»
  if (col !== COL.BAN_DEFINITIF) {
    Logger.log('Ã¢â€ â€™ Colonne ignorÃƒÂ©e');
    return;
  }
  // 2) Si dÃƒÂ©cochÃƒÂ©, rien ÃƒÂ  faire
  if (!val || String(val).toLowerCase() === 'false') {
    Logger.log('Ã¢â€ â€™ Case dÃƒÂ©cochÃƒÂ©e : on ne fait rien');
    return;
  }

  // 3) RÃƒÂ©cupÃƒÂ©rer la ligne entiÃƒÂ¨re
  const data = sheet.getRange(row, 1, 1, COL.BAN_DEFINITIF).getValues()[0];
  const [ nom, prenom, rawPhone, act1, rai1, act2, rai2, croix ] = data;
  const phone = normalizePhone(String(rawPhone));
  Logger.log(`Ã¢â€ â€™ EntrÃƒÂ©e ÃƒÂ  bannir : ${nom} ${prenom}, ${phone}, croix="${croix}"`);

  // 4) PrÃƒÂ©parer ou crÃƒÂ©er la feuille dÃƒÂ©finitive
  const ss       = SpreadsheetApp.openById(BLACKLIST_ID);
  let defSheet   = ss.getSheetByName('Blacklist_dÃƒÂ©finitive');
  if (!defSheet) {
    defSheet = ss.insertSheet('Blacklist_dÃƒÂ©finitive');
    defSheet.appendRow(['Nom','PrÃƒÂ©nom','NumÃƒÂ©ro_Tel','Raison','Date_Ban']);
    Logger.log('Ã¢â€ â€™ CrÃƒÂ©ation onglet Blacklist_dÃƒÂ©finitive');
  }

  // 5) Composition de la raison complÃƒÂ¨te
  const raison = [rai1, rai2].filter(Boolean).join(' | ') || 'Ã¢â‚¬â€';

  // 6) Append ligne dans dÃƒÂ©finitive
  defSheet.appendRow([nom, prenom, phone, raison, new Date()]);
  Logger.log('Ã¢â€ â€™ Ligne ajoutÃƒÂ©e ÃƒÂ  Blacklist_dÃƒÂ©finitive');

  // 7) Pop-up cliquable
  const ui    = SpreadsheetApp.getUi();
  const url   = ss.getUrl() + `#gid=${defSheet.getSheetId()}`;
  ui.alert(
    'Ã°Å¸Å¡Â« Bannissement dÃƒÂ©finitif',
    `La ligne de ${nom} ${prenom} (${phone}) a ÃƒÂ©tÃƒÂ© copiÃƒÂ©e dans *Blacklist_dÃƒÂ©finitive*.\n` +
    `Ã¢â€ â€™ Ouvrir : ${url}`,
    ui.ButtonSet.OK
  );
}

/**
 * Ã°Å¸â€Â Normalise un numÃƒÂ©ro FR / +33 / 0033 Ã¢â€ â€™ 0XXXXXXXXX
 */
function normalizePhone(raw) {
  let p = raw.trim().replace(/[.\s\u202F]/g,'');
  if (p.startsWith('+33')) p = '0'+p.slice(3);
  if (p.startsWith('0033')) p = '0'+p.slice(4);
  if (/^[1-9]\d{8}$/.test(p)) p = '0'+p;
  return p;
}
