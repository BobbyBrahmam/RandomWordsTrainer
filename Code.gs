const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1a3B_Lxd0ew2Pyy_5lZYF9MqOw5gnqUZk9MXAPHRzjks/edit";

/* =========================
   GET USERS
========================= */
function doGet(e) {

  const action = e.parameter.action;
  let response;

  /* ===== GET SESSION WORDS ===== */

  if (action === "getSessionWords") {

    const userId = e.parameter.user_id;

    response = {
      words: getSessionWords(userId)
    };

  }

  else if (action === "getUserProgress") {

    const result = getUserProgress(e.parameter.user_id);

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  }

  else if (action === "getUserDashboard") {
    return getUserDashboard(e.parameter.user_id);
  }

  else if (action === "getUserInsights") {
    return getUserInsights(e.parameter.user_id);
  }

  else {

    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    const sheet = ss.getSheetByName('Users');

    const rows = sheet.getDataRange().getValues();
    const dataArray = [];

    for (let i = 1; i < rows.length; i++) {

      const r = rows[i];

      dataArray.push({
        id: r[0],
        email: r[1],
        password: r[2],
        role: r[3],
        signed_in_date: r[4],
        last_loggedIn_date: r[5]
      });

    }

    response = { user: dataArray };
  }

  /* ===== JSONP SUPPORT ===== */

  const callback = e.parameter.callback;

  if (callback) {

    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(response) + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);

  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function testFetch() {
  UrlFetchApp.fetch("https://www.google.com");
}

/* =========================
   POST HANDLER
========================= */
function doPost(e) {

  if (!e.postData || !e.postData.contents) {
    return buildResponse({ success: false, error: "No post data" });
  }

  let data;


  try {

    // Case 1: JSON request
    data = JSON.parse(e.postData.contents);

  } catch (err) {

    // Case 2: form request (URLSearchParams)
    data = e.parameter;

  }

  const action = data.action || e.parameter.action;

  if (!action) {
    return buildResponse({ success: false, error: "No action provided" });
  }

  if (action === "register") {
    return buildResponse(registerUser(data));
  }

  if (action === "login") {
    return buildResponse(loginUser(data));
  }

  if (action === "evaluateAnswer") {
    return buildResponse(evaluateAnswer(data));
  }

  if (data.action === "endSession") {

    processSession(data);
    return buildResponse({ success: true });

  }

  return buildResponse({ success: false, error: "Unknown action" });
}


function getEffectiveLevelLimits() {

  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  const sheet = ss.getSheetByName("VocabStats");

  const limits = {};

  for (let i = 2; i <= 6; i++) {

    const level = sheet.getRange("A" + i).getValue();
    const totalWords = sheet.getRange("B" + i).getValue();
    const levelLimit = sheet.getRange("C" + i).getValue();

    // Use actual total if words are less than limit
    limits[level] = Math.min(levelLimit, totalWords);
  }

  return limits;
}

function doOptions(e) {
  return buildResponse({});
}

function buildResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

function evaluateAnswer(data) {

  try {

    const API_KEY = PropertiesService
      .getScriptProperties()
      .getProperty("GEMINI_API_KEY");

    if (!API_KEY) {
      return { success: false, error: "API Key missing" };
    }

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      API_KEY;

    const prompt = buildEvaluationPrompt(data.words, data.answer);

    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);

    const raw = response.getContentText();

    if (response.getResponseCode() !== 200) {
      return { success: false, error: raw };
    }

    const result = JSON.parse(raw);

    if (!result.candidates ||
      !result.candidates[0] ||
      !result.candidates[0].content ||
      !result.candidates[0].content.parts) {

      return { success: false, error: raw };
    }

    const aiText = result.candidates[0].content.parts[0].text;

    const jsonMatch = aiText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return { success: false, error: "AI did not return JSON" };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      result: parsed
    };

  } catch (err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}


/* =========================
   REGISTER USER
========================= */
function registerUser(data) {

  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  const sheet = ss.getSheetByName("Users");

  const rows = sheet.getDataRange().getValues();

  // 🔥 Check if username OR email already exists
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id || rows[i][1] === data.email) {
      return { success: false, message: "User already exists" };
    }
  }

  sheet.appendRow([
    data.id,
    data.email,
    data.password,
    "User",
    new Date(),
    "",
    1
  ]);
  return { success: true };
}

function loginUser(data) {

  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  const sheet = ss.getSheetByName("Users");

  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {

    const userId = String(rows[i][0]).toLowerCase();
    const email = String(rows[i][1]).toLowerCase();
    const password = rows[i][2];

    if ((userId === data.user.toLowerCase() || email === data.user.toLowerCase()) && password === data.password) {

      // update last login
      sheet.getRange(i + 1, 6).setValue(new Date());

      return {
        success: true,
        user: {
          id: userId,
          email: email,
          role: rows[i][3]
        }
      };
    }
  }

  return {
    success: false,
    message: "Invalid credentials"
  };
}

/* =========================
   UPDATE USER LEVEL
========================= */
function updateUserLevel(userId) {

  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);

  const accuracySheet = ss.getSheetByName("WordAccuracy");
  const usersSheet = ss.getSheetByName("Users");

  const rows = accuracySheet.getDataRange().getValues();

  let masteredWords = 0;

  // ✅ Step 1: Calculate mastered words (UNCHANGED)
  for (let i = 1; i < rows.length; i++) {

    const uid = rows[i][0];
    const usage = rows[i][2];
    const avg = rows[i][3];

    if (uid !== userId) continue;

    if (usage >= 3 && avg >= 85) {
      masteredWords++;
    }
  }

  // ✅ Step 2: Fetch dynamic level limits
  const limits = getEffectiveLevelLimits();

  // Build cumulative thresholds
  const level1 = limits[1];
  const level2 = level1 + limits[2];
  const level3 = level2 + limits[3];
  const level4 = level3 + limits[4];
  const level5 = level4 + limits[5];

  let newLevel = 1;

  // ✅ Step 3: Dynamic level calculation
  if (masteredWords >= level4) newLevel = 5;
  else if (masteredWords >= level3) newLevel = 4;
  else if (masteredWords >= level2) newLevel = 3;
  else if (masteredWords >= level1) newLevel = 2;

  // ✅ Step 4: Update Users sheet (UNCHANGED)
  const users = usersSheet.getDataRange().getValues();

  for (let i = 1; i < users.length; i++) {

    if (users[i][0] === userId) {

      const currentLevel = users[i][6] || 1;

      if (newLevel !== currentLevel) {

        usersSheet.getRange(i + 1, 7).setValue(newLevel);

        Logger.log("User promoted to level " + newLevel);

      }

      break;
    }
  }
}

/* =========================
   PROCESS SESSION
========================= */
function processSession(data) {

  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);

  //const usersSheet = ss.getSheetByName("Users");
  const wordSheet = ss.getSheetByName("WordAccuracy");
  const sessionSheet = ss.getSheetByName("SessionHistory");

  const userId = data.user_id;
  const sessionId = data.session_id;

  const sessionAccuracy = Number(data.session_accuracy) || 0;
  const wordsAttempted = Number(data.words_attempted) || 0;

  sessionSheet.appendRow([
    userId,
    sessionId,
    new Date(),
    sessionAccuracy,
    wordsAttempted
  ]);

  //updateUserOverallAccuracy(usersSheet, userId, sessionAccuracy);

  /* ---------- WORD ACCURACY UPDATE ---------- */

  const results = data.ai_results || [];

  let wordScores = [];

  results.forEach(r => {

    if (!r.words) return;

    Object.keys(r.words).forEach(w => {

      wordScores.push({
        word: w,
        accuracy: r.words[w]
      });

    });

  });

  updateWordAccuracy(wordSheet, userId, wordScores);

  /* ---------- UPDATE USER LEVEL ---------- */

  updateUserLevel(userId);
}


/* =========================
   UPDATE WORD ACCURACY
========================= */
function updateWordAccuracy(sheet, userId, words) {

  const rows = sheet.getDataRange().getValues();

  words.forEach(wordObj => {

    const word = wordObj.word;
    const accuracy = Number(wordObj.accuracy);

    let found = false;

    for (let i = 1; i < rows.length; i++) {

      const sheetUser = String(rows[i][0]).trim();
      const sheetWord = String(rows[i][1]).trim().toLowerCase();

      const currentUser = String(userId).trim();
      const currentWord = String(word).trim().toLowerCase();

      if (sheetUser === currentUser && sheetWord === currentWord) {
        const usage = Number(rows[i][2]) || 0;
        const avg = Number(rows[i][3]) || 0;

        const newUsage = usage + 1;
        const newAvg = Math.round(((avg * usage) + accuracy) / newUsage);

        sheet.getRange(i + 1, 3).setValue(newUsage);
        sheet.getRange(i + 1, 4).setValue(newAvg);
        sheet.getRange(i + 1, 5).setValue(new Date());

        // 🔹 SPACED REPETITION LOGIC
        let interval;

        if (accuracy >= 90) interval = 30;
        else if (accuracy >= 80) interval = 14;
        else if (accuracy >= 70) interval = 7;
        else if (accuracy >= 50) interval = 3;
        else interval = 1;

        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + interval);

        // Column 6 = next_review
        sheet.getRange(i + 1, 6).setValue(nextReview);

        found = true;
        break;
      }
    }

    if (!found) {

      let interval;

      if (accuracy >= 90) interval = 30;
      else if (accuracy >= 80) interval = 14;
      else if (accuracy >= 70) interval = 7;
      else if (accuracy >= 50) interval = 3;
      else interval = 1;

      const now = new Date();

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      sheet.appendRow([
        userId,
        word,
        1,
        accuracy,
        now,
        nextReview
      ]);
    }

  });
}


function evaluateWithGemini(promptText) {

  const API_KEY = PropertiesService
    .getScriptProperties()
    .getProperty("GEMINI_API_KEY");

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    API_KEY;

  const payload = {
    contents: [
      {
        parts: [{ text: promptText }]
      }
    ]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  return json.candidates[0].content.parts[0].text;
}

function buildEvaluationPrompt(words, userAnswer) {

  let wordList = words.map((w, i) => {
    if (typeof w === "string") {
      return `${i + 1}. ${w}`;
    }
    return `${i + 1}. ${w.word}`;
  }).join("\n");

  return `You are a strict English vocabulary usage evaluator.

Given Vocabulary Words:
${wordList}

User Response:
"${userAnswer}"

Evaluation Goal:
Evaluate how accurately the user used each vocabulary word in context and meaning.

IMPORTANT PRINCIPLE:
Scores must depend ONLY on whether the vocabulary word is used with the correct meaning in context.

Grammar mistakes must NOT reduce the score if the meaning is clearly correct.

Grammar feedback should be provided only as suggestions for improvement and must NOT affect any score.

Allowed Response Formats:
The user response may be:
- one paragraph
- multiple sentences
- OR one separate sentence per word

All formats are acceptable.

------------------------------------------------

STEP 1 — Sentence Extraction

For each vocabulary word:

1. Locate the sentence that contains the word.
2. If the word appears multiple times, choose the clearest sentence.
3. Evaluate ONLY that sentence for scoring.

Do NOT evaluate the entire paragraph when scoring individual words.

------------------------------------------------

STEP 2 — Word Presence Check

If the word does NOT appear in the response → score = 0.

Accept reasonable variations such as:

- plural forms
- verb tense variations
- adjective/adverb forms

Examples:

pragmatic → pragmatically  
tenable → tenability  
justify → justified  

------------------------------------------------

STEP 3 — Word Usage Evaluation

Use the extracted sentence and determine whether the word meaning is correct.

Use this scoring guide:

95–100  
Meaning is perfectly correct and usage sounds natural.

85–94  
Meaning is correct but sentence may be slightly awkward.

70–84  
Meaning is mostly correct but context feels somewhat forced.

40–69  
Meaning is questionable or partially incorrect.

1–39  
Word appears but meaning is clearly incorrect.

0  
Word is missing.

IMPORTANT RULES:

Grammar mistakes must NOT lower the score if the meaning is clearly correct.

Do NOT penalize the user for minor stylistic awkwardness.

If the meaning is clearly correct, scores should normally fall between 85–100.

Reduce scores ONLY if:

- the meaning is incorrect
- the word is used in an unnatural semantic context
- the sentence changes the meaning of the word

------------------------------------------------

STEP 4 — Contextual Accuracy

Evaluate overall contextual correctness (0–100).

Contextual correctness measures:

- whether the words are used with correct meanings
- whether the sentences logically express the intended idea

Grammar mistakes must NOT reduce contextual accuracy.

------------------------------------------------

STEP 5 — Grammar Accuracy

Evaluate grammar accuracy (0–100) ONLY for informational feedback.

Grammar accuracy may consider:

- sentence structure
- article usage
- prepositions
- verb agreement
- punctuation

Grammar accuracy must NOT affect word scores or contextual accuracy.

------------------------------------------------

STEP 6 — Corrections

Provide corrections and improvements.

For sentences with grammar issues:

- show the original sentence
- show an improved version
- briefly explain the improvement

Example format:

Original: Many people expostulated with the argument of AI being the reason for dip in recruitments.

Improved: Many people expostulated against the argument that AI is the reason for the dip in recruitments.

Suggestion: The verb "expostulate" normally takes the preposition "against".

------------------------------------------------

STEP 7 — Consistency Rule

Ensure scoring is stable and consistent across evaluations.

If the same sentence is evaluated multiple times, the score should remain approximately the same.

Avoid unnecessary randomness.

Follow the scoring rubric strictly.

------------------------------------------------

Return ONLY valid JSON in this format:

{
  "words": {
    "word1": 90,
    "word2": 88
  },
  "grammar_accuracy": 72,
  "overall_context_accuracy": 93,
  "suggested_correction": []
}

Strict Rules:

- Scores must depend only on meaning and contextual usage.
- Grammar errors must NOT reduce word scores.
- Grammar suggestions should still be provided.
- Follow the scoring rubric strictly.
- Return ONLY JSON.
- Do NOT include explanations outside JSON.
- Do NOT include markdown.
- Do NOT include additional commentary.`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function getSessionWords(userId) {

  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);

  const vocabSheet = ss.getSheetByName("VocabSheet");
  const accuracySheet = ss.getSheetByName("WordAccuracy");
  const userSheet = ss.getSheetByName("Users");

  /* ---------------------------
     Get User Level
  ----------------------------*/

  const userRows = userSheet.getDataRange().getValues();

  let userLevel = 1;

  for (let i = 1; i < userRows.length; i++) {

    if (userRows[i][0] === userId) {

      userLevel = userRows[i][6] || 1; // Column G = learning_level
      break;

    }

  }

  /* ---------------------------
     Load Vocabulary
     B = Word
     C = Meaning
     J = Level
     K = Frequency
  ----------------------------*/

  const vocab = vocabSheet
    .getRange(2, 2, vocabSheet.getLastRow() - 1, 10)
    .getValues()
    .map(r => ({
      word: r[0],
      meaning: r[1],
      level: r[8] || 1,
      frequency: r[9] || 0
    }));

    const vocabMap = {};
      vocab.forEach(v => {
      vocabMap[v.word] = v;
    });

  /* ---------------------------
     Read WordAccuracy
  ----------------------------*/

  const accRows = accuracySheet.getDataRange().getValues();

  const today = new Date();

  const reviewWords = [];
  const weakWords = [];
  const knownWords = new Set();

  for (let i = 1; i < accRows.length; i++) {

    const uid = accRows[i][0];
    const word = accRows[i][1];
    const avg = accRows[i][3];
    const nextReview = accRows[i][5];

    if (uid !== userId) continue;

    knownWords.add(word);

if (nextReview && new Date(nextReview) <= today) {
  if (vocabMap[word]) reviewWords.push(vocabMap[word]);
} else if (avg < 70) {
  if (vocabMap[word]) weakWords.push(vocabMap[word]);
}

  }

  /* ---------------------------
     Select NEW words
     Filter by level
  ----------------------------*/

  let newWords = vocab.filter(obj =>
    !knownWords.has(obj.word) && obj.level <= userLevel
  );

  /* ---------------------------
     Prioritize by frequency
  ----------------------------*/

  newWords.sort((a, b) => b.frequency - a.frequency);

  /* ---------------------------
     Shuffle review & weak
  ----------------------------*/

  shuffle(reviewWords);
  shuffle(weakWords);

  let sessionWords = [];
  let used = new Set();

  function addWords(list, limit) {

    for (let w of list) {

      if (!used.has(w.word)) {

        sessionWords.push(w);
        used.add(w.word);

      }

      if (sessionWords.length >= limit) break;

    }

  }



  /* ---------------------------
   Fill Session
  ----------------------------*/

/* ---------------------------
   Helper Functions
----------------------------*/

function pickFromList(list, level = null) {
  for (let w of list) {
    if (!used.has(w.word) && (!level || w.level == level)) {
      used.add(w.word);
      return w;
    }
  }
  return null;
}

function pickRandomFromVocab(level = null) {
  let pool = vocab.filter(v =>
    !used.has(v.word) && (!level || v.level == level)
  );
  shuffle(pool);
  if (pool.length > 0) {
    used.add(pool[0].word);
    return pool[0];
  }
  return null;
}

/* =========================
   ROUND 1 — Mixed Levels
========================= */

for (let i = 0; i < 5; i++) {
  let word =
    pickFromList(reviewWords) ||
    pickFromList(weakWords) ||
    pickFromList(newWords) ||
    pickRandomFromVocab();

  if (word) sessionWords.push(word);
}

/* If less than 5 words (userLevel < 5), fill remaining */
while (sessionWords.length < 5) {
  let w = pickRandomFromVocab();
  if (!w) break;
  sessionWords.push(w);
}

/* =========================
   ROUND 2 — Weak Words
========================= */

for (let i = 0; i < 5; i++) {
  let word =
    pickFromList(weakWords) ||
    pickFromList(reviewWords) ||
    pickRandomFromVocab();
  if (word) sessionWords.push(word);
}

/* =========================
   ROUND 3 — New + Review
========================= */

// 2 New Words
for (let i = 0; i < 2; i++) {
  let word = pickFromList(newWords) || pickRandomFromVocab();
  if (word) sessionWords.push(word);
}

// 2 Review Words
for (let i = 0; i < 2; i++) {
  let word = pickFromList(reviewWords) || pickFromList(weakWords);
  if (word) sessionWords.push(word);
}

// 1 Random Word
let randomWord = pickRandomFromVocab();
if (randomWord) sessionWords.push(randomWord);

/* =========================
   Ensure exactly 15 words
========================= */

/* =========================
   Fill Remaining If Needed
========================= */

while (sessionWords.length < 15) {
  let w = pickRandomFromVocab();
  if (!w) break;
  sessionWords.push(w);
}

return sessionWords.slice(0, 15);

}

function getUserProgress(userId) {

  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  const accSheet = ss.getSheetByName("WordAccuracy");
  const userSheet = ss.getSheetByName("Users");
  const vocabSheet = ss.getSheetByName("VocabSheet");

  const accRows = accSheet.getDataRange().getValues();
  const userRows = userSheet.getDataRange().getValues();
  const vocabRows = vocabSheet.getDataRange().getValues();

  let level = 1;

  for (let i = 1; i < userRows.length; i++) {
    if (userRows[i][0] === userId) {
      level = userRows[i][6] || 1;
      break;
    }
  }

  /* Effective limits */
  const levelLimits = {
    1: 21,
    2: 80,
    3: 120,
    4: 150,
    5: 100
  };

  const levelTarget = levelLimits[level] || 0;

  /* Count mastered words */
  let masteredTotal = 0;
  let masteredInLevel = 0;

  // Create word -> level map
  const vocabMap = {};
  for (let i = 1; i < vocabRows.length; i++) {
    const word = vocabRows[i][1];
    const wordLevel = vocabRows[i][9]; // Column J = Level
    vocabMap[word] = wordLevel;
  }

  for (let i = 1; i < accRows.length; i++) {
    if (accRows[i][0] !== userId) continue;

    const word = accRows[i][1];
    const usage = accRows[i][2];
    const avg = accRows[i][3];

    if (usage >= 3 && avg >= 85) {
      masteredTotal++;

      if (vocabMap[word] == level) {
        masteredInLevel++;
      }
    }
  }

  return {
    level: level,
    mastered_words: masteredTotal,
    progressLevel: {
      masteredInLevel: masteredInLevel,
      levelTarget: levelTarget
    }
  };
}

function calculateUserStreak(sessionSheet, userId) {

  const data = sessionSheet.getDataRange().getValues();
  const dayMs = 1000 * 60 * 60 * 24;

  const days = new Set();

  for (let i = 1; i < data.length; i++) {

    if (String(data[i][0]).toLowerCase() === String(userId).toLowerCase()) {

      const d = new Date(data[i][2]);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      days.add(day);
    }
  }

  if (days.size === 0) return 0;

  const today = new Date();
  let checkDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();

  // if no session today start from yesterday
  if (!days.has(checkDay)) {
    checkDay -= dayMs;
  }

  let streak = 0;

  while (true) {

    if (days.has(checkDay)) {

      streak++;
      checkDay -= dayMs;

    } else {

      break;   // continuation breaks → streak finalized
    }
  }

  return streak;
}

function getUserDashboard(userId) {

  userId = String(userId).toLowerCase();

  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);

  const usersSheet = ss.getSheetByName("Users");
  const sessionSheet = ss.getSheetByName("SessionHistory");
  const wordSheet = ss.getSheetByName("WordAccuracy");

  const TOTAL_SESSIONS = 200;

  /* ensure latest level */
  updateUserLevel(userId);

  /* -------------------------------
     SESSION HISTORY
  --------------------------------*/

  const sessionData = sessionSheet.getDataRange().getValues();

  let sessionCount = 0;

  for (let i = 1; i < sessionData.length; i++) {

    if (String(sessionData[i][0]).toLowerCase() === userId) {
      sessionCount++;
    }
  }

  /* -------------------------------
     WORD PERFORMANCE
  --------------------------------*/

  const wordData = wordSheet.getDataRange().getValues();

  let wordPerformance = [];
  let masteredCount = 0;

  for (let i = 1; i < wordData.length; i++) {

    if (String(wordData[i][0]).toLowerCase() === userId) {

      const word = wordData[i][1];
      const used = Number(wordData[i][2]);
      const accuracy = Number(wordData[i][3]);
      const level = Number(wordData[i][6]);

      wordPerformance.push({
        word: word,
        level: level,
        accuracy: accuracy,
        used: used,
        streak: used
      });

      if (used >= 3 && accuracy >= 85) {
        masteredCount++;
      }
    }
  }

  /* -------------------------------
     USER LEVEL
  --------------------------------*/

  let level = 1;
  const users = usersSheet.getDataRange().getValues();

  for (let i = 1; i < users.length; i++) {

    if (String(users[i][0]).toLowerCase() === userId) {
      level = users[i][6] || 1;
      break;
    }
  }

  /* -------------------------------
     LEVEL PROGRESS
  --------------------------------*/

  const limits = getEffectiveLevelLimits();

  let cumulative = 0;

  for (let lvl = 1; lvl < level; lvl++) {
    cumulative += limits[lvl];
  }

  const masteredInLevel = masteredCount - cumulative;
  const levelTarget = limits[level];

  /* -------------------------------
     STREAK
  --------------------------------*/

  const streak = calculateUserStreak(sessionSheet, userId);

  /* -------------------------------
     GRAPH DATA
  --------------------------------*/

  let labels = [];
  let masteredCurve = [];
  let accuracyCurve = [];

  for (let i = 1; i <= TOTAL_SESSIONS; i++) {
    labels.push(i);
  }

  if (sessionCount === 0) {

    for (let i = 0; i < TOTAL_SESSIONS; i++) {
      masteredCurve.push(null);
      accuracyCurve.push(null);
    }

  } else {

    let cumulativeMastered = 0;
    const growthPerSession = masteredCount / sessionCount;

    let sessions = [];

    for (let i = 1; i < sessionData.length; i++) {

      if (String(sessionData[i][0]).toLowerCase() === userId) {

        sessions.push({
          date: new Date(sessionData[i][2]),
          accuracy: Number(sessionData[i][3])
        });
      }
    }

    sessions.sort((a, b) => a.date - b.date);

    for (let i = 0; i < sessionCount; i++) {

      cumulativeMastered += growthPerSession;

      masteredCurve.push(Math.round(cumulativeMastered));
      accuracyCurve.push(sessions[i].accuracy);
    }

    for (let i = sessionCount; i < TOTAL_SESSIONS; i++) {
      masteredCurve.push(null);
      accuracyCurve.push(null);
    }
  }

  /* -------------------------------
     RESPONSE
  --------------------------------*/

  const result = {

    level: level,
    masteredWords: masteredCount,
    sessions: sessionCount,
    streak: streak,

    progress: {
      currentSession: sessionCount,
      totalSessions: TOTAL_SESSIONS,
      remainingSessions: TOTAL_SESSIONS - sessionCount,
      completionPercent: Math.round((sessionCount / TOTAL_SESSIONS) * 100)
    },

    progressLevel: {
      masteredInLevel: masteredInLevel,
      levelTarget: levelTarget
    },

    graphData: {
      labels: labels,
      mastered: masteredCurve,
      accuracy: accuracyCurve
    },

    wordPerformance: wordPerformance
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/* -----------------------------------------------
   GET USER INSIGHTS FOR USER PROFILE DASHBOARD
-------------------------------------------------*/
function getUserInsights(userId) {

  userId = String(userId).toLowerCase();
  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  const wordSheet = ss.getSheetByName("WordAccuracy");
  const words = wordSheet.getDataRange().getValues();

  let weeklyMastered = 0;
  let weakWords = 0;

  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  words.slice(1).forEach(row => {

    const uid = row[0];
    const usageCount = row[2];
    const avgAccuracy = row[3];

    const lastUsed = row[4] instanceof Date ? row[4] : new Date(row[4]);
    const nextReview = row[5] instanceof Date ? row[5] : new Date(row[5]);

    if (uid === userId) {

      if (usageCount >= 3 && avgAccuracy >= 85 && lastUsed >= weekAgo && nextReview > today) {
        weeklyMastered++;
      }

      if (nextReview <= today) {
        weakWords++;
      }

    }

  });

  const result = {
    weeklyMastered,
    weakWords
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);

}