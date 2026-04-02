/**
 * selection script 
 *
 * 1) Excludes yearly blacklist "xx" + definitive blacklist
 * 2) Deduplicates (keeps the most recent response)
 * 3) Draws nbVoulu participants
 * 4) Copies to "Sélection"
 * 5) Stores the selection in history
 */
function exclureBlacklistEtSelectionAleatoire() {

  /************************************************************
   * (1) PARAMETERS
   ************************************************************/
  var nbVoulu = 5;
  var nomFeuilleReponses = "Réponses au formulaire 1";
  var nomFeuilleSelection = "Sélection";
  var idFichierBlacklist = CONFIG.BLACKLIST_ID;
  var idFichierHistorique = CONFIG.HISTORY_SHEET_ID;
  var nomFeuilleHistorique = "Feuille 1";

  /************************************************************
   * (1.1) Academic year
   ************************************************************/
  var d = new Date();
  var nomFeuilleBlacklist = `Blacklist_${getAcademicYear(d)}`;

  /************************************************************
   * (2) OPEN SHEETS
   ************************************************************/
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reponsesSheet = ss.getSheetByName(nomFeuilleReponses);
  if (!reponsesSheet) throw new Error(`❌ "${nomFeuilleReponses}" introuvable`);

  var selectionSheet = ss.getSheetByName(nomFeuilleSelection)
                       || ss.insertSheet(nomFeuilleSelection);

  var blSS = SpreadsheetApp.openById(idFichierBlacklist);
  var blacklistSheet = blSS.getSheetByName(nomFeuilleBlacklist);
  if (!blacklistSheet) throw new Error(`❌ "${nomFeuilleBlacklist}" introuvable`);

  var histSS = SpreadsheetApp.openById(idFichierHistorique);
  var historiqueSheet = histSS.getSheetByName(nomFeuilleHistorique);
  if (!historiqueSheet) throw new Error(`❌ "${nomFeuilleHistorique}" introuvable`);

  /************************************************************
   * (3) COLUMN INDEXES - 
   ************************************************************/
  var idxDateR = 0;   // A : Horodateur
  var idxPrenomR = 5; // D : Prénom
  var idxNomR = 6;    // E : Nom
  var idxTelR = 7;    // F : Téléphone

  var idxTelBL = 2;   // C
  var idxAnnulBL = 7; // F : Nombre Croix

  /************************************************************
   * (4) LOAD DATA
   ************************************************************/
  var lastRowR = reponsesSheet.getLastRow();
  var lastColR = reponsesSheet.getLastColumn();
  if (lastRowR < 2) {
    Logger.log("⚠️ Aucune réponse");
    return;
  }
  var reponsesData = reponsesSheet.getRange(2, 1, lastRowR - 1, lastColR).getValues();

  var blackData = blacklistSheet.getLastRow() > 1
    ? blacklistSheet.getRange(
        2,
        1,
        blacklistSheet.getLastRow() - 1,
        blacklistSheet.getLastColumn()
      ).getValues()
    : [];

  var defSheet = blSS.getSheetByName('Blacklist_définitive');
  var defData = defSheet && defSheet.getLastRow() > 1
    ? defSheet.getRange(2, 3, defSheet.getLastRow() - 1, 1).getValues().flat()
    : [];

  var historiqueData = historiqueSheet.getLastRow() > 1
    ? historiqueSheet.getRange(2, 1, historiqueSheet.getLastRow() - 1, 5).getValues()
    : [];

  /************************************************************
   * (5) SETS
   ************************************************************/
  // 5.1 Yearly blacklist "xx"
  var blacklistSet = new Set();
  blackData.forEach(function(r) {
    var tel = normalizeTel(r[idxTelBL]);
    var ann = (r[idxAnnulBL] || '').toString().toLowerCase();
    if (ann.indexOf('xx') !== -1 && tel) blacklistSet.add(tel);
  });
  var annualXXCount = blacklistSet.size;

  // 5.2 Definitive blacklist
  defData.forEach(function(rawTel) {
    blacklistSet.add(normalizeTel(rawTel));
  });

  Logger.log(`🚫 Blacklist annuelle (xx) : ${annualXXCount}`);

  /************************************************************
   * (5.3) Selections <14 days
   ************************************************************/
  var recentSet = new Set();
  var lim = new Date();
  lim.setDate(lim.getDate() - 14);

  historiqueData.forEach(function(r) {
    var d = new Date(r[0]);
    var tel = normalizeTel(r[3]);
    if (tel && d >= lim) recentSet.add(tel);
  });

  Logger.log(`⏱️ Sélections <14 j : ${recentSet.size}`);

  /************************************************************
   * (6) DEDUPLICATION
   ************************************************************/
  var latest = {};
  reponsesData.forEach(function(r) {
    var tel = normalizeTel(r[idxTelR]);
    var dt = new Date(r[idxDateR]);
    if (!tel) return;
    if (!latest[tel] || dt > latest[tel].date) {
      latest[tel] = { row: r, date: dt };
    }
  });

  /************************************************************
   * (7) FILTERING + LOGGING
   ************************************************************/
  var totalCandidats = Object.keys(latest).length;
  var ok = [], recents = [], blacklistés = 0;

  Object.values(latest).forEach(function(o) {
    var r = o.row;
    var tel = normalizeTel(r[idxTelR]);
    if (blacklistSet.has(tel)) {
      blacklistés++;
      return;
    }
    if (recentSet.has(tel)) recents.push(r);
    else ok.push(r);
  });

  Logger.log(`📋 Candidats uniques : ${totalCandidats}`);
  Logger.log(`🛑 Blacklistés parmi candidats : ${blacklistés}`);
  Logger.log(`✔️ Non récents : ${ok.length}, 🕑 Récents : ${recents.length}`);

  /************************************************************
   * (8) RANDOM DRAW
   ************************************************************/
  shuffleArray(ok);
  shuffleArray(recents);

  var finalList = ok.slice(0, nbVoulu);
  if (finalList.length < nbVoulu) {
    finalList = finalList.concat(recents.slice(0, nbVoulu - finalList.length));
  }

  /************************************************************
   * (9) COPY TO "SELECTION"
   ************************************************************/
  selectionSheet.clearContents();
  selectionSheet.getRange(1, 1, 1, 4).setValues([["Horodateur", "Prénom", "Nom", "Téléphone"]]);

  if (finalList.length) {
    var shortList = finalList.map(function(r) {
      return [r[idxDateR], r[idxPrenomR], r[idxNomR], r[idxTelR]];
    });
    selectionSheet.getRange(2, 1, shortList.length, 4).setValues(shortList);
    Logger.log(`✅ ${shortList.length} sélectionné(e)s`);
  } else {
    Logger.log("⚠️ Aucun sélectionné");
  }

  /************************************************************
   * (10) HISTORY
   ************************************************************/
  var now = new Date();
  finalList.forEach(function(r) {
    var pren = r[idxPrenomR];
    var nom = r[idxNomR];
    var tel = normalizeTel(r[idxTelR]);
    historiqueSheet.appendRow([now, nom, pren, tel, ss.getName()]);
  });
}

/*-------------- TOOLS --------------*/

// Fisher-Yates shuffle
function shuffleArray(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function normalizeTel(raw) {
  if (!raw) return '';
  let p = String(raw)
    .replace(/^'/, '')
    .replace(/[\s.\-–—]/g, '')
    .trim();

  if (p.startsWith('+33')) return '0' + p.slice(3);
  if (p.startsWith('0033')) return '0' + p.slice(4);
  if (/^33\d{9}$/.test(p)) return '0' + p.slice(2);
  if (/^[67]\d{8}$/.test(p)) return '0' + p; // fixes "695759399" into "0695759399"
  if (/^0\d{9}$/.test(p)) return p;
  return p;
}

/**
 * Academic year "YYYY_YYYY"
 */
function getAcademicYear(d) {
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? `${y}_${y + 1}` : `${y - 1}_${y}`;
}