/*************************** SÃƒÂ©lection RolandÃ¢â‚¬ÂGarros MultiÃ¢â‚¬Âdate ***************************/

/**
 * 1) ParamÃƒÂ¨tres ÃƒÂ  ajuster pour chaque tirage
 */
function selectionRolandGarros() {
  const nbVoulu             = 10;                  // nombre de places ÃƒÂ  attribuer
  const jourChoisi          = "21";                // jour ÃƒÂ  sÃƒÂ©lectionner (format texte, ex. "21")
  const nomFeuilleReponses  = "RÃƒÂ©ponses au formulaire 1";
  const BLACKLIST_ID = "YOUR_BLACKLIST_SHEET_ID";
  const idFichierHistorique = "YOUR_HISTORY_SHEET_ID";
  const nomFeuilleHistorique= "Feuille 1";

  // 2) Ouverture des classeurs / feuilles
  const ss               = SpreadsheetApp.getActiveSpreadsheet();
  const reponsesSheet    = ss.getSheetByName(nomFeuilleReponses);
  const year             = getAcademicYear(new Date());
  const blacklistSS      = SpreadsheetApp.openById(BLACKLIST_ID);
  const blacklistSheet   = blacklistSS.getSheetByName(`Blacklist_${year}`);
  const historiqueSheet  = SpreadsheetApp.openById(idFichierHistorique)
                                        .getSheetByName(nomFeuilleHistorique);

  if (!reponsesSheet || !blacklistSheet || !historiqueSheet) {
    throw new Error("Ã¢ÂÅ’ Feuille introuvable (rÃƒÂ©ponses, blacklist ou historique).");
  }

  // 3) Lecture des rÃƒÂ©ponses
  const lastRow  = reponsesSheet.getLastRow();
  const lastCol  = reponsesSheet.getLastColumn();
  const data     = reponsesSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  Logger.log(`Ã¢â€“Â¶Ã¯Â¸Â Total rÃƒÂ©ponses : ${data.length}`);

  // 4) Indices des colonnes (0-based dans les arrays)
  const idxJourSouhaite = 3;  // D (4Ã¡Âµâ€° colonne) Ã¢â€ â€™ index 3
  const idxPrenom       = 5;  // F Ã¢â€ â€™ index 5
  const idxNom          = 6;  // G Ã¢â€ â€™ index 6
  const idxTel          = 7;  // H Ã¢â€ â€™ index 7

  // 5) Filtre sur le jour choisi (extrait le jour numÃƒÂ©rique)
  const dataJour = data.filter(row => extraireJour(row[idxJourSouhaite]) === jourChoisi);
  Logger.log(`Ã¢â€“Â¶Ã¯Â¸Â RÃƒÂ©ponses pour le jour ${jourChoisi} : ${dataJour.length}`);

  // 6) Construction du set de blacklist (annulations Ã¢â€°Â¥ Ã¢â‚¬Å“xxÃ¢â‚¬Â)
  const blackData = blacklistSheet
    .getRange(2, 1, blacklistSheet.getLastRow() - 1, blacklistSheet.getLastColumn())
    .getValues();
  const blacklistSet = new Set();
  blackData.forEach(row => {
    const tel         = normalizeTel(row[2]);    // colonne C Ã¢â€ â€™ index 2
    const annulations = (row[5] || "").toString().toLowerCase();
    if (annulations.includes("xx")) {
      blacklistSet.add(tel);
    }
  });
  Logger.log(`Ã¢â€“Â¶Ã¯Â¸Â TÃƒÂ©lÃƒÂ©phones blacklistÃƒÂ©s (xx) : ${blacklistSet.size}`);

  // 7) Recueil des tÃƒÂ©lÃƒÂ©phones dÃƒÂ©jÃƒÂ  sÃƒÂ©lectionnÃƒÂ©s dans dÃ¢â‚¬â„¢autres tirages RG
  const dejaSelSet = new Set();
  ss.getSheets().forEach(sh => {
    if (!sh.getName().startsWith("SÃƒÂ©lection ")) return;
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    rows.forEach(r => {
      dejaSelSet.add(normalizeTel(r[idxTel]));
    });
  });
  Logger.log(`Ã¢â€“Â¶Ã¯Â¸Â DÃƒÂ©jÃƒÂ  sÃƒÂ©lectionnÃƒÂ©s : ${dejaSelSet.size}`);

  // 8) Suppression des doublons garde la plus rÃƒÂ©cente inscription
  const latestMap = {};
  dataJour.forEach(row => {
    const tel     = normalizeTel(row[idxTel]);
    const dateObj = new Date(row[0]);  // A Ã¢â€ â€™ index 0
    if (!tel) return;
    if (!latestMap[tel] || dateObj > latestMap[tel][1]) {
      latestMap[tel] = [row, dateObj];
    }
  });

  // 9) Filtrage final : ni blacklistÃƒÂ©s, ni dÃƒÂ©jÃƒÂ  sÃƒÂ©lectionnÃƒÂ©s
  const candidats = Object.values(latestMap)
    .map(v => v[0])
    .filter(r => {
      const tel = normalizeTel(r[idxTel]);
      return !blacklistSet.has(tel) && !dejaSelSet.has(tel);
    });
  Logger.log(`Ã¢â€“Â¶Ã¯Â¸Â Candidats valides : ${candidats.length}`);

  // 10) Tirage alÃƒÂ©atoire et limitation ÃƒÂ  nbVoulu
  shuffleArray(candidats);
  const finalData = candidats.slice(0, nbVoulu);

  // 11) Ãƒâ€°criture dans la nouvelle feuille "SÃƒÂ©lection <jour>"
  const nomSel = `SÃƒÂ©lection ${jourChoisi}`;
  let selSh    = ss.getSheetByName(nomSel);
  if (!selSh) selSh = ss.insertSheet(nomSel);
  selSh.clearContents();
  // Copie de lÃ¢â‚¬â„¢entÃƒÂªte
  const header = reponsesSheet.getRange(1, 1, 1, lastCol).getValues();
  selSh.getRange(1, 1, 1, header[0].length).setValues(header);
  // Copie des lignes tirÃƒÂ©es
  if (finalData.length) {
    selSh.getRange(2, 1, finalData.length, header[0].length).setValues(finalData);
    Logger.log(`Ã¢Å“â€Ã¯Â¸Â ${finalData.length} sÃƒÂ©lectionnÃƒÂ©s pour le ${jourChoisi}`);
  } else {
    Logger.log(`Ã¢ÂÅ’ Aucun candidat valide pour le ${jourChoisi}`);
    return;
  }

  // 12) Archivage dans lÃ¢â‚¬â„¢historique
  const now = new Date();
  finalData.forEach(r => {
    const nom  = r[idxNom];
    const pre  = r[idxPrenom];
    const tel  = normalizeTel(r[idxTel]);
    historiqueSheet.appendRow([now, nom, pre, tel, `Roland Garros Ã¢â‚¬â€œ ${jourChoisi}`]);
  });
  Logger.log("Ã¢Å“â€¦ Historique mis ÃƒÂ  jour");
}

/**
 * Extrait le jour (1 ou 2 chiffres) depuis nÃ¢â‚¬â„¢importe quel texte
 */
function extraireJour(text) {
  const m = text.toString().match(/\b(\d{1,2})\b/);
  return m ? m[1] : "";
}

/**
 * MÃƒÂ©lange un tableau (FisherÃ¢â‚¬â€œYates)
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Normalisation robuste des numÃƒÂ©ros :
 * - +33Ã¢â‚¬Â¦  Ã¢â€ â€™ 0Ã¢â‚¬Â¦
 * - 0033Ã¢â‚¬Â¦ Ã¢â€ â€™ 0Ã¢â‚¬Â¦
 * - 33Ã¢â‚¬Â¦   Ã¢â€ â€™ 0Ã¢â‚¬Â¦
 * - 9 chiffres FR Ã¢â€ â€™ 0+9chiffres
 * - 10 chiffres FR dÃƒÂ©but 0 Ã¢â€ â€™ inchangÃƒÂ©
 * - Sinon inchangÃƒÂ© (international)
 */
function normalizeTel(raw) {
  let p = (raw||"").toString().trim().replace(/[\s.\-()]/g, "");
  if (p.startsWith('+33'))        p = '0' + p.slice(3);
  else if (p.startsWith('0033'))  p = '0' + p.slice(4);
  else if (/^33\d{9}$/.test(p))    p = '0' + p.slice(2);
  else if (/^[1-9]\d{8}$/.test(p)) p = '0' + p;
  return p;
}

/**
 * Retourne lÃ¢â‚¬â„¢annÃƒÂ©e scolaire Ã‚Â« 2024_2025 Ã‚Â» ou Ã‚Â« 2023_2024 Ã‚Â» selon la date.
 */
function getAcademicYear(d) {
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? `${y}_${y+1}` : `${y-1}_${y}`;
}
