/************************** IDENTIFIANTS DES FICHIERS **************************/
// ID du classeur Ã‚Â« RÃƒÂ©ponses au formulaire Ã‚Â»
const FORM_RESPONSES_ID = 'YOUR_FORM_RESPONSES_SHEET_ID';
// ID du classeur Blacklist
const BLACKLIST_ID = 'YOUR_BLACKLIST_SHEET_ID';
/*********************************************************************************/

/** 
 * Ãƒâ‚¬ appeler une seule fois pour installer les triggers onOpen & onEdit
 */
function installDashboardTriggers() {
  // Nettoyage des triggers existants Ã‚Â« refreshDashboard Ã‚Â»
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'refreshDashboard')
    .forEach(t => ScriptApp.deleteTrigger(t));
  // onOpen Ã¢â€ â€™ refreshDashboard
  ScriptApp.newTrigger('refreshDashboard')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onOpen()
    .create();
  // onEdit Ã¢â€ â€™ refreshDashboard
  ScriptApp.newTrigger('refreshDashboard')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  Logger.log('Ã¢Å“â€¦ Triggers installÃƒÂ©s pour refreshDashboard');
}

/**
 * Ã°Å¸â€œÅ  Recalcule et met ÃƒÂ  jour la ligne de stats dans Dashboard_<annÃƒÂ©e>
 */
function refreshDashboard() {
  Logger.log('Ã¢â€“Â¶Ã¯Â¸Â refreshDashboard dÃƒÂ©marrÃƒÂ©');

  // 1) Lecture des rÃƒÂ©ponses
  const formSS  = SpreadsheetApp.openById(FORM_RESPONSES_ID);
  const formSh  = formSS.getSheetByName('RÃƒÂ©ponses au formulaire 1');
  const allData = formSh.getDataRange().getValues();
  if (allData.length < 2) {
    Logger.log('Ã¢ÂÂ¹Ã¯Â¸Â Pas de rÃƒÂ©ponses');
    return;
  }
  const header = allData[0];
  const rows   = allData.slice(1);

  // 2) Recherche dynamique des colonnes clÃƒÂ©s
  const idxWS  = header.findIndex(h => /ajoutÃƒÂ©.*whatsapp/i.test(h));
  const idxStu = header.findIndex(h => /ÃƒÂ©tudiant|student/i.test(h));
  const idxLvl = header.findIndex(h => /niveau.*study/i.test(h));
  const idxDOB = header.findIndex(h => /date.*naissance|date of birth/i.test(h));
  Logger.log(`Indices Ã¢â€ â€™ ws:${idxWS}, stu:${idxStu}, lvl:${idxLvl}, dob:${idxDOB}`);
  if ([idxWS, idxStu, idxLvl, idxDOB].some(i => i < 0)) {
    Logger.log('Ã¢ÂÅ’ En-tÃƒÂªtes introuvables, interrompu');
    return;
  }

  // 3) Calcul des mÃƒÂ©triques
  let nbRep = rows.length, nbAd = 0, etuAd = 0, etuCan = 0, nonEtuAd = 0, nonEtuCan = 0;
  let bacCount = {1:0,2:0,3:0,4:0,5:0, '>5':0}, ages = [];
  rows.forEach(r => {
    const wp  = String(r[idxWS]).toUpperCase() === 'X';
    const stu = String(r[idxStu]).toLowerCase().startsWith('o');
    const lvl = (String(r[idxLvl]).match(/\d+/)||[''])[0];
    const dob = new Date(r[idxDOB]);
    const age = isNaN(dob)? NaN : getAge(dob);
    if (!isNaN(age)) ages.push(age);
    if (wp) nbAd++;
    if (stu) { etuCan++; if (wp) etuAd++; }
    else     { nonEtuCan++; if (wp) nonEtuAd++; }
    if (bacCount[lvl] !== undefined) bacCount[lvl]++; 
    else if (parseInt(lvl) > 5) bacCount['>5']++;
  });
  const moyAge = ages.length ? Math.round(ages.reduce((a,b)=>a+b)/ages.length) : '';

  // 4) Lecture Blacklist annuelle
  const year    = getAcademicYear(new Date());
  const blSS    = SpreadsheetApp.openById(BLACKLIST_ID);
  const blSheet = blSS.getSheetByName(`Blacklist_${year}`);
  let nb1 = 0, nb2 = 0;
  if (blSheet) {
    blSheet.getRange(2, 8, blSheet.getLastRow()-1)
      .getValues().flat()
      .forEach(c => {
        const v = String(c).toLowerCase();
        if (v === 'x')   nb1++;
        if (v === 'xx')  nb2++;
      });
  } else {
    Logger.log(`Ã¢Å¡Â Ã¯Â¸Â Blacklist_${year} introuvable`);
  }

  // 5) Ãƒâ€°criture dans Dashboard_<annÃƒÂ©e>
  const dashSh = SpreadsheetApp.getActive().getSheetByName(`Dashboard_${year}`);
  if (!dashSh) {
    SpreadsheetApp.getUi().alert(`Ã¢ÂÅ’ Feuille Dashboard_${year} introuvable`);
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
  Logger.log('Ã¢Å“â€¦ Dashboard mis ÃƒÂ  jour: ' + stats.join(', '));
}

/** 
 * Ã°Å¸â€œâ€  Calcule lÃ¢â‚¬â„¢ÃƒÂ¢ge ÃƒÂ  partir dÃ¢â‚¬â„¢une date.
 */
function getAge(dob) {
  const now = new Date(), base = now.getFullYear() - dob.getFullYear();
  return (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) 
    ? base - 1 
    : base;
}

/** 
 * Ã°Å¸â€œâ€¦ Renvoie lÃ¢â‚¬â„¢annÃƒÂ©e scolaire format Ã¢â‚¬Å“2024_2025Ã¢â‚¬Â.
 */
function getAcademicYear(d) {
  const y = d.getFullYear();
  return (d.getMonth() >= 6) ? `${y}_${y+1}` : `${y-1}_${y}`;
}

/**
 * Ã°Å¸â€œË† Construit les 4 graphiques Ã‚Â« pro Ã‚Â» sur la feuille Dashboard_<annÃƒÂ©e>.
 */
function buildProfessionalCharts() {
  const ss   = SpreadsheetApp.getActive();
  const year = getAcademicYear(new Date());
  const sh   = ss.getSheetByName(`Dashboard_${year}`);
  if (!sh) throw new Error(`Feuille Dashboard_${year} introuvable`);

  // Supprime dÃ¢â‚¬â„¢abord les anciens
  sh.getCharts().forEach(c => sh.removeChart(c));

  // 1) Histogramme groupÃƒÂ© (RÃƒÂ©ponses, Admissions, Blacklists)
  const c1 = sh.newChart()
    .asColumnChart()
    .addRange(sh.getRange('A1:B2'))
    .addRange(sh.getRange('N1:O2'))
    .setOption('title', 'Volume : RÃƒÂ©ponses Ã¢â€”Â Admissions Ã¢â€”Â Blacklists')
    .setOption('hAxis',{title:'Cat.'})
    .setOption('vAxis',{title:'Nbr'})
    .setPosition(4,1,0,0)
    .build();
  sh.insertChart(c1);

  // 2) Donut : rÃƒÂ©partition par niveau dÃ¢â‚¬â„¢ÃƒÂ©tude (CÃ¢â‚¬â€œI)
  const c2 = sh.newChart()
    .asPieChart()
    .addRange(sh.getRange('C1:I2'))
    .setOption('title','Niveaux dÃ¢â‚¬â„¢ÃƒÂ©tude')
    .setOption('pieHole',0.4)
    .setPosition(4,8,0,0)
    .build();
  sh.insertChart(c2);

  // 3) Pie : ÃƒÂ©tudiants vs non-ÃƒÂ©tudiants admis
  sh.getRange('Q1:R1').setValues([['Ãƒâ€°tu admis','Non-ÃƒÂ©tu admis']]);
  sh.getRange('Q2:R2').setValues([[sh.getRange('I2').getValue(), sh.getRange('L2').getValue()]]);
  const c3 = sh.newChart()
    .asPieChart()
    .addRange(sh.getRange('Q1:R2'))
    .setOption('title','Ãƒâ€°tu vs Non-ÃƒÂ©tu admis')
    .setPosition(15,1,0,0)
    .build();
  sh.insertChart(c3);

  // 4) Histogramme dÃ¢â‚¬â„¢ÃƒÂ¢ge en bins de 5 ans
  const formSS = SpreadsheetApp.openById(FORM_RESPONSES_ID);
  const formSh = formSS.getSheetByName('RÃƒÂ©ponses au formulaire 1');
  // on suppose la colonne ÃƒÂ¢ge calculÃƒÂ©e ÃƒÂ  la fin
  const ages = formSh.getRange(2, formSh.getLastColumn(), formSh.getLastRow()-1)
    .getValues().flat()
    .map(d => getAge(new Date(d)))
    .filter(a => !isNaN(a));
  if (ages.length) {
    const bins = buildBins(ages,5);
    sh.getRange('T1:U1').setValues([['Ãƒâ€šge','Effectif']]);
    sh.getRange(2,20,bins.length,2).setValues(bins);
    const c4 = sh.newChart()
      .asHistogramChart()
      .addRange(sh.getRange(`T1:U${bins.length+1}`))
      .setOption('title','Distribution dÃ¢â‚¬â„¢ÃƒÂ¢ge (bin=5)')
      .setPosition(15,8,0,0)
      .build();
    sh.insertChart(c4);
  }
}

/**
 * Ã°Å¸Å¡Â§ Construits des bins pour lÃ¢â‚¬â„¢histogramme.
 */
function buildBins(arr,width) {
  const min = Math.min(...arr), max = Math.max(...arr);
  const n   = Math.ceil((max-min+1)/width);
  const bins = Array.from({length:n},(_,i)=>[min+i*width,0]);
  arr.forEach(v=>{
    const idx = Math.min(n-1, Math.floor((v-min)/width));
    bins[idx][1]++;
  });
  return bins;
}
