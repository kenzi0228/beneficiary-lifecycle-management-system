/**
 * Script FEST1 Cop1 Ã¢â‚¬â€œ SÃƒÂ©lection simplifiÃƒÂ©e pour les bÃƒÂ©nÃƒÂ©voles
 *
 * 1) Filtrer les bÃƒÂ©nÃƒÂ©ficiaires blacklistÃƒÂ©s (annuelle Ã¢â‚¬Å“xxÃ¢â‚¬Â + blacklist dÃƒÂ©finitive)
 * 2) Ãƒâ€°viter les doublons (rÃƒÂ©ponse la plus rÃƒÂ©cente par tÃƒÂ©lÃƒÂ©phone)
 * 3) Tirer nbVoulu participants
 * 4) Copier la liste dans Ã‚Â« SÃƒÂ©lection Ã‚Â»
 * 5) Enregistrer dans lÃ¢â‚¬â„¢historique
 */
function exclureBlacklistEtSelectionAleatoire() {

  /************************************************************
   * (1) PARAMÃƒË†TRES Ã¢â‚¬â€œ MODIFIABLES
   ************************************************************/
  var nbVoulu               = 5;
  var nomFeuilleReponses    = "RÃƒÂ©ponses au formulaire 1";
  var nomFeuilleSelection   = "SÃƒÂ©lection";
  var idFichierBlacklist = "YOUR_BLACKLIST_SHEET_ID";
  var idFichierHistorique = "YOUR_HISTORY_SHEET_ID";
  var nomFeuilleHistorique  = "Feuille 1";

  /************************************************************
   * (1.1) LibellÃƒÂ© de lÃ¢â‚¬â„¢annÃƒÂ©e scolaire
   ************************************************************/
  var d = new Date();
  var nomFeuilleBlacklist = `Blacklist_${getAcademicYear(d)}`;

  /************************************************************
   * (2) OUVERTURE DES CLASSEURS / FEUILLES
   ************************************************************/
  var ss             = SpreadsheetApp.getActiveSpreadsheet();
  var reponsesSheet  = ss.getSheetByName(nomFeuilleReponses);
  if (!reponsesSheet) throw new Error(`Ã¢ÂÅ’ "${nomFeuilleReponses}" introuvable`);

  var selectionSheet = ss.getSheetByName(nomFeuilleSelection)
                      || ss.insertSheet(nomFeuilleSelection);

  var blSS           = SpreadsheetApp.openById(idFichierBlacklist);
  var blacklistSheet = blSS.getSheetByName(nomFeuilleBlacklist);
  if (!blacklistSheet) throw new Error(`Ã¢ÂÅ’ "${nomFeuilleBlacklist}" introuvable`);

  var histSS         = SpreadsheetApp.openById(idFichierHistorique);
  var historiqueSheet= histSS.getSheetByName(nomFeuilleHistorique);
  if (!historiqueSheet) throw new Error(`Ã¢ÂÅ’ "${nomFeuilleHistorique}" introuvable`);

  /************************************************************
   * (3) INDEX DES COLONNES Ã¢â‚¬â€œ SPÃƒâ€°CIFIQUES FEST1
   ************************************************************/
  var idxDateR   = 0; // A : Horodateur
  var idxPrenomR = 2; // C : PrÃƒÂ©nom
  var idxNomR    = 3; // D : Nom
  var idxTelR    = 4; // E : TÃƒÂ©lÃƒÂ©phone WhatsApp

  var idxTelBL   = 2; // C dans la Blacklist
  var idxAnnulBL = 7; // H : Nombre Croix

  /************************************************************
   * (4) CHARGEMENT DES DONNÃƒâ€°ES
   ************************************************************/
  // 4.1 rÃƒÂ©ponses formulaire
  var lastRowResp = reponsesSheet.getLastRow();
  var lastColResp = reponsesSheet.getLastColumn();
  if (lastRowResp < 2) { Logger.log("Ã¢Å¡Â Ã¯Â¸Â Aucune rÃƒÂ©ponse"); return; }
  var reponsesData = reponsesSheet.getRange(2,1,lastRowResp-1,lastColResp).getValues();

  // 4.2 blacklist annuelle
  var blackData = blacklistSheet.getLastRow() > 1
    ? blacklistSheet.getRange(2,1,blacklistSheet.getLastRow()-1, blacklistSheet.getLastColumn()).getValues()
    : [];

  // 4.2 bis blacklist dÃƒÂ©finitive
  var defSheet = blSS.getSheetByName('Blacklist_dÃƒÂ©finitive');
  var defData  = defSheet && defSheet.getLastRow() > 1
    ? defSheet.getRange(2,3,defSheet.getLastRow()-1,1).getValues().flat()
    : [];

  // 4.3 historique
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
  var annualXXCount = blacklistSet.size; // compteur annuel

  // 5.2 Blacklist dÃƒÂ©finitive Ã¢â‚¬â€œ ajout au mÃƒÂªme set
  defData.forEach(function(rawTel){ blacklistSet.add(normalizeTel(rawTel)); });

  Logger.log(`Ã°Å¸Å¡Â« Blacklist annuelle (xx) : ${annualXXCount}`);

  /************************************************************
   * (5.3) SÃƒÂ©lectionnÃƒÂ©s il y a moins de 14 jours
   ************************************************************/
  var recentSet = new Set();
  var lim = new Date(); lim.setDate(lim.getDate() - 14);
  historiqueData.forEach(function(r){
    var d = new Date(r[0]), tel = normalizeTel(r[3]);
    if (tel && d >= lim) recentSet.add(tel);
  });
  Logger.log(`Ã¢ÂÂ±Ã¯Â¸Â SÃƒÂ©lections <14 j : ${recentSet.size}`);

  /************************************************************
   * (6) DÃƒâ€°DUPLICATION Ã¢â‚¬â€œ on garde la rÃƒÂ©ponse la plus rÃƒÂ©cente
   ************************************************************/
  var latest = {};
  reponsesData.forEach(function(r){
    var tel = normalizeTel(r[idxTelR]), dt = new Date(r[idxDateR]);
    if (!tel) return;
    if (!latest[tel] || dt > latest[tel].date) latest[tel] = { row: r, date: dt };
  });

  /************************************************************
   * (7) FILTRAGE FINAL & LOG DÃƒâ€°TAILLÃƒâ€°
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
  if (finalList.length < nbVoulu) {
    finalList = finalList.concat(recents.slice(0, nbVoulu - finalList.length));
  }

  /************************************************************
   * (9) COPIE VERS Ã‚Â« SÃƒÂ©lection Ã‚Â»
   ************************************************************/
  selectionSheet.clearContents();
  var header = reponsesSheet.getRange(1,1,1,lastColResp).getValues();
  selectionSheet.getRange(1,1,1,header[0].length).setValues(header);
  if (finalList.length){
    selectionSheet.getRange(2,1,finalList.length,header[0].length).setValues(finalList);
    Logger.log(`Ã¢Å“â€¦ ${finalList.length} sÃƒÂ©lectionnÃƒÂ©(e)s`);
  } else {
    Logger.log("Ã¢Å¡Â Ã¯Â¸Â Aucun sÃƒÂ©lectionnÃƒÂ©");
  }

  /************************************************************
   * (10) ENREGISTREMENT HISTORIQUE
   ************************************************************/
  var now = new Date();
  finalList.forEach(function(r){
    var nom  = r[idxNomR], pren = r[idxPrenomR], tel = normalizeTel(r[idxTelR]);
    historiqueSheet.appendRow([now, nom, pren, tel, ss.getName()]);
  });
}

/*-------------- OUTILS --------------*/

// mÃƒÂ©lange FisherÃ¢â‚¬â€œYates
function shuffleArray(a){
  for (var i=a.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

// normalisation tÃƒÂ©lÃƒÂ©phone (unifiÃƒÂ©e)
function normalizeTel(raw){
  if(!raw) return '';
  let p = String(raw).replace(/^'/,'').replace(/[\s.\-Ã¢â‚¬â€œÃ¢â‚¬â€]/g,'');
  if (p.startsWith('+33'))       p='0'+p.slice(3);
  else if (p.startsWith('0033')) p='0'+p.slice(4);
  else if (/^33\d{9}$/.test(p))  p='0'+p.slice(2);
  else if (/^[1-9]\d{8}$/.test(p)) p='0'+p;
  return p;
}

/**
 * Ã°Å¸â€œâ€¦ AnnÃƒÂ©e scolaire Ã¢â‚¬Å“2024_2025Ã¢â‚¬Â ou Ã¢â‚¬Å“2023_2024Ã¢â‚¬Â
 */
function getAcademicYear(d){
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? `${y}_${y+1}` : `${y-1}_${y}`;
}
