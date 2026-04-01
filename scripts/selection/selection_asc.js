/**************************************************************
 *  ASC Cop1 Ã¢â‚¬â€œ SÃƒÂ©lection ÃƒÂ©quitable                            *
 **************************************************************
 *  1) Exclut :   Ã¢â‚¬â€œ Blacklist annuelle Ã¢â‚¬Å“xxÃ¢â‚¬Â
 *                Ã¢â‚¬â€œ Blacklist_dÃƒÂ©finitive
 *  2) DÃƒÂ©duplique : garde la rÃƒÂ©ponse la PLUS RÃƒâ€°CENTE par nÃ‚Â° tel
 *  3) Priorise   : Ã¢â‚¬Å“non rÃƒÂ©centsÃ¢â‚¬Â (Ã¢â€°Â¥14 j sans sÃƒÂ©lection) puis
 *                  Ã¢â‚¬Å“rÃƒÂ©centsÃ¢â‚¬Â (par anciennetÃƒÂ© de sÃƒÂ©lection)
 *  4) Copie      : onglet Ã‚Â« SÃƒÂ©lection Ã‚Â» (entÃƒÂªte + lignes retenues)
 *  5) Historise  : Date | Nom | PrÃƒÂ©nom | NumÃƒÂ©ro | Nom activitÃƒÂ©
 **************************************************************/

function exclureBlacklistEtSelectionAleatoire() {

  /* ---------- 1. PARAMÃƒË†TRES ---------- */
  const NB_VOULU          = 5;
  const SHEET_FORM        = "RÃƒÂ©ponses au formulaire 1";
  const SHEET_SELECT      = "SÃƒÂ©lection";
  const ID_BL_FILE = "YOUR_BLACKLIST_SHEET_ID";   // Ã¢â€ Â ID ASC/Culture
  const ID_HISTO_FILE = "YOUR_HISTORY_SHEET_ID";
  const SHEET_HISTO       = "Feuille 1";
  const BL_SHEET          = `Blacklist_${academicYear(new Date())}`;

  /* ---------- 2. ENVIRONNEMENT ---------- */
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const form = ss.getSheetByName(SHEET_FORM);
  const sel  = ss.getSheetByName(SHEET_SELECT) || ss.insertSheet(SHEET_SELECT);
  if (!form) throw new Error(`Ã¢ÂÅ’ Feuille Ã‚Â« ${SHEET_FORM} Ã‚Â» introuvable`);

  const blSS = SpreadsheetApp.openById(ID_BL_FILE);
  const blSh = blSS.getSheetByName(BL_SHEET);
  if (!blSh) throw new Error(`Ã¢ÂÅ’ Ã‚Â« ${BL_SHEET} Ã‚Â» introuvable`);

  const hSS  = SpreadsheetApp.openById(ID_HISTO_FILE);
  const hist = hSS.getSheetByName(SHEET_HISTO);
  if (!hist) throw new Error(`Ã¢ÂÅ’ Historique manquant`);

  /* ---------- 3. INDEX COLONNES ---------- */
  const COL = {
  DATE:   0, // A : Horodateur
  NOM:    1, // C : Nom
  PRENOM: 2, // D : PrÃƒÂ©nom
  TEL:    3  // E : TÃƒÂ©lÃƒÂ©phone
};  // (A, D, E, F)
  const BL  = { TEL:2 , CROIX:7 };                  // (C, F)

  /* ---------- 4. CHARGEMENT ---------- */
  if (form.getLastRow() < 2){ Logger.log("Ã¢Å¡Â Ã¯Â¸Â Pas de rÃƒÂ©ponses"); return; }
  const dataForm = form.getRange(2,1,form.getLastRow()-1,
                                 form.getLastColumn()).getValues();

  const dataAnn = blSh.getLastRow() > 1
        ? blSh.getRange(2,1,blSh.getLastRow()-1,blSh.getLastColumn()).getValues() : [];

  const blDefSh = blSS.getSheetByName('Blacklist_dÃƒÂ©finitive');
  const dataDef = blDefSh && blDefSh.getLastRow()>1
        ? blDefSh.getRange(2,3,blDefSh.getLastRow()-1,1).getValues().flat() : [];

  const dataHist = hist.getLastRow()>1
        ? hist.getRange(2,1,hist.getLastRow()-1,5).getValues() : [];

  /* ---------- 5. ENSEMBLES ---------- */
  const blSet = new Set();
  dataAnn.forEach(r=>{
    if ((r[BL.CROIX]||'').toString().toLowerCase().includes('xx'))
      blSet.add(norm(r[BL.TEL]));
  });
  const annXX = blSet.size;
  dataDef.forEach(raw=>blSet.add(norm(raw)));

  const lastSel = {};
  dataHist.forEach(r=>{
    const tel = norm(r[3]), d = new Date(r[0]);
    if (!tel) return;
    if (!lastSel[tel] || d > lastSel[tel]) lastSel[tel] = d;
  });

  /* ---------- 6. DÃƒâ€°DUPLICATION ---------- */
  const latest = {};
  dataForm.forEach(r=>{
    const tel = norm(r[COL.TEL]), d = new Date(r[COL.DATE]);
    if (!tel) return;
    if (!latest[tel] || d > latest[tel].date) latest[tel] = {row:r, date:d};
  });

  /* ---------- 7. FILTRAGE ---------- */
  const D14 = new Date(); D14.setDate(D14.getDate()-14);
  const nonRec = [], recents = [];
  let nbBl = 0;

  Object.values(latest).forEach(o=>{
    const tel = norm(o.row[COL.TEL]);
    if (blSet.has(tel)){ nbBl++; return; }
    if (lastSel[tel] && lastSel[tel] >= D14)
      recents.push({row:o.row, last:lastSel[tel]});
    else nonRec.push(o.row);
  });

  Logger.log(`Ã°Å¸Å¡Â« Blacklist annuelle Ã¢â‚¬Å“xxÃ¢â‚¬Â : ${annXX}`);
  Logger.log(`Ã°Å¸â€œâ€¹ Candidats uniques       : ${Object.keys(latest).length}`);
  Logger.log(`Ã°Å¸â€ºâ€˜ BlacklistÃƒÂ©s candidats    : ${nbBl}`);
  Logger.log(`Ã¢Å“â€Ã¯Â¸Â Non rÃƒÂ©cents ÃƒÂ©ligibles    : ${nonRec.length}`);
  Logger.log(`Ã°Å¸â€¢â€˜ RÃƒÂ©cents (<14 j) ÃƒÂ©ligibles: ${recents.length}`);

  /* ---------- 8. TIRAGE AU SORT ---------- */
  shuffle(nonRec);
  recents.sort((a,b)=>a.last-b.last);
  shuffle(recents);                     // micro alea sur ÃƒÂ©galitÃƒÂ©s

  let final = nonRec.slice(0, NB_VOULU);
  if (final.length < NB_VOULU)
    final = final.concat(recents.map(o=>o.row)
                    .slice(0, NB_VOULU-final.length));

  /* ---------- 9. COPIE Ã‚Â« SÃƒÂ©lection Ã‚Â» ---------- */
  sel.clearContents();
  const head = form.getRange(1,1,1,form.getLastColumn()).getValues();
  sel.getRange(1,1,1,head[0].length).setValues(head);
  if (final.length)
    sel.getRange(2,1,final.length,head[0].length).setValues(final),
    Logger.log(`Ã¢Å“â€¦ ${final.length} sÃƒÂ©lectionnÃƒÂ©Ã‚Â·eÃ‚Â·s`);
  else Logger.log("Ã¢Å¡Â Ã¯Â¸Â Aucun sÃƒÂ©lectionnÃƒÂ©");

  /* ----------10. HISTORIQUE ---------- */
  const now = new Date(), act = ss.getName();
  final.forEach(r=>{
    hist.appendRow([now, r[COL.NOM], r[COL.PRENOM], norm(r[COL.TEL]), act]);
  });
}

/*~~~~ OUTILS COMMUNS ~~~~*/
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}}
function norm(raw){if(!raw)return'';let p=String(raw).replace(/^'/,'').replace(/[\s.\-Ã¢â‚¬â€œÃ¢â‚¬â€]/g,'');if(p.startsWith('+33'))p='0'+p.slice(3);else if(p.startsWith('0033'))p='0'+p.slice(4);else if(/^33\d{9}$/.test(p))p='0'+p.slice(2);else if(/^[1-9]\d{8}$/.test(p))p='0'+p;return p;}
function academicYear(d){const y=d.getFullYear();return d.getMonth()>=6?`${y}_${y+1}`:`${y-1}_${y}`;}
