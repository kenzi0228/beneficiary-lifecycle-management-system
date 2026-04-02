/**
 * Initializes the full Google Sheets environment for the project.
 *
 * What it creates:
 * - 1 spreadsheet for blacklist management
 * - 1 spreadsheet for beneficiary database
 * - 1 spreadsheet for dashboard
 * - 1 spreadsheet for selection history
 *
 * It also creates the required sheets with the correct names and headers.
 *
 * After execution, copy the logged IDs into CONFIG in config.js.
 */
function initializeProjectEnvironment() {
  const year = getAcademicYear(new Date());

  const blacklistSS = SpreadsheetApp.create(`Blacklist Management ${year}`);
  const benefDbSS = SpreadsheetApp.create(`Beneficiary Database ${year}`);
  const dashboardSS = SpreadsheetApp.create(`Dashboard ${year}`);
  const historySS = SpreadsheetApp.create(`Selection History ${year}`);

  setupBlacklistSpreadsheet(blacklistSS, year);
  setupBeneficiaryDatabaseSpreadsheet(benefDbSS, year);
  setupDashboardSpreadsheet(dashboardSS, year);
  setupHistorySpreadsheet(historySS);

  Logger.log('=== PROJECT ENVIRONMENT CREATED ===');
  Logger.log(`BLACKLIST_ID: ${blacklistSS.getId()}`);
  Logger.log(`BENEF_DB_ID: ${benefDbSS.getId()}`);
  Logger.log(`DASHBOARD_ID: ${dashboardSS.getId()}`);
  Logger.log(`HISTORY_ID: ${historySS.getId()}`);
  Logger.log('Copy these IDs into CONFIG in config.js');
}

/**
 * Sets up the blacklist spreadsheet.
 */
function setupBlacklistSpreadsheet(ss, year) {
  const defaultSheet = ss.getSheets()[0];
  defaultSheet.setName(`Blacklist_${year}`);
  defaultSheet.clear();

  defaultSheet.appendRow([
    'Nom',
    'Prénom',
    'Numéro_Tel',
    'Activité1',
    'Raison1',
    'Activité2',
    'Raison2',
    'Nombre Croix',
    'Retiré du groupe',
    'Ban définitif'
  ]);

  const definitiveSheet = ss.insertSheet('Blacklist_définitive');
  definitiveSheet.appendRow([
    'Nom',
    'Prénom',
    'Numéro_Tel',
    'Raison',
    'Date_Ban'
  ]);
}

/**
 * Sets up the beneficiary database spreadsheet.
 */
function setupBeneficiaryDatabaseSpreadsheet(ss, year) {
  const defaultSheet = ss.getSheets()[0];
  defaultSheet.setName(`BDDbenef_${year}`);
  defaultSheet.clear();

  defaultSheet.appendRow([
    'Numéro_Tel',
    'Nom',
    'Prénom',
    'Date_de_naissance',
    'Étudiant',
    'Blacklist'
  ]);
}

/**
 * Sets up the dashboard spreadsheet.
 */
function setupDashboardSpreadsheet(ss, year) {
  const defaultSheet = ss.getSheets()[0];
  defaultSheet.setName(`Dashboard_${year}`);
  defaultSheet.clear();

  defaultSheet.appendRow([
    'Nb_Réponses',
    'Nb_Admis',
    'Bac+1',
    'Bac+2',
    'Bac+3',
    'Bac+4',
    'Bac+5',
    'Bac+>5',
    'Étudiants_Admis',
    'Étudiants_Candidats',
    'NonÉtudiants_Candidats',
    'NonÉtudiants_Admis',
    'Moyenne_Âge',
    'Blacklist_1_Croix',
    'Blacklist_2_Croix'
  ]);
}

/**
 * Sets up the history spreadsheet.
 */
function setupHistorySpreadsheet(ss) {
  const defaultSheet = ss.getSheets()[0];
  defaultSheet.setName('Feuille 1');
  defaultSheet.clear();

  defaultSheet.appendRow([
    'Date_Selection',
    'Nom',
    'Prénom',
    'Numéro_Tel',
    'Activité'
  ]);
}

/**
 * Creates a test form responses spreadsheet with the expected sheet structure.
 */
function createTestFormResponsesSpreadsheet() {
  const ss = SpreadsheetApp.create('Form Responses TEST');
  const sheet = ss.getSheets()[0];
  sheet.setName('Réponses au formulaire 1');
  sheet.clear();

  sheet.appendRow([
    'Horodateur',
    'Email',
    'Nom',
    'Prénom',
    'Ville',
    'Numéro WhatsApp',
    'Date de naissance',
    'Es-tu encore étudiant ?',
    'Niveau d\'étude',
    'Champ_10',
    'Champ_11',
    'Champ_12',
    'Admissible',
    'Ajouté sur WhatsApp'
  ]);

  Logger.log(`FORM_RESPONSES_ID: ${ss.getId()}`);
  Logger.log('Copy this ID into CONFIG in config.js');
}
/**
 * Returns the academic year string, for example: "2024_2025".
 */
function getAcademicYear(d) {
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? `${y}_${y + 1}` : `${y - 1}_${y}`;
}