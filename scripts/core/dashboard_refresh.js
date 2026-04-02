/************************** FILE IDENTIFIERS **************************/
// ID of the "Form responses" spreadsheet
const FORM_RESPONSES_ID = CONFIG.FORM_RESPONSES_ID;
// ID of the Blacklist spreadsheet
const BLACKLIST_ID = CONFIG.BLACKLIST_ID;
/*********************************************************************************/

/** 
 * Run once to install the onOpen and onEdit triggers
 */
function installDashboardTriggers() {
  // Remove existing "refreshDashboard" triggers
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'refreshDashboard')
    .forEach(t => ScriptApp.deleteTrigger(t));

  // onOpen -> refreshDashboard
  ScriptApp.newTrigger('refreshDashboard')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onOpen()
    .create();

  // onEdit -> refreshDashboard
  ScriptApp.newTrigger('refreshDashboard')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  Logger.log('✅ Triggers installés pour refreshDashboard');
}

/**
 * Recalculates and updates the stats row in Dashboard_<year>
 */
function refreshDashboard() {
  Logger.log('▶️ refreshDashboard démarré');

  // 1) Read responses
  const formSS = SpreadsheetApp.openById(FORM_RESPONSES_ID);
  const formSh = formSS.getSheetByName('Réponses au formulaire 1');
  const allData = formSh.getDataRange().getValues();

  if (allData.length < 2) {
    Logger.log('⏹️ Pas de réponses');
    return;
  }

  const header = allData[0];
  const rows = allData.slice(1);

  // 2) Dynamically search for key columns
  const idxWS = header.findIndex(h => /ajouté.*whatsapp/i.test(h));
  const idxStu = header.findIndex(h => /étudiant|student/i.test(h));
  const idxLvl = header.findIndex(h => /niveau.*study/i.test(h));
  const idxDOB = header.findIndex(h => /date.*naissance|date of birth/i.test(h));

  Logger.log(`Indices -> ws:${idxWS}, stu:${idxStu}, lvl:${idxLvl}, dob:${idxDOB}`);

  if ([idxWS, idxStu, idxLvl, idxDOB].some(i => i < 0)) {
    Logger.log('❌ En-têtes introuvables, interrompu');
    return;
  }

  // 3) Compute metrics
  let nbRep = rows.length;
  let nbAd = 0;
  let etuAd = 0;
  let etuCan = 0;
  let nonEtuAd = 0;
  let nonEtuCan = 0;
  let bacCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '>5': 0 };
  let ages = [];

  rows.forEach(r => {
    const wp = String(r[idxWS]).toUpperCase() === 'X';
    const stu = String(r[idxStu]).toLowerCase().startsWith('o');
    const lvl = (String(r[idxLvl]).match(/\d+/) || [''])[0];
    const dob = new Date(r[idxDOB]);
    const age = isNaN(dob) ? NaN : getAge(dob);

    if (!isNaN(age)) ages.push(age);
    if (wp) nbAd++;

    if (stu) {
      etuCan++;
      if (wp) etuAd++;
    } else {
      nonEtuCan++;
      if (wp) nonEtuAd++;
    }

    if (bacCount[lvl] !== undefined) bacCount[lvl]++;
    else if (parseInt(lvl, 10) > 5) bacCount['>5']++;
  });

  const moyAge = ages.length
    ? Math.round(ages.reduce((a, b) => a + b) / ages.length)
    : '';

  // 4) Read yearly blacklist
  const year = getAcademicYear(new Date());
  const blSS = SpreadsheetApp.openById(BLACKLIST_ID);
  const blSheet = blSS.getSheetByName(`Blacklist_${year}`);
  let nb1 = 0;
  let nb2 = 0;

  if (blSheet) {
    blSheet.getRange(2, 8, blSheet.getLastRow() - 1)
      .getValues()
      .flat()
      .forEach(c => {
        const v = String(c).toLowerCase();
        if (v === 'x') nb1++;
        if (v === 'xx') nb2++;
      });
  } else {
    Logger.log(`⚠️ Blacklist_${year} introuvable`);
  }

  // 5) Write into Dashboard_<year>
  const dashSh = SpreadsheetApp.getActive().getSheetByName(`Dashboard_${year}`);
  if (!dashSh) {
    SpreadsheetApp.getUi().alert(`❌ Feuille Dashboard_${year} introuvable`);
    return;
  }

  const stats = [
    nbRep, nbAd,
    bacCount[1], bacCount[2], bacCount[3],
    bacCount[4], bacCount[5], bacCount['>5'],
    etuAd, etuCan, nonEtuCan, nonEtuAd,
    moyAge, nb1, nb2
  ];

  dashSh.getRange(2, 1, 1, stats.length).setValues([stats]);
  Logger.log('✅ Dashboard mis à jour: ' + stats.join(', '));
}

/** 
 * Calculates age from a date.
 */
function getAge(dob) {
  const now = new Date();
  const base = now.getFullYear() - dob.getFullYear();
  return (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()))
    ? base - 1
    : base;
}

/** 
 * Returns the academic year in the format "2024_2025".
 */
function getAcademicYear(d) {
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? `${y}_${y + 1}` : `${y - 1}_${y}`;
}

/**
 * Builds the 4 "professional" charts on the Dashboard_<year> sheet.
 */
function buildProfessionalCharts() {
  const ss = SpreadsheetApp.getActive();
  const year = getAcademicYear(new Date());
  const sh = ss.getSheetByName(`Dashboard_${year}`);
  if (!sh) throw new Error(`Feuille Dashboard_${year} introuvable`);

  // First remove previous charts
  sh.getCharts().forEach(c => sh.removeChart(c));

  // 1) Grouped column chart (Responses, Admissions, Blacklists)
  const c1 = sh.newChart()
    .asColumnChart()
    .addRange(sh.getRange('A1:B2'))
    .addRange(sh.getRange('N1:O2'))
    .setOption('title', 'Volume : Réponses ● Admissions ● Blacklists')
    .setOption('hAxis', { title: 'Cat.' })
    .setOption('vAxis', { title: 'Nbr' })
    .setPosition(4, 1, 0, 0)
    .build();
  sh.insertChart(c1);

  // 2) Donut chart: distribution by study level (C-I)
  const c2 = sh.newChart()
    .asPieChart()
    .addRange(sh.getRange('C1:I2'))
    .setOption('title', 'Niveaux d’étude')
    .setOption('pieHole', 0.4)
    .setPosition(4, 8, 0, 0)
    .build();
  sh.insertChart(c2);

  // 3) Pie chart: admitted students vs non-students
  sh.getRange('Q1:R1').setValues([['Étu admis', 'Non-étu admis']]);
  sh.getRange('Q2:R2').setValues([[sh.getRange('I2').getValue(), sh.getRange('L2').getValue()]]);
  const c3 = sh.newChart()
    .asPieChart()
    .addRange(sh.getRange('Q1:R2'))
    .setOption('title', 'Étu vs Non-étu admis')
    .setPosition(15, 1, 0, 0)
    .build();
  sh.insertChart(c3);

  // 4) Age histogram with 5-year bins
  const formSS = SpreadsheetApp.openById(FORM_RESPONSES_ID);
  const formSh = formSS.getSheetByName('Réponses au formulaire 1');

  // Assumes the calculated age column is at the end
  const ages = formSh.getRange(2, formSh.getLastColumn(), formSh.getLastRow() - 1)
    .getValues()
    .flat()
    .map(d => getAge(new Date(d)))
    .filter(a => !isNaN(a));

  if (ages.length) {
    const bins = buildBins(ages, 5);
    sh.getRange('T1:U1').setValues([['Âge', 'Effectif']]);
    sh.getRange(2, 20, bins.length, 2).setValues(bins);

    const c4 = sh.newChart()
      .asHistogramChart()
      .addRange(sh.getRange(`T1:U${bins.length + 1}`))
      .setOption('title', 'Distribution d’âge (bin=5)')
      .setPosition(15, 8, 0, 0)
      .build();
    sh.insertChart(c4);
  }
}

/**
 * Builds bins for the histogram.
 */
function buildBins(arr, width) {
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const n = Math.ceil((max - min + 1) / width);
  const bins = Array.from({ length: n }, (_, i) => [min + i * width, 0]);

  arr.forEach(v => {
    const idx = Math.min(n - 1, Math.floor((v - min) / width));
    bins[idx][1]++;
  });

  return bins;
}