/**
 * Populates the whole test environment with fake data.
 *
 * Required in CONFIG:
 * - BLACKLIST_ID
 * - BENEF_DB_ID
 * - DASHBOARD_ID
 * - FORM_RESPONSES_ID
 * - HISTORY_ID
 *
 * Expected sheets:
 * - Blacklist_<year>
 * - Blacklist_définitive
 * - BDDbenef_<year>
 * - Dashboard_<year>
 * - Réponses au formulaire 1
 * - Feuille 1
 */
function seedTestEnvironment() {
  const year = getAcademicYear(new Date());

  seedFormResponses();
  seedBeneficiaryDatabase(year);
  seedBlacklist(year);
  seedDefinitiveBlacklist();
  seedSelectionHistory();
  resetDashboard(year);

  Logger.log('✅ Fake test data inserted successfully.');
}

/**
 * Clears and fills the form responses sheet with fake responses.
 */
function seedFormResponses() {
  const ss = SpreadsheetApp.openById(CONFIG.FORM_RESPONSES_ID);
  const sheet = ss.getSheetByName('Réponses au formulaire 1');
  if (!sheet) throw new Error('Feuille "Réponses au formulaire 1" introuvable');

  sheet.clearContents();

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

  const now = new Date();

  const rows = [
    [daysAgo(now, 10), 'adam@test.com', 'Bensaid', 'Adam', 'Paris', '0611111111', new Date(2004, 4, 12), 'Oui', 'Bac+3', '', '', '', '', ''],
    [daysAgo(now, 9), 'sarah@test.com', 'Meziane', 'Sarah', 'Lyon', '0622222222', new Date(2001, 8, 3), 'Oui', 'Bac+5', '', '', '', '', ''],
    [daysAgo(now, 8), 'yanis@test.com', 'Kaci', 'Yanis', 'Marseille', '0633333333', new Date(1997, 2, 14), 'Non', 'Bac+2', '', '', '', '', ''],
    [daysAgo(now, 7), 'lina@test.com', 'Amrane', 'Lina', 'Lille', '0644444444', new Date(2005, 10, 22), 'Oui', 'Bac+1', '', '', '', '', ''],
    [daysAgo(now, 6), 'nora@test.com', 'Zerrouki', 'Nora', 'Toulouse', '0655555555', new Date(1995, 6, 18), 'Non', 'Bac+4', '', '', '', '', ''],
    [daysAgo(now, 5), 'karim@test.com', 'Dib', 'Karim', 'Nantes', '0666666666', new Date(2003, 0, 9), 'Oui', 'Bac+2', '', '', '', '', ''],
    [daysAgo(now, 4), 'imene@test.com', 'Bouzid', 'Imene', 'Nice', '0677777777', new Date(2002, 3, 1), 'Oui', 'Bac+5', '', '', '', '', ''],
    [daysAgo(now, 3), 'walid@test.com', 'Cherif', 'Walid', 'Paris', '0688888888', new Date(1998, 11, 30), 'Non', 'Bac+3', '', '', '', '', ''],
    [daysAgo(now, 2), 'ines@test.com', 'Rahmani', 'Ines', 'Lyon', '0699999999', new Date(2004, 1, 11), 'Oui', 'Bac+4', '', '', '', '', ''],
    [daysAgo(now, 1), 'samir@test.com', 'Mansouri', 'Samir', 'Grenoble', '0610101010', new Date(2000, 7, 25), 'Oui', 'Bac+1', '', '', '', '', ''],

    // Duplicate phone response
    [daysAgo(now, 0), 'adam2@test.com', 'Bensaid', 'Adam', 'Paris', '0611111111', new Date(2004, 4, 12), 'Oui', 'Bac+3', '', '', '', '', ''],

    // Candidate that will be in definitive blacklist
    [daysAgo(now, 0), 'def@test.com', 'Definitif', 'Cas', 'Paris', '0600000001', new Date(2003, 5, 15), 'Oui', 'Bac+2', '', '', '', '', ''],

    // Candidate that will be in yearly blacklist
    [daysAgo(now, 0), 'year@test.com', 'Annuel', 'Cas', 'Paris', '0600000002', new Date(2003, 5, 15), 'Oui', 'Bac+2', '', '', '', '', ''],

    // Ineligible by age (non-student >= 26)
    [daysAgo(now, 0), 'old1@test.com', 'TropAge', 'NonEtu', 'Paris', '0600000003', new Date(1990, 2, 10), 'Non', 'Bac+3', '', '', '', '', ''],

    // Ineligible by age (student >= 30)
    [daysAgo(now, 0), 'old2@test.com', 'TropAge', 'Etu', 'Paris', '0600000004', new Date(1990, 2, 10), 'Oui', 'Bac+5', '', '', '', '', ''],

    // Candidate already manually added on WhatsApp
    [daysAgo(now, 0), 'whatsapp@test.com', 'Ajoute', 'Manual', 'Paris', '0600000005', new Date(2004, 6, 10), 'Oui', 'Bac+3', '', '', '', '', 'X']
  ];

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * Clears and fills the beneficiary database sheet.
 */
function seedBeneficiaryDatabase(year) {
  const ss = SpreadsheetApp.openById(CONFIG.BENEF_DB_ID);
  const sheet = ss.getSheetByName(`BDDbenef_${year}`);
  if (!sheet) throw new Error(`Feuille "BDDbenef_${year}" introuvable`);

  sheet.clearContents();

  sheet.appendRow([
    'Numéro_Tel',
    'Nom',
    'Prénom',
    'Date_de_naissance',
    'Étudiant',
    'Blacklist'
  ]);

  const rows = [
    ['0622222222', 'Meziane', 'Sarah', new Date(2001, 8, 3), 'Oui', ''],
    ['0677777777', 'Bouzid', 'Imene', new Date(2002, 3, 1), 'Oui', ''],
    ['0600000010', 'TestBDD', 'DejaInscrit', new Date(2004, 5, 5), 'Oui', ''],
    ['0600000011', 'Suivi', 'Actif', new Date(2003, 9, 17), 'Non', '']
  ];

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * Clears and fills the yearly blacklist sheet.
 */
function seedBlacklist(year) {
  const ss = SpreadsheetApp.openById(CONFIG.BLACKLIST_ID);
  const sheet = ss.getSheetByName(`Blacklist_${year}`);
  if (!sheet) throw new Error(`Feuille "Blacklist_${year}" introuvable`);

  sheet.clearContents();

  sheet.appendRow([
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

  const rows = [
    ['Annuel', 'Cas', '0600000002', 'Atelier CV', 'Absence non justifiée', '', '', 'x', false, false],
    ['BlacklistXX', 'Cas', '0600000020', 'Sortie musée', 'Comportement inapproprié', 'Atelier', 'Récidive', 'xx', true, false],
    ['Sanction', 'Test', '0600000021', 'Coaching', 'Retard répété', '', '', 'x', false, false]
  ];

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * Clears and fills the definitive blacklist sheet.
 */
function seedDefinitiveBlacklist() {
  const ss = SpreadsheetApp.openById(CONFIG.BLACKLIST_ID);
  const sheet = ss.getSheetByName('Blacklist_définitive');
  if (!sheet) throw new Error('Feuille "Blacklist_définitive" introuvable');

  sheet.clearContents();

  sheet.appendRow([
    'Nom',
    'Prénom',
    'Numéro_Tel',
    'Raison',
    'Date_Ban'
  ]);

  const rows = [
    ['Definitif', 'Cas', '0600000001', 'Exclusion définitive test', daysAgo(new Date(), 20)],
    ['Historique', 'Ban', '0600000030', 'Violation répétée du règlement', daysAgo(new Date(), 60)]
  ];

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * Clears and fills the history sheet.
 */
function seedSelectionHistory() {
  const ss = SpreadsheetApp.openById(CONFIG.HISTORY_ID);
  const sheet = ss.getSheetByName('Feuille 1');
  if (!sheet) throw new Error('Feuille "Feuille 1" introuvable');

  sheet.clearContents();

  sheet.appendRow([
    'Date_Selection',
    'Nom',
    'Prénom',
    'Numéro_Tel',
    'Activité'
  ]);

  const now = new Date();

  const rows = [
    [daysAgo(now, 3), 'Meziane', 'Sarah', '0622222222', 'Atelier LinkedIn'],
    [daysAgo(now, 5), 'Bouzid', 'Imene', '0677777777', 'Sortie culturelle'],
    [daysAgo(now, 25), 'Bensaid', 'Adam', '0611111111', 'Coaching'],
    [daysAgo(now, 40), 'Rahmani', 'Ines', '0699999999', 'Simulation entretien']
  ];

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * Clears and resets the dashboard sheet.
 */
function resetDashboard(year) {
  const ss = SpreadsheetApp.openById(CONFIG.DASHBOARD_ID);
  const sheet = ss.getSheetByName(`Dashboard_${year}`);
  if (!sheet) throw new Error(`Feuille "Dashboard_${year}" introuvable`);

  sheet.clearContents();

  sheet.appendRow([
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

  sheet.getRange(2, 1, 1, 15).setValues([[
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 0, 0
  ]]);
}

/**
 * Helper function: returns a date N days ago.
 */
function daysAgo(baseDate, nbDays) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - nbDays);
  return d;
}