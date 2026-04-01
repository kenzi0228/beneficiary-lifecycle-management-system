/** 
 * Script CULTURE Cop1 Ã¢â‚¬â€œ SÃƒÂ©lection simplifiÃƒÂ©e
 *
 * 1) Exclut blacklist annuelle Ã¢â‚¬Å“xxÃ¢â‚¬Â + blacklist dÃƒÂ©finitive
 * 2) DÃƒÂ©duplique (rÃƒÂ©ponse la plus rÃƒÂ©cente)
 * 3) Tire nbVoulu participants
 * 4) Copie vers Ã‚Â« SÃƒÂ©lection Ã‚Â»
 * 5) Historise la sÃƒÂ©lection
 */
function exclureBlacklistEtSelectionAleatoire() {

  /************************************************************
   * (1) PARAMÃƒË†TRES
   ************************************************************/
  var nbVoulu               = 5;
  var nomFeuilleReponses    = "RÃƒÂ©ponses au formulaire 1";
  var nomFeuilleSelection   = "SÃƒÂ©lection";
  var idFichierBlacklist = "YOUR_BLACKLIST_SHEET_ID";   // Ã¢â€ Â nouvel ID
  var idFichierHistorique = "YOUR_HISTORY_SHEET_ID";
  var nomFeuilleHistorique  = "Feuille 1";

  /************************************************************
   * (1.1) AnnÃƒÂ©e scolaire
   ************************************************************/
  var d = new Date();
  var nomFeuilleBlacklist = `Blacklist_${getAcademicYear(d)}`;

  /************************************************************
   * (2) OUVERTURE DES FEUILLES
   ************************************************************/
  var ss              = SpreadsheetApp.getActiveSpreadsheet();
  var reponsesSheet   = ss.getSheetByName(nomFeuilleReponses);
  if (!reponsesSheet) throw new Error(`Ã¢ÂÅ’ "${nomFeuilleReponses}" introuvable`);

  var selectionSheet  = ss.getSheetByName(nomFeuilleSelection)
                       || ss.insertSheet(nomFeuilleSelection);

  var blSS            = SpreadsheetApp.openById(idFichierBlacklist);
  var blacklistSheet  = blSS.getSheetByName(nomFeuilleBlacklist);
  if (!blacklistSheet) throw new Error(`Ã¢ÂÅ’ "${nomFeuilleBlacklist}" introuvable`);

  var histSS          = SpreadsheetApp.openById(idFichierHistorique);
  var historiqueSheet = histSS.getSheetByName(nomFeuilleHistorique);
  if (!historiqueSheet) throw new Error(`Ã¢ÂÅ’ "${nomFeuilleHistorique}" introuvable`);

  /************************************************************
   * (3) INDEX DES COLONNES Ã¢â‚¬â€œ CULTURE
   ************************************************************/
  var idxDateR   = 0; // A : Horodateur
  var idxPrenomR = 5; // D : PrÃƒÂ©nom
  var idxNomR    = 6; // E : Nom
  var idxTelR    = 7; // F : TÃƒÂ©lÃƒÂ©phone

  var idxTelBL   = 2; // C
  var idxAnnulBL = 7; // F : Nombre Croix

  /************************************************************
   * (4) CHARGEMENT DES DONNÃƒâ€°ES
   ************************************************************/
  var lastRowR = reponsesSheet.getLastRow();
  var lastColR = reponsesSheet.getLastColumn();
  if (lastRowR < 2){ Logger.log("Ã¢Å¡Â Ã¯Â¸Â Aucune rÃƒÂ©ponse"); return; }
  var reponsesData = reponsesSheet.getRange(2,1,lastRowR-1,lastColR).getValues();

  var blackData = blacklistSheet.getLastRow() > 1
    ? blacklistSheet.getRange(2,1,blacklistSheet.getLastRow()-1,
                              blacklistSheet.getLastColumn()).getValues()
    : [];

  var defSheet = blSS.getSheetByName('Blacklist_dÃƒÂ©finitive');
  var defData  = defSheet && defSheet.getLastRow() > 1
    ? defSheet.getRange(2,3,defSheet.getLastRow()-1,1).getValues().flat()
    : [];

  var historiqueData = historiqueSheet.getLastRow() > 1
    ? historiqueSheet.getRange(2,1,historiqueSheet.getLastRow()-1,5).getValues()
    : [];

  /************************************************************
   * (5) ENSEMBLES
   ************************************************************/
  // 5.1 Blacklist annuelle Ã¢â‚¬Å“xxÃ¢â‚¬Â
  var blacklistSet = new Set();
  blackData.forEach(function(r){
    var tel = normalizeTel(r[idxTelBL]);
    var ann = (r[idxAnnulBL]||'').toString().toLowerCase();
    if (ann.indexOf('xx') !== -1 && tel) blacklistSet.add(tel);
  });
  var annualXXCount = blacklistSet.size;

  // 5.2 Blacklist dÃƒÂ©finitive
  defData.forEach(function(rawTel){ blacklistSet.add(normalizeTel(rawTel)); });

  Logger.log(`Ã°Å¸Å¡Â« Blacklist annuelle (xx) : ${annualXXCount}`);

  /************************************************************
   * (5.3) SÃƒÂ©lections <14 j
   ************************************************************/
  var recentSet = new Set();
  var lim = new Date(); lim.setDate(lim.getDate() - 14);
  historiqueData.forEach(function(r){
    var d = new Date(r[0]), tel = normalizeTel(r[3]);
    if (tel && d >= lim) recentSet.add(tel);
  });
  Logger.log(`Ã¢ÂÂ±Ã¯Â¸Â SÃƒÂ©lections <14 j : ${recentSet.size}`);

  /************************************************************
   * (6) DÃƒâ€°DUPLICATION
   ************************************************************/
  var latest = {};
  reponsesData.forEach(function(r){
    var tel = normalizeTel(r[idxTelR]), dt = new Date(r[idxDateR]);
    if (!tel) return;
    if (!latest[tel] || dt > latest[tel].date){
      latest[tel] = { row: r, date: dt };
    }
  });

  /************************************************************
   * (7) FILTRAGE + LOG
   ************************************************************/
  var totalCandidats = Object.keys(latest).length;
  var ok = [], recents = [], blacklistÃƒÂ©s = 0;

  Object.values(latest).forEach(function(o){
    var r = o.row, tel = normalizeTel(r[idxTelR]);
    if (blacklistSet.has(tel)){ blacklistÃƒÂ©s++; return; }
    if (recentSet.has(tel)) recents.push(r);
    else ok.push(r);
  });

  Logger.log(`Ã°Å¸â€œâ€¹ Candidats uniques : ${totalCandidats}`);
  Logger.log(`Ã°Å¸â€ºâ€˜ BlacklistÃƒÂ©s parmi candidats : ${blacklistÃƒÂ©s}`);
  Logger.log(`Ã¢Å“â€Ã¯Â¸Â Non rÃƒÂ©cents : ${ok.length}, Ã°Å¸â€¢â€˜ RÃƒÂ©cents : ${recents.length}`);

  /************************************************************
   * (8) TIRAGE AU SORT
   ************************************************************/
  shuffleArray(ok); shuffleArray(recents);
  var finalList = ok.slice(0, nbVoulu);
  if (finalList.length < nbVoulu){
    finalList = finalList.concat(recents.slice(0, nbVoulu - finalList.length));
  }

  /************************************************************
   * (9) COPIE VERS Ã‚Â« SÃƒÂ©lection Ã‚Â»
   ************************************************************/
  selectionSheet.clearContents();
  selectionSheet.getRange(1,1,1,4).setValues([["Horodateur", "PrÃƒÂ©nom", "Nom", "TÃƒÂ©lÃƒÂ©phone"]]);

  if (finalList.length){
    var shortList = finalList.map(function(r){
      return [r[idxDateR], r[idxPrenomR], r[idxNomR], r[idxTelR]];
    });
    selectionSheet.getRange(2,1,shortList.length,4).setValues(shortList);
    Logger.log(`Ã¢Å“â€¦ ${shortList.length} sÃƒÂ©lectionnÃƒÂ©(e)s`);
  } else {
    Logger.log("Ã¢Å¡Â Ã¯Â¸Â Aucun sÃƒÂ©lectionnÃƒÂ©");
  }

  /************************************************************
   * (10) HISTORIQUE
   ************************************************************/
  var now = new Date();
  finalList.forEach(function(r){
    var pren = r[idxPrenomR], nom = r[idxNomR], tel = normalizeTel(r[idxTelR]);
    historiqueSheet.appendRow([now, nom, pren, tel, ss.getName()]);
  });
}

/*-------------- OUTILS --------------*/

// MÃƒÂ©lange FisherÃ¢â‚¬â€œYates
function shuffleArray(a){
  for (var i=a.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

function normalizeTel(raw) {
  if (!raw) return '';
  let p = String(raw)
    .replace(/^'/, '')
    .replace(/[\s.\-Ã¢â‚¬â€œÃ¢â‚¬â€]/g, '')
    .trim();

  if (p.startsWith('+33')) return '0' + p.slice(3);
  if (p.startsWith('0033')) return '0' + p.slice(4);
  if (/^33\d{9}$/.test(p)) return '0' + p.slice(2);
  if (/^[67]\d{8}$/.test(p)) return '0' + p;       // corrige "695759399" en "0695759399"
  if (/^0\d{9}$/.test(p)) return p;
  return p;
}



/**
 * Ã°Å¸â€œâ€¦ AnnÃƒÂ©e scolaire Ã¢â‚¬Å“YYYY_YYYYÃ¢â‚¬Â
 */
function getAcademicYear(d){
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? `${y}_${y+1}` : `${y-1}_${y}`;
}
