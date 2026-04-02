/*************** CONSTANTS & INDEXES ****************/
const BLACKLIST_ID = CONFIG.BLACKLIST_ID; 

// Columns of the yearly sheet "Blacklist_<year>"
const COL = {
  NOM:            1,  // A
  PRENOM:         2,  // B
  PHONE:          3,  // C
  ACTIVITE1:      4,  // D
  RAISON1:        5,  // E
  ACTIVITE2:      6,  // F
  RAISON2:        7,  // G
  NOMBRE_CROIX:   8,  // H
  RETIRE_GRP:     9,  // I (checkbox)
  BAN_DEFINITIF: 10   // J (checkbox) <- watched by onEdit
};

/**
 * Installs the installable onEdit trigger for handleBanDefinitif.
 * Run it manually ONCE.
 */
function installBanTriggers() {
  // Delete previous onEdit triggers
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'handleBanDefinitif')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('handleBanDefinitif')
    .forSpreadsheet(SpreadsheetApp.openById(BLACKLIST_ID))
    .onEdit()
    .create();

  Logger.log('✅ Trigger handleBanDefinitif installé');
}

/**
 * Triggered on every edit in the sheet Blacklist_<year>.
 * If column J (definitive ban) is checked, the row is copied to Blacklist_définitive.
 */
function handleBanDefinitif(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const row   = range.getRow();
  const col   = range.getColumn();
  const val   = e.value;

  Logger.log(`onEdit -> ligne ${row}, col ${col}, val="${val}"`);

  // 1) Only if the edited column is "Ban définitif"
  if (col !== COL.BAN_DEFINITIF) {
    Logger.log('-> Colonne ignorée');
    return;
  }

  // 2) If unchecked, do nothing
  if (!val || String(val).toLowerCase() === 'false') {
    Logger.log('-> Case décochée : on ne fait rien');
    return;
  }

  // 3) Retrieve the full row
  const data = sheet.getRange(row, 1, 1, COL.BAN_DEFINITIF).getValues()[0];
  const [nom, prenom, rawPhone, act1, rai1, act2, rai2, croix] = data;
  const phone = normalizePhone(String(rawPhone));

  Logger.log(`-> Entrée à bannir : ${nom} ${prenom}, ${phone}, croix="${croix}"`);

  // 4) Prepare or create the definitive sheet
  const ss = SpreadsheetApp.openById(BLACKLIST_ID);
  let defSheet = ss.getSheetByName('Blacklist_définitive');

  if (!defSheet) {
    defSheet = ss.insertSheet('Blacklist_définitive');
    defSheet.appendRow(['Nom', 'Prénom', 'Numéro_Tel', 'Raison', 'Date_Ban']);
    Logger.log('-> Création onglet Blacklist_définitive');
  }

  // 5) Build the full reason
  const raison = [rai1, rai2].filter(Boolean).join(' | ') || '—';

  // 6) Append the row to the definitive blacklist
  defSheet.appendRow([nom, prenom, phone, raison, new Date()]);
  Logger.log('-> Ligne ajoutée à Blacklist_définitive');

  // 7) Clickable pop-up
  const ui = SpreadsheetApp.getUi();
  const url = ss.getUrl() + `#gid=${defSheet.getSheetId()}`;
  ui.alert(
    '🚫 Bannissement définitif',
    `La ligne de ${nom} ${prenom} (${phone}) a été copiée dans *Blacklist_définitive*.\n` +
    `-> Ouvrir : ${url}`,
    ui.ButtonSet.OK
  );
}

/**
 * Normalizes a French phone number: FR / +33 / 0033 -> 0XXXXXXXXX
 */
function normalizePhone(raw) {
  let p = raw.trim().replace(/[.\s\u202F]/g, '');
  if (p.startsWith('+33')) p = '0' + p.slice(3);
  if (p.startsWith('0033')) p = '0' + p.slice(4);
  if (/^[1-9]\d{8}$/.test(p)) p = '0' + p;
  return p;
}