var hide = false;
$(document).ready(function () {
  $("#flip_correction").click(function () {
    if (hide == false) {
      $("#correction_container").hide();
      hide = true;
    }
    else {
      $("#correction_container").show();
      hide = false;
    }
  });
});

var response, correct_meaning, correct_word, no_of_words, random_id, word, chart;
var uniqueRandoms = [];
let DOM = {};
var correct = 0, wrong = 0, skipped = 0, count = 0;
var attempt = false;
let applyQuestionCount = 1;
let attemptedQuestions = 0;
let sessionWordsData = [];
let currentApplyWords = [];
let DEV_MODE = false;
let sessionWordPool = [];
let currentRoundIndex = 0;
const ROUNDS_PER_SESSION = 5;
let lastEvaluationResult = null;
let uniqueSessionWords = new Set();
let sessionResults = [];
let dashboardData = null;
let wordTableSort = {
  column: null,
  direction: "asc"
};
let lastGraphType = null;
let wordTablePage = 1;
let wordTableRowsPerPage = 10;
let wordTableFiltered = [];

function loadDoc() {
  const q = DOM.question;
  q.style.width = (150 + Math.random() * 150) + "px";
  var url;
  if (document.getElementById("revise").checked == true) {
    uniqueRandoms = [];
    word_array = [];
    url = "https://script.google.com/macros/s/AKfycbz-Z6AlQaclHeRrsJp5rbT48sfNfwUxkieXdB2qhq-VFYpsXQS_rKc0fX8VMHYgvM-B6Q/exec";
  }

  else if (document.getElementById("phrasal").checked == true) {
    uniqueRandoms = [];
    word_array = [];
    url = "https://script.google.com/macros/s/AKfycbw-ebR8jV7pq6E9JYKBiz0xgd26HRsE0nowg8w_kikqjKJj-Mz0fYP5QlpFX-zIgmba0g/exec";
  }

  else if (document.getElementById("all").checked == true) {
    url = "https://script.google.com/macros/s/AKfycbwlMX0gigidxkW1i36N6aoXPHgRgYlHdGd2kB2X03wvF0TJk5qllory9_rEk5UWCtqPug/exec";
  }

  correct = 0, wrong = 0, skipped = 0, count = 0;
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      response = JSON.parse(this.responseText);
      no_of_words = Object.keys(response.user).length;
      refillAll();
      changeQuestion();
      enterApp();
      showPage("learnPage");
      hideLoader();   // 🔥 hide after real data loads
    }
  };
  xhttp.open("GET", url, true);
  xhttp.send();
}

const RevisitAll = document.getElementById('all'); //All
const RevisitImp = document.getElementById('revise'); //IdiomsNPVerbs
const RevisePhrasal = document.getElementById('phrasal');

document.querySelectorAll('input[name="category"]')
  .forEach(el => el.addEventListener('change', loadDoc))

function refillAll() {
  for (var i = 0; i < no_of_words; i++) {
    uniqueRandoms.push(i);
  }
}

function speakWord() {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
}

function fetchExamples(word) {
  var exampleBox = DOM.exampleContainer;
  let ex1 = response.user[random_id].example1;
  let ex2 = response.user[random_id].example2;
  let ex3 = response.user[random_id].example3;
  let ex4 = response.user[random_id].example4;
  let output = "<h4>Usage Examples:</h4>";
  if (ex1) output += `<p>• ${ex1}</p>`;
  if (ex2) output += `<p>• ${ex2}</p>`;
  if (ex3) output += `<p>• ${ex3}</p>`;
  if (ex4) output += `<p>• ${ex4}</p>`;
  exampleBox.innerHTML = output;
  exampleBox.style.display = "block";
}

function changeQuestion() {
  const container = DOM.imageContainer;
  const img = DOM.imageBox;
  const fallback = DOM.imageFallback;
  container.classList.remove("visible");
  img.style.display = "none";
  fallback.style.display = "none";
  DOM.exampleContainer.style.display = "none";
  count++;
  resetFormat();
  let word_array = [];
  for (let i = 0; i < response.user.length; i++) {
    word_array.push(i);
  }
  let id_of_random_word;
  if (document.getElementById("tatic").checked) {
    if (uniqueRandoms.length < 1) {
      refillAll();
    }
    id_of_random_word = Math.floor(Math.random() * uniqueRandoms.length);
    random_id = uniqueRandoms[id_of_random_word];
    uniqueRandoms.splice(id_of_random_word, 1);
  } else {
    random_id = Math.floor(Math.random() * no_of_words);
  }

  word = response.user[random_id].word.trim();
  correct_meaning = response.user[random_id].meaning;

  DOM.question.innerHTML =
    "<span class='question-number'>" + count + ". </span>" +
    "<span class='question-word'>" + word + "</span>" +
    "<button class='question-audio' onclick='speakWord()'>" +
    "<i class='fa fa-volume-up'></i></button>";

  // remove correct word index from pool
  word_array.splice(word_array.indexOf(random_id), 1);

  // shuffle answer positions
  let positions = [1, 2, 3, 4];
  let correctPosition = positions.splice(Math.floor(Math.random() * positions.length), 1)[0];

  correct_word = correctPosition;

  document.getElementById(correctPosition).value = correct_meaning;
  document.getElementById("lab-" + correctPosition).innerHTML = correct_meaning;

  // select 3 random wrong meanings
  let wrongIndexes = [];

  for (let i = 0; i < 3; i++) {
    let r = Math.floor(Math.random() * word_array.length);
    wrongIndexes.push(word_array[r]);
    word_array.splice(r, 1);
  }

  wrongIndexes.forEach((index, i) => {
    let place = positions.splice(Math.floor(Math.random() * positions.length), 1)[0];
    let meaning = response.user[index].meaning;
    document.getElementById(place).value = meaning;
    document.getElementById("lab-" + place).innerHTML = meaning;

  });

  updateReport();

  DOM.nextBtn.style.backgroundColor = "#cccccc";
  DOM.nextBtn.disabled = true;
  DOM.skipBtn.disabled = false;
}


function disableOptions() {
  for (let i = 1; i <= 5; i++) {
    document.getElementById(i).disabled = true;
  }
}

function resetFormat() {
  for (let i = 1; i <= 5; i++) {
    document.getElementById(i).disabled = false;
    document.getElementById("div-" + i).classList.remove("correct", "wrong", "answered");
    document.getElementById(i).checked = false;
  }
}

function loadImage() {
  const btn = DOM.refreshBtn;
  const container = DOM.imageContainer;
  const img = DOM.imageBox;
  const fallback = DOM.imageFallback;

  btn.classList.add("spin");
  setTimeout(() => btn.classList.remove("spin"), 600);

  const imageUrl = response.user[random_id].image;

  container.classList.add("visible");
  container.classList.add("loading");

  img.classList.remove("loaded");
  img.style.display = "none";
  fallback.style.display = "none";

  if (!imageUrl || imageUrl.trim() === "") {
    container.classList.remove("loading");
    fallback.style.display = "block";
    return;
  }

  let hasResolved = false;

  img.onload = function () {
    if (hasResolved) return;
    hasResolved = true;

    container.classList.remove("loading");
    fallback.style.display = "none";
    img.style.display = "block";
    img.classList.add("loaded");
  };

  img.onerror = function () {
    if (hasResolved) return;
    hasResolved = true;

    container.classList.remove("loading");
    img.style.display = "none";
    fallback.style.display = "block";
  };

  img.src = imageUrl;
}

function validate() {
  loadImage();

  attempt = true;

  var selected_value, selected_id;

  const selected = document.querySelector('input[name="this"]:checked');
  if (!selected) {
    alert("Please select an answer.");
    return;
  }
  selected_id = selected?.id;
  selected_value = selected?.value;

  disableOptions();

  for (let i = 1; i <= 5; i++) {
    document.getElementById("div-" + i).classList.add("answered");
  }

  if (selected_value == correct_meaning) {
    correct++;
    document.getElementById("div-" + selected_id).classList.add("correct");
    addWordToList(word, correct_meaning);

    document.getElementById("restartConfetti").click();
    setTimeout(function () {
      document.getElementById("stopConfetti").click();
    }, 2000);
  }

  else if (selected_value !== correct_meaning) {
    wrong++;
    document.getElementById("div-" + selected_id).classList.add("wrong");
    document.getElementById("div-" + correct_word).classList.add("correct");

    addToRevisionList(word, correct_meaning);
  }
  DOM.nextBtn.style.backgroundColor = "#006400";
  DOM.nextBtn.disabled = false;
  DOM.skipBtn.disabled = true;

  fetchExamples(word);

  updateReport();
}

function addToRevisionList(word, meaning) {
  var table = DOM.revisionTable;
  var row = table.insertRow(table.rows.length);

  var cell1 = row.insertCell(0);
  var cell2 = row.insertCell(1);

  cell1.innerHTML = word;
  cell2.innerHTML = meaning;

  // Collect examples
  let ex1 = response.user[random_id].example1 || "";
  let ex2 = response.user[random_id].example2 || "";
  let ex3 = response.user[random_id].example3 || "";
  let ex4 = response.user[random_id].example4 || "";

  let examplesArray = [ex1, ex2, ex3, ex4]
    .filter(e => e !== "")
    .map(e => `<div class="tooltip-line">• ${e}</div>`);

  let examples = "";

  if (examplesArray.length > 0) {
    examples =
      "<div class='tooltip-title'>Examples:</div>" +
      "<div class='tooltip-lines'>" +
      examplesArray.join("") +
      "</div>";
  }

  if (examples !== "") {
    row.setAttribute("data-examples", examples);
  }
}

function addWordToList(Word, Meaning) {
  var pill = document.createElement("span");
  pill.className = "word-pill";
  pill.textContent = Word;

  // 🔊 Add pronunciation on click
  pill.addEventListener("click", function (e) {
    e.stopPropagation(); // prevent tooltip conflicts
    const utterance = new SpeechSynthesisUtterance(Word);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    speechSynthesis.cancel(); // stop any previous speech
    speechSynthesis.speak(utterance);
  });

  var tooltip = document.createElement("span");
  tooltip.className = "tooltiptext";

  // Collect examples
  let ex1 = response.user[random_id].example1 || "";
  let ex2 = response.user[random_id].example2 || "";
  let ex3 = response.user[random_id].example3 || "";
  let ex4 = response.user[random_id].example4 || "";

  let examples = [ex1, ex2, ex3, ex4]
    .filter(e => e)
    .map(e => `<p>• ${e}</p>`)
    .join("");

  tooltip.innerHTML = `
              <div class="tooltip-title">${Word}</div>
              <div class="tooltip-meaning">${Meaning}</div>
              <div class="tooltip-divider"></div>
              <div class="tooltip-examples">
              ${examples}
               </div>
              `;

  pill.appendChild(tooltip);

  DOM.masteredContainer.appendChild(pill);
}

function showExamplesForWord(word) {
  let wordData = response.user.find(w => w.word === word);
  let examples = [wordData.example1, wordData.example2, wordData.example3, wordData.example4]
    .filter(e => e);
  alert("Examples:\n\n" + examples.join("\n\n"));
}


function copyRevisionList(el) {
  var body = document.body, range, sel;
  if (document.createRange && window.getSelection) {
    range = document.createRange();
    sel = window.getSelection();
    sel.removeAllRanges();
    try {
      range.selectNodeContents(el);
      sel.addRange(range);
    } catch (e) {
      range.selectNode(el);
      sel.addRange(range);
    }
    document.execCommand("copy");

  } else if (body.createTextRange) {
    range = body.createTextRange();
    range.moveToElementText(el);
    range.select();
    range.execCommand("Copy");
  }
}

function clearRevisionList() {
  var table = DOM.revisionTable;
  try {
    while (table.rows.length > 0) {
      table.deleteRow(1);
    }
  }
  catch (err) {
  }
}


function skipTheQuestion() {
  skipped++;
  addToRevisionList(word, correct_meaning);
  changeQuestion();
}

// Draw the chart and set the chart values
let accuracyChart;

function updateReport() {

  // 🔥 Update individual numbers first
  DOM.correctCount.innerText = correct;
  DOM.wrongCount.innerText = wrong;
  DOM.skipCount.innerText = skipped;

  const total = correct + wrong + skipped;
  let accuracy = 0;

  if (total > 0) {
    accuracy = ((correct / total) * 100).toFixed(1);
  }

  accuracy = Math.round(accuracy);

  console.log(accuracy);

  DOM.accuracyPercent.innerText = accuracy + "%";

  const ctx = document.getElementById("accuracyChart").getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 300, 300);
  gradient.addColorStop(0, "#6d5cff");
  gradient.addColorStop(1, "#00c6ff");

  if (accuracyChart) {
    accuracyChart.destroy();
  }

  accuracyChart = new Chart(ctx, {
    type: "doughnut",

    data: {
      labels: ["Correct", "Wrong", "Skipped"],
      datasets: [{
        data: [correct, wrong, skipped],
        backgroundColor: [
          gradient,
          "#ef4444",
          "#f59e0b"
        ],
        borderWidth: 0,
        cutout: "72%"
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      layout: {
        padding: 40
      },

      plugins: {
        legend: { display: false }
      },

      cutout: "75%",
    },

    plugins: [{
      id: "centerText",
      beforeDraw(chart) {
        const { ctx, width, height } = chart;

        ctx.save();

        ctx.font = "bold 32px Inter";
        ctx.fillStyle = document.body.classList.contains("dark-mode") ? "#fff" : "#111";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(accuracy + "%", width / 2, height / 2);

        ctx.restore();
      }
    },
    {
      id: "outlabels",
      afterDraw(chart) {

        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);

        ctx.font = "13px Inter";
        ctx.fillStyle = "#ccc";

        meta.data.forEach((arc, i) => {

          const value = chart.data.datasets[0].data[i];
          if (value === 0) return;

          const label = chart.data.labels[i];

          const angle = (arc.startAngle + arc.endAngle) / 2;

          const startX = arc.x + Math.cos(angle) * (arc.outerRadius + 10);
          const startY = arc.y + Math.sin(angle) * (arc.outerRadius + 10);

          const lineEndX = arc.x + Math.cos(angle) * (arc.outerRadius + 35);
          const lineEndY = arc.y + Math.sin(angle) * (arc.outerRadius + 35);

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(lineEndX, lineEndY);
          ctx.strokeStyle = "#888";
          ctx.stroke();

          ctx.textAlign = lineEndX > arc.x ? "left" : "right";

          ctx.fillText(
            label + " (" + value + ")",
            lineEndX + (lineEndX > arc.x ? 6 : -6),
            lineEndY
          );

        });
      }
    }]

  });

}

function showAndHide() {
  var wrapper = document.getElementById("wordTableWrapper");
  wrapper.classList.toggle("open");
}

function toggleReport() {
  const content = document.getElementById("reportContent");
  const arrow = document.getElementById("reportArrow");
  content.classList.toggle("open");

  if (content.classList.contains("open")) {
    arrow.innerHTML = "▼";
  } else {
    arrow.innerHTML = "▲";
  }
}

function openReportModal() {
  document.getElementById("reportModal").classList.add("active");
  setTimeout(() => {
    updateReport();
  }, 50);
}

function closeReportModal() {
  document.getElementById("reportModal").classList.remove("active");
}

const toggleBtn = document.getElementById("darkToggle");
const shortDrakToggleBtn = document.getElementById("modeIcon");
toggleBtn.addEventListener("click", function () {
  toggleAndSyncDarkMode();
});

function toggleAndSyncDarkMode() {
  document.body.classList.toggle("dark-mode");
  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("theme", "dark");
    toggleBtn.innerHTML = "☀︎";
    shortDrakToggleBtn.innerHTML = "☀︎";
    shortDrakToggleBtn.style.fontSize = "22px";
  } else {
    localStorage.setItem("theme", "light");
    toggleBtn.innerHTML = "🌙︎";
    shortDrakToggleBtn.innerHTML = "🌙︎";
    shortDrakToggleBtn.style.fontSize = "18px";
  }
}

// On load
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
  toggleBtn.innerHTML = "☀︎";
}

function formatName(name) {
  return name
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

document.addEventListener("DOMContentLoaded", function () {
  DOM = {
    question: document.getElementById("question"),
    nextBtn: document.getElementById("next"),
    skipBtn: document.getElementById("skip"),
    imageContainer: document.getElementById("image_container"),
    imageBox: document.getElementById("image_box"),
    imageFallback: document.getElementById("imageFallback"),
    exampleContainer: document.getElementById("example_container"),
    refreshBtn: document.getElementById("refreshBtn"),
    reportBtn: document.getElementById("reportBtn"),
    revisionTable: document.getElementById("RevisionList"),
    masteredContainer: document.getElementById("masteredWordsContainer"),
    progressRing: document.getElementById("progressRing"),
    correctCount: document.getElementById("correctCount"),
    wrongCount: document.getElementById("wrongCount"),
    skipCount: document.getElementById("skipCount"),
    accuracyPercent: document.getElementById("accuracyPercent")
  };

  // ENTER key login support
  document.getElementById("loginUser").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault()
      loginUser();
    }
  });

  document.getElementById("loginPass").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      loginUser();
    }
  });

  const textarea = document.getElementById("applyAnswer");

  if (textarea) {
    textarea.addEventListener("input", checkUsedWords);
  }

  const tooltip = document.getElementById("tableTooltip");
  const table = DOM.revisionTable;

  table.addEventListener("mouseover", function (e) {
    const row = e.target.closest("tr");

    if (row && row.dataset.examples) {
      tooltip.innerHTML = row.dataset.examples;
      tooltip.style.display = "block";
    }
  });

  table.addEventListener("mousemove", function (e) {
    if (tooltip.style.display === "block") {

      const offsetX = 15;
      const offsetY = 15;

      tooltip.style.left = (e.clientX + offsetX) + "px";
      tooltip.style.top = (e.clientY - tooltip.offsetHeight - offsetY) + "px";
    }
  });

  table.addEventListener("mouseleave", function () {
    tooltip.style.display = "none";
  });

  document.addEventListener("mouseover", function (e) {
    const pill = e.target.closest(".word-pill");
    if (!pill) return;

    const tooltip = pill.querySelector(".tooltiptext");
    if (!tooltip) return;

    // Reset position first
    tooltip.style.left = "50%";
    tooltip.style.transform = "translateX(-50%)";

    setTimeout(() => {
      const rect = tooltip.getBoundingClientRect();

      if (rect.right > window.innerWidth) {
        tooltip.style.left = "auto";
        tooltip.style.right = "0";
        tooltip.style.transform = "translateX(0)";
      }

      if (rect.left < 0) {
        tooltip.style.left = "0";
        tooltip.style.right = "auto";
        tooltip.style.transform = "translateX(0)";
      }
    }, 10);
  });


  const loggedUser = localStorage.getItem("loggedInUser");
  const lastActive = localStorage.getItem("lastActiveTime");
  const loginDate = localStorage.getItem("loginDate");

  const now = Date.now();
  const today = new Date().toDateString();

  let validSession = true;

  // rule 1: new day → logout
  if (loginDate !== today) {
    validSession = false;
  }

  // rule 2: inactive > 10 min → logout
  if (lastActive && (now - lastActive > 10 * 60 * 1000)) {
    validSession = false;
  }

  if (loggedUser && validSession) {

    showLoader();
    // console.log("Before Changing:"+loggedUser+":");
    // console.log("After Changing:"+formatName(loggedUser)+":");
    // document.getElementById("sidebarUserName").innerText = formatName(loggedUser);
    // document.getElementById("authContainer").style.display = "none";
    // document.querySelector(".app-layout").style.display = "flex";

    loadDoc();

    loadDashboard();

  } else {

    logoutUser(); // clear everything

    document.getElementById("authContainer").style.display = "flex";
    document.querySelector(".app-layout").style.display = "none";
  }

  /* -------- Graph Type Dropdown -------- */

  document.getElementById("graphType")
    .addEventListener("change", updateGraphMode);

  document.getElementById("timelineType")
    .addEventListener("change", updateGraphMode);

  document.getElementById("xMax")
    .addEventListener("input", updateAxisSettings);

  document.getElementById("xInterval")
    .addEventListener("input", updateAxisSettings);

  document.getElementById("yMax")
    .addEventListener("input", updateAxisSettings);

  document.getElementById("yInterval")
    .addEventListener("input", updateAxisSettings);

});

function checkUsedWords() {
  const textarea = document.getElementById("applyAnswer");
  const cleanText = normalize(textarea.value);
  const bubbles = document.querySelectorAll(".apply-bubble");
  bubbles.forEach((bubble) => {
    const word = bubble.querySelector(".apply-bubble-word").innerText;
    const base = normalize(word);

    // allow hyphen OR space between phrase parts
    const pattern = base.replace(/[-\s]+/g, "[-\\s]+");
    const regex = new RegExp("\\b" + pattern + "\\w*\\b", "i");
    const match = regex.test(cleanText);

    if (match) {
      bubble.classList.add("completed");
    } else {
      bubble.classList.remove("completed");
    }
  });
}

function updateActivity() {
  localStorage.setItem("lastActiveTime", Date.now());
}

document.addEventListener("click", updateActivity);
document.addEventListener("keypress", updateActivity);
document.addEventListener("mousemove", updateActivity);

window.addEventListener("beforeunload", function (e) {
  const loggedUser = localStorage.getItem("loggedInUser");
  if (loggedUser && (attemptedQuestions > 0 || count > 1)) {
    localStorage.setItem("lastActiveTime", Date.now());
    e.preventDefault();
    e.returnValue = "";
    return "";
  }
});

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const sidebarInner = document.getElementById("SidebarInner");
  sidebar.classList.toggle("collapsed");
  // sidebarInner.classList.toggle("collapsed");
}

function showPage(pageId, element) {

  document.body.classList.remove("learn-mode", "apply-mode");

  if (pageId === "learnPage") {
    document.body.classList.add("learn-mode");
  }

  if (pageId === "applyPage") {
    document.body.classList.add("apply-mode");
  }

  if (!document.getElementById("loadingOverlay").classList.contains("hidden")) {
    return; // block navigation during loading
  }

  document.querySelectorAll(".page").forEach(p => {
    p.style.display = "none";
  });

  document.querySelectorAll(".menu-item").forEach(i => {
    i.classList.remove("active");
  });

  document.getElementById(pageId).style.display = "block";

  if (element) {
    element.classList.add("active");
  }
  else {
    // 🔥 If called programmatically (first load)
    const autoMenu = document.querySelector(
      `.menu-item[onclick*="${pageId}"]`
    );
    if (autoMenu) autoMenu.classList.add("active");
  }

  if (pageId === "applyPage") {

    applyQuestionCount = 1;
    document.getElementById("applyQuestionNumber").innerText = "1";

    //loadApplyWords();
    loadRoundWords();

    // Reset view
    document.getElementById("feedbackView").classList.add("hidden");
    document.getElementById("answerView").classList.remove("hidden");

    document.getElementById("actionButton").innerText = "Submit";

    submitted = false;
  }
}

let submitted = false;

function handleAction() {
  if (!submitted) {
    submitAnswer();
  } else {
    loadNextQuestion();
  }
}


function simulateFakeEvaluation(answer) {
  const actionBtn = document.getElementById("actionButton");
  // Simulate delay
  setTimeout(() => {
    const fakeResult = {
      words: {},
      grammar_accuracy: Math.floor(Math.random() * 20) + 75,
      overall_context_accuracy: Math.floor(Math.random() * 20) + 75,
      suggested_correction:
        "This is a mock evaluation. Structure is good but transitions can be refined."
    };

    currentApplyWords.forEach(word => {
      fakeResult.words[word] =
        Math.floor(Math.random() * 40) + 60;
    });

    // 🔥 Track attempted words (same as real evaluation)
    currentApplyWords.forEach(word => {
      uniqueSessionWords.add(word);
    });

    lastEvaluationResult = fakeResult;

    // Display results
    const highlightedUserAnswer =
      highlightWordsInText(answer, currentApplyWords);

    const textarea = document.getElementById("applyAnswer");
    const overlay = document.getElementById("aiProcessingOverlay");

    const actionBtn = document.getElementById("actionButton");
    const endBtn = document.getElementById("endSessionBtn");

    /* remove blur */

    textarea.classList.remove("blur");

    /* hide dots */

    overlay.classList.add("hidden");

    /* show buttons again */

    if (currentRoundIndex !== ROUNDS_PER_SESSION - 1) {
      actionBtn.classList.remove("fade-out");
      actionBtn.classList.add("fade-in");
    }

    endBtn.classList.remove("fade-out");
    endBtn.classList.add("fade-in");

    document.getElementById("finalAnswer").innerHTML =
      highlightedUserAnswer;
    document.getElementById("overallAccuracy").innerText =
      fakeResult.overall_context_accuracy + "%";
    document.getElementById("grammarAccuracy").innerText =
      fakeResult.grammar_accuracy + "%";
    document.getElementById("contextAccuracy").innerText =
      fakeResult.overall_context_accuracy + "%";
    const highlightedSuggestion =
      // highlightWordsInText(
      //   fakeResult.suggested_correction,
      //   currentApplyWords
      // );  //Need to remove this, kept for further review

      renderAIAnalysis(fakeResult.suggested_correction);

    const answerView = document.getElementById("answerView");
    const feedbackView = document.getElementById("feedbackView");

    answerView.classList.add("hidden");
    setTimeout(() => {
      feedbackView.classList.remove("hidden");
    }, 200);
    feedbackView.classList.remove("hidden");

    if (currentRoundIndex === ROUNDS_PER_SESSION - 1) {

      actionBtn.style.display = "none";

      const endBtn = document.getElementById("endSessionBtn");

      endBtn.style.marginLeft = "0";
      endBtn.style.marginRight = "auto";

    } else {
      actionBtn.style.display = "inline-block";  // restore if previously hidden
      actionBtn.innerText = "Next Question";
    }
    actionBtn.disabled = false;

    submitted = true;
    attemptedQuestions++;

  }, 1500);
}

function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/[^\w\s]/g, " ");
}

function normalizeWord(word) {
  return word
    .toLowerCase()
    .replace(/[-_]/g, "")
    .replace(/[^\w]/g, "");
}

function stem(word) {

  word = word.toLowerCase();

  // 🔥 Handle y → ied (pacified → pacify)
  if (word.endsWith("ied") && word.length > 4) {
    return word.slice(0, -3) + "y";
  }

  // 🔥 Handle ies → y (studies → study)
  if (word.endsWith("ies") && word.length > 4) {
    return word.slice(0, -3) + "y";
  }

  const suffixes = [
    "ability", "ibility",
    "ation", "ition",
    "ment", "ness",
    "ing", "edly",
    "ed", "ly",
    "es", "s"
  ];

  for (let suffix of suffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}

function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();

  if (a === b) return 1;

  const lengthDiff = Math.abs(a.length - b.length);

  // If length difference too large, no need to compare
  if (lengthDiff > Math.max(a.length, b.length) * 0.5) {
    return 0;
  }

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  return 1 - distance / maxLength;
}


function highlightWordsInText(text, words) {

  if (Array.isArray(text)) {
    text = text.map(c =>
      `Original: ${c.original}

Improved: ${c.improved}

Suggestion: ${c.suggestion}`
    ).join("\n\n");
  }

  if (typeof text !== "string") {
    text = String(text);
  }

  let highlightedText = text;

  words.forEach(word => {

    const base = normalize(word);

    const pattern = base.replace(/[-\s]+/g, "[-\\s]+");

    // allow suffix only if single word
    const allowSuffix = !base.includes(" ") && !base.includes("-");

    const regex = allowSuffix
      ? new RegExp(`\\b(${pattern}\\w*)\\b`, "gi")
      : new RegExp(`\\b(${pattern})\\b`, "gi");

    highlightedText = highlightedText.replace(regex, (match) => wrap(match));

  });

  return highlightedText;
}

function wrap(word) {
  return `<span class="highlight-word">${word}</span>`;
}


function calculateSessionAccuracy() {
  let total = 0;
  sessionResults.forEach(r => {
    total += r.overall_context_accuracy;
  });
  return Math.round(total / sessionResults.length);
}



function submitAnswer() {
  updateVisibleWords(); // ensure correct round words

  const answer = document.getElementById("applyAnswer").value.trim();
  if (!answer) {
    alert("Please write an answer before submitting.");
    return;
  }
  const textarea = document.getElementById("applyAnswer");
  const overlay = document.getElementById("aiProcessingOverlay");
  const actionBtn = document.getElementById("actionButton");
  const endBtn = document.getElementById("endSessionBtn");

  /* start processing UI */

  textarea.classList.add("blur");
  overlay.classList.remove("hidden");

  /* fade buttons out */

  actionBtn.classList.remove("fade-in");
  endBtn.classList.remove("fade-in");

  actionBtn.classList.add("fade-out");
  endBtn.classList.add("fade-out");

  actionBtn.disabled = true;

  /* DEV MODE */
  if (DEV_MODE) {
    simulateFakeEvaluation(answer);
    return;
  }

  const userId = localStorage.getItem("loggedInUser");
  const formattedWords = currentApplyWords.map(w => {
    if (typeof w === "string") {
      return { word: w };
    }
    return w;
  });

  const requestData = {
    action: "evaluateAnswer",
    user_id: userId,
    answer: answer,
    words: formattedWords
  };

  fetch("https://script.google.com/macros/s/AKfycbxeWx6COIWQ2zrHc5wHVl2b9rrbtyOeWZxW7nJ-0Q1TTgjpoW6Q5-bg1UnOCGAtAzad/exec", {
    method: "POST",
    body: JSON.stringify(requestData)
  })
    .then(res => res.text())
    .then(text => {

      console.log("Raw response:", text);

      /* STOP PROCESSING UI */

      textarea.classList.remove("blur");
      overlay.classList.add("hidden");

      actionBtn.classList.remove("fade-out");
      endBtn.classList.remove("fade-out");

      actionBtn.classList.add("fade-in");
      endBtn.classList.add("fade-in");

      let data;

      try {
        data = JSON.parse(text);
      } catch (err) {
        alert("Server returned invalid response.");
        return;
      }

      const ai = data.result || data;

      // track attempted words ONLY after submission
      currentApplyWords.forEach(word => {
        uniqueSessionWords.add(word);
      });

      lastEvaluationResult = ai;

      // store this round result
      sessionResults.push(ai);

      const highlightedUserAnswer =
        highlightWordsInText(answer, currentApplyWords);

      document.getElementById("finalAnswer").innerHTML =
        highlightedUserAnswer;

      renderAIAnalysis(ai.suggested_correction);

      document.getElementById("overallAccuracy").innerText =
        ai.overall_context_accuracy + "%";

      document.getElementById("grammarAccuracy").innerText =
        ai.grammar_accuracy + "%";

      document.getElementById("contextAccuracy").innerText =
        ai.overall_context_accuracy + "%";


      const answerView = document.getElementById("answerView");
      const feedbackView = document.getElementById("feedbackView");

      answerView.classList.add("hidden");

      setTimeout(() => {
        feedbackView.classList.remove("hidden");
      }, 200);

      if (currentRoundIndex === ROUNDS_PER_SESSION - 1) {

        actionBtn.style.display = "none";

        endBtn.style.marginLeft = "0";
        endBtn.style.marginRight = "auto";

      } else {

        actionBtn.style.display = "inline-block";
        actionBtn.innerText = "Next Question";

      }

      actionBtn.disabled = false;
      submitted = true;
      attemptedQuestions++;

    })

    .catch(err => {

      textarea.classList.remove("blur");
      overlay.classList.add("hidden");

      actionBtn.classList.remove("fade-out");
      endBtn.classList.remove("fade-out");

      actionBtn.innerText = "Submit";
      actionBtn.disabled = false;

      console.error(err);
      alert("Server error.");

    });
}


function checkDailyLimit() {
  const today = new Date().toDateString();
  const stored = JSON.parse(
    localStorage.getItem("dailyProgress")
  ) || {};

  if (stored.date !== today) {
    localStorage.setItem("dailyProgress",
      JSON.stringify({
        date: today,
        rounds: 0
      })
    );
    return true;
  }

  if (stored.rounds >= 20) {
    alert("Daily limit reached.");
    return false;
  }

  return true;
}

function loadNextQuestion() {

  document.querySelectorAll(".apply-bubble").forEach(b => b.classList.remove("completed"));

  const container = document.getElementById("applyWordContainer");
  const bubbles = container.querySelectorAll(".apply-bubble");

  currentRoundIndex++;
  const startIndex = currentRoundIndex * 3 + 2;

  const startBubble = bubbles[startIndex];

  const wrapper = document.querySelector(".apply-bubble-wrapper");

  const wrapperCenter = wrapper.offsetWidth / 2;
  const bubbleCenter = startBubble.offsetLeft + (startBubble.offsetWidth / 2);

  const offset = bubbleCenter - wrapperCenter;

  container.style.transition =
    "transform 0.55s cubic-bezier(.4,0,.2,1)";

  container.style.transform =
    `translateX(-${offset}px)`;

  if (currentRoundIndex === ROUNDS_PER_SESSION) {
    alert("Session completed!");
  }

  updateVisibleWords();

  document.getElementById("applyAnswer").value = "";
  document.getElementById("feedbackView").classList.add("hidden");
  document.getElementById("answerView").classList.remove("hidden");
  document.getElementById("actionButton").innerText = "Submit";

  submitted = false;
}


// We need 17 unique words for 5 rounds with 2 overlap logic
// Because:
// Round 1 = 5
// Each next round adds 3 new words
// Total = 5 + (4 × 3) = 17
function generateSessionWordPool() {
  sessionWordPool = [];
  currentRoundIndex = 0;
  const usedIndexes = new Set();

  while (usedIndexes.size < 17) {
    const randomIndex =
      Math.floor(Math.random() * response.user.length);
    usedIndexes.add(randomIndex);
  }

  usedIndexes.forEach(index => {
    sessionWordPool.push(response.user[index]);
  });
}

function startApplySession() {
  showLoader();   // 🔥 show loader
  // 🔥 RESET SESSION STATE
  currentRoundIndex = 0;
  attemptedQuestions = 0;
  uniqueSessionWords.clear();
  sessionResults = [];

  sessionWordsData = [];
  const userId = localStorage.getItem("loggedInUser");
  const script = document.createElement("script");
  script.src =
    "https://script.google.com/macros/s/AKfycbxeWx6COIWQ2zrHc5wHVl2b9rrbtyOeWZxW7nJ-0Q1TTgjpoW6Q5-bg1UnOCGAtAzad/exec" +
    "?action=getSessionWords" +
    "&user_id=" + userId +
    "&callback=handleSessionWords";
  // Debug
  script.onload = () => console.log("GAS script loaded");
  script.onerror = () => console.error("GAS script failed " + script.src + ":");
  document.body.appendChild(script);
}

function handleSessionWords(data) {

  console.log("API RESPONSE:", data);

  if (!data.words) {
    alert("Failed to load session words");
    return;
  }

  sessionWordPool = data.words;

  applyQuestionCount = 1;
  document.getElementById("applyQuestionNumber").innerText = "1";

  document.getElementById("applyStartScreen").classList.add("hidden");
  document.getElementById("applySessionContent").classList.remove("hidden");

  document.getElementById("applyAnswer").value = "";
  document.getElementById("feedbackView").classList.add("hidden");
  document.getElementById("answerView").classList.remove("hidden");

  const actionBtn = document.getElementById("actionButton");
  const endBtn = document.getElementById("endSessionBtn");

  actionBtn.style.display = "inline-block";
  actionBtn.disabled = false;
  actionBtn.innerText = "Submit";

  actionBtn.classList.remove("fade-out");
  actionBtn.classList.add("fade-in");

  endBtn.classList.remove("fade-out");
  endBtn.classList.add("fade-in");

  endBtn.style.marginLeft = "";
  endBtn.style.marginRight = "";

  submitted = false;

  loadRoundWords();

  hideLoader();
}

function loadRoundWords() {

  const container = document.getElementById("applyWordContainer");

  // 🔥 RESET POSITION BEFORE ADDING BUBBLES
  container.style.transition = "none";
  container.style.transform = "translateX(0px)";

  container.innerHTML = "";

  // restore animation after reset
  setTimeout(() => {
    container.style.transition =
      "transform 0.55s cubic-bezier(.4,0,.2,1)";
  }, 20);

  currentApplyWords = [];

  sessionWordPool.forEach(wordObj => {

    const bubble = document.createElement("div");
    bubble.className = "apply-bubble";

    bubble.innerHTML = `
                
                <div class="apply-bubble-word">${wordObj.word}</div>
                <div class="apply-bubble-meaning">${wordObj.meaning}</div>
              `;
    container.appendChild(bubble);
  });

  updateVisibleWords();
}

function updateVisibleWords() {
  currentApplyWords = [];
  const start = currentRoundIndex * 3;
  const visibleWords = sessionWordPool.slice(start, start + 5);
  visibleWords.forEach(w => {
    currentApplyWords.push(w.word);
  });
  document.getElementById("applyQuestionNumber").innerText = currentRoundIndex + 1;
}

function showLogin() {

  document.getElementById("authOptions").classList.add("hidden");
  document.getElementById("signupForm").classList.add("hidden");   // hide signup
  document.getElementById("loginForm").classList.remove("hidden"); // show login

}

function showSignup() {
  document.getElementById("authOptions").classList.add("hidden");
  document.getElementById("loginForm").classList.add("hidden");    // hide login
  document.getElementById("signupForm").classList.remove("hidden"); // show signup

}


function updateLastLogin(userId) {

  const ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1a3B_Lxd0ew2Pyy_5lZYF9MqOw5gnqUZk9MXAPHRzjks/edit?gid=903897810#gid=903897810");
  const sheet = ss.getSheetByName("Users");

  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {

    if (rows[i][0] === userId) {
      sheet.getRange(i + 1, 6).setValue(new Date());
      break;
    }
  }
}

function applySavedTheme() {
  const theme = localStorage.getItem("theme");

  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    toggleBtn.innerHTML = "☀︎";
    shortDrakToggleBtn.innerHTML = "☀︎";
  } else {
    document.body.classList.remove("dark-mode");
    toggleBtn.innerHTML = "🌙︎";
    shortDrakToggleBtn.innerHTML = "🌙︎";
  }
}


async function loginUser() {

  showLoader();

  const userInput = document.getElementById("loginUser").value.trim();
  const passInput = document.getElementById("loginPass").value.trim();

  if (!userInput || !passInput) {
    hideLoader();
    alert("Please fill all fields");
    return;
  }

  try {

    const res = await fetch("https://script.google.com/macros/s/AKfycbxeWx6COIWQ2zrHc5wHVl2b9rrbtyOeWZxW7nJ-0Q1TTgjpoW6Q5-bg1UnOCGAtAzad/exec", {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        user: userInput,
        password: passInput
      })
    });

    const data = await res.json();

    if (!data.success) {
      hideLoader();
      alert("Invalid username/email or password");
      return;
    }

    const user = data.user;

    localStorage.setItem("loggedInUser", user.id);
    localStorage.setItem("userRole", user.role);

    const now = Date.now();

    localStorage.setItem("loginTimestamp", now);
    localStorage.setItem("lastActiveTime", now);
    localStorage.setItem("loginDate", new Date().toDateString());

    refreshLevelProgress();

    loadDoc();

    //toggleAndSyncDarkMode();
    applySavedTheme();

    loadDashboard();

  } catch (err) {

    console.error(err);
    alert("Server error. Try again.");
    hideLoader();

  }
}

function signupUser() {

  showLoader();

  const user = document.getElementById("signupUser").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const pass = document.getElementById("signupPass").value.trim();

  if (!user || !email || !pass) {
    hideLoader();
    alert("Please fill all fields");
    return;
  }


  fetch("https://script.google.com/macros/s/AKfycbxeWx6COIWQ2zrHc5wHVl2b9rrbtyOeWZxW7nJ-0Q1TTgjpoW6Q5-bg1UnOCGAtAzad/exec")
    .then(res => res.json())
    .then(data => {

      const users = data.user;

      const alreadyExists = users.find(u =>
        u.id === user || u.email === email
      );

      if (alreadyExists) {

        alert("User already registered. Please login.");

        document.getElementById("signupUser").value = "";
        document.getElementById("signupEmail").value = "";
        document.getElementById("signupPass").value = "";

        document.getElementById("signupForm").classList.add("hidden");
        document.getElementById("loginForm").classList.add("hidden");

        document.getElementById("authOptions").classList.remove("hidden");

        hideLoader();

        return;
      }

      fetch("https://script.google.com/macros/s/AKfycbxeWx6COIWQ2zrHc5wHVl2b9rrbtyOeWZxW7nJ-0Q1TTgjpoW6Q5-bg1UnOCGAtAzad/exec", {
        method: "POST",
        body: JSON.stringify({
          action: "register",
          id: user,
          email: email,
          password: pass
        })
      })
        .then(res => res.json())
        .then(response => {

          if (!response.success) {
            alert(response.message || "Signup failed");
            return;
          }

          alert("Signup successful. Please login.");
          location.reload();
          hideLoader();

        })
        .catch(err => {
          hideLoader();
          console.error(err);
          alert("Server error.");
        });

    })
    .catch(err => {
      hideLoader();
      console.error(err);
      alert("Server error.");
    });
}

function enterApp() {
  const user = localStorage.getItem("loggedInUser");
  document.getElementById("sidebarUserName").innerText = formatName(user);
  document.getElementById("authContainer").style.display = "none";
  document.querySelector(".app-layout").style.display = "flex";
}

function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    icon.innerText = "🙈";
  } else {
    input.type = "password";
    icon.innerText = "👁";
  }
}

function confirmLogout() {

  const confirmAction = confirm("Are you sure you want to logout?");

  if (confirmAction) {
    logoutUser();
  }

}

function logoutUser() {

  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("userLevel");
  localStorage.removeItem("overallAccuracy");

  // 🔐 Clear login fields
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";

  document.getElementById("signupUser").value = "";
  document.getElementById("signupEmail").value = "";
  document.getElementById("signupPass").value = "";

  // 🔥 Remove dark mode when logging out
  applySavedTheme();
  //localStorage.setItem("theme", "light");

  // Hide app
  document.querySelector(".app-layout").style.display = "none";

  // Show auth page
  document.getElementById("authContainer").style.display = "flex";

  // Reset auth UI
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("signupForm").classList.add("hidden");
  document.getElementById("authOptions").classList.remove("hidden");

  // Reset toggle icon
  document.getElementById("darkToggle").innerHTML = "🌙︎";
}

function refreshLevelProgress() {
  const userId = localStorage.getItem("loggedInUser");
  fetch("https://script.google.com/macros/s/AKfycbxeWx6COIWQ2zrHc5wHVl2b9rrbtyOeWZxW7nJ-0Q1TTgjpoW6Q5-bg1UnOCGAtAzad/exec" + "?action=getUserProgress&user_id=" + userId)
    .then(res => res.json())
    .then(data => {
      updateLevelUI(
        data.level,
        data.mastered_words,
        data.progressLevel.masteredInLevel,
        data.progressLevel.levelTarget
      );
    });
}


function endSession() {
  showLoader();

  if (attemptedQuestions === 0) {
    hideLoader();
    alert("You haven't attempted any questions.");
    return;
  }

  if (!confirm("Are you sure you want to end this session?")) {
    hideLoader();
    return;
  }

  const userId = localStorage.getItem("loggedInUser");
  const sessionId = "S" + Date.now();
  const cSessionAccuracy = calculateSessionAccuracy();

  console.log("sessionResults:"+JSON.stringify(sessionResults)+":");
  console.log("uniqueSessionWords-size:"+uniqueSessionWords.size+":");
  console.log("cSessionAccuracy:"+cSessionAccuracy+":");

  fetch("https://script.google.com/macros/s/AKfycbxeWx6COIWQ2zrHc5wHVl2b9rrbtyOeWZxW7nJ-0Q1TTgjpoW6Q5-bg1UnOCGAtAzad/exec", {
    method: "POST",
    body: JSON.stringify({
      action: "endSession",
      user_id: userId,
      session_id: sessionId,
      session_accuracy: cSessionAccuracy,
      words_attempted: uniqueSessionWords.size,
      ai_results: sessionResults
    }),
    mode: "no-cors"
  });

  /* refresh level progress */
  setTimeout(refreshLevelProgress, 1500);
  setTimeout(loadDashboard, 1500);

  alert("Session Ended Successfully!");

  attemptedQuestions = 0;
  sessionWordsData = [];

  document.getElementById("applySessionContent").classList.add("hidden");
  document.getElementById("applyStartScreen").classList.remove("hidden");

  hideLoader();

}

async function takeFullScreenshot() {

  const canvas = await html2canvas(document.body, {
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: document.body.scrollWidth,
    windowHeight: document.body.scrollHeight,
    scale: 2,
    useCORS: true
  });

  canvas.toBlob(async function (blob) {

    const item = new ClipboardItem({
      "image/png": blob
    });

    await navigator.clipboard.write([item]);

    alert("Screenshot copied to clipboard!");

  });

}

function resetApplySessionUI() {
  attemptedQuestions = 0;
  sessionWordsData = [];
  document.getElementById("applySessionContent").classList.add("hidden");
  document.getElementById("applyStartScreen").classList.remove("hidden");
}

function showLoader() {
  document.getElementById("loadingOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden"; // prevent scroll
}

function hideLoader() {
  document.getElementById("loadingOverlay").classList.add("hidden");
  document.body.style.overflow = "";
}

function animateWordShift() {
  const container = document.getElementById("applyWordContainer");
  const bubble = container.querySelector(".apply-bubble");
  const bubbleWidth = bubble.offsetWidth + 12; // include gap
  const shift = bubbleWidth * 3;
  container.style.transition = "transform 0.5s ease";
  container.style.transform = `translateX(-${shift}px)`;
}

function appendNewBubbles(words) {
  const container = document.getElementById("applyWordContainer");
  words.forEach(wordObj => {
    const bubble = document.createElement("div");
    bubble.className = "apply-bubble";
    bubble.innerHTML = `
              <div class="apply-bubble-word">${wordObj.word}</div>
              <div class="apply-bubble-meaning">${wordObj.meaning}</div>
              `;
    container.appendChild(bubble);
  });
}

function updateLevelUI(level, totalMastered, masteredInLevel, levelTarget) {

  const remaining = levelTarget - masteredInLevel;

  document.getElementById("userLevel").textContent = level;
  document.getElementById("levelStars").textContent = "⭐".repeat(level);

  /* LEVEL PROGRESS */
  document.getElementById("masteredWords").textContent = masteredInLevel;
  document.getElementById("targetWords").textContent = levelTarget;

  document.getElementById("progressDone").textContent = masteredInLevel;
  document.getElementById("progressRemaining").textContent = remaining;

  const percent = (masteredInLevel / levelTarget) * 100;
  document.getElementById("progressFill").style.width = percent + "%";

  /* TOTAL MASTERED */
  document.getElementById("totalMasteredWords").textContent = totalMastered;
}

async function openProfileModal() {
  document.getElementById("profileModal").classList.add("active");
  if (!dashboardData) {
    loadDashboard();
  }
}

function closeProfileModal() {
  document.getElementById("profileModal").classList.remove("active");
}

async function loadDashboard() {
  const userId = localStorage.getItem("loggedInUser");
  try {
    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbxeWx6COIWQ2zrHc5wHVl2b9rrbtyOeWZxW7nJ-0Q1TTgjpoW6Q5-bg1UnOCGAtAzad/exec" + "?action=getUserDashboard&user_id=" + userId
    );
    dashboardData = await res.json();
    populateDashboard(dashboardData);
  } catch (err) {
    console.error("Dashboard load failed", err);
  }
}

function populateDashboard(data) {
  document.getElementById("CurrentStreak").innerText =
    data.streak;
  document.getElementById("profileUserName").innerText =
    formatName(localStorage.getItem("loggedInUser") || "User");
  document.getElementById("profileLevel").innerText =
    data.level;
  document.getElementById("profileMastered").innerText =
    data.masteredWords;
  document.getElementById("profileSessions").innerText =
    data.sessions;
  document.getElementById("profileStreak").innerText =
    data.streak;

  loadInsights();

  /* graph */
  drawProgressGraph(data.graphData);

  data.wordPerformance.forEach((w, i) => {
    w.sno = i + 1;
  });
  /* table */
  fillWordTable(data.wordPerformance);

  const rowsSelect = document.getElementById("rowsPerPageSelect");

  if (rowsSelect) {
    rowsSelect.addEventListener("change", function () {
      console.log("Rows changed:", this.value);
      wordTableRowsPerPage = Number(this.value);
      wordTablePage = 1;
      fillWordTable(wordTableFiltered);
    });
  }
}

let progressChart;

function drawProgressGraph(graphData) {

  // const isDark = document.body.classList.contains("dark-mode");

  const axisColor = "#666666"; //isDark ? "#666666" : "#e5e5e5";
  const gridColor = "#666666"; //isDark ? "#666666" : "#e5e5e5";

  const canvas = document.getElementById("progressChart");

  if (progressChart) {
    progressChart.destroy();
  }

  const graphType =
    document.getElementById("graphType").value;

  const timeline =
    document.getElementById("timelineType").value;

  /* axis labels */

  let yLabel = "Words Mastered";
  let xLabel = "Sessions";

  /* Y-axis controlled by graph type */

  if (graphType === "accuracy") {
    yLabel = "Accuracy (%)";
  }

  if (graphType === "mastery") {
    yLabel = "Words Mastered";
  }

  /* X-axis controlled by timeline */

  if (timeline === "sessions") {
    xLabel = "Sessions";
  }

  if (timeline === "date") {
    xLabel = "Date";
  }

  progressChart = new Chart(canvas, {


    type: 'line',

    data: {
      labels: graphData.labels,
      datasets: [{
        label: yLabel,
        data: (graphType === "accuracy") ? graphData.accuracy : graphData.mastered,
        borderColor: '#2563eb',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        fill: true,
        backgroundColor: 'rgba(37,99,235,0.12)'
      }]
    },

    options: {
      responsive: true,

      plugins: {
        legend: { display: false }
      },

      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 100,
          ticks: {
            stepSize: 5,
            color: axisColor
          },
          grid: { color: gridColor },
          title: {
            display: true,
            text: xLabel
          }
        },

        y: {
          min: 0,
          max: 1000,
          ticks: {
            stepSize: 50,
            color: axisColor
          },
          grid: { color: gridColor },
          title: {
            display: true,
            text: yLabel
          }
        }
      }

    }

  });

  updateGraphMode();
  updateAxisSettings();
}

function nextWordPage() {
  const totalPages =
    Math.ceil(wordTableFiltered.length / wordTableRowsPerPage);
  if (wordTablePage < totalPages) {
    wordTablePage++;
    fillWordTable(wordTableFiltered);
  }
}

function prevWordPage() {
  if (wordTablePage > 1) {
    wordTablePage--;
    fillWordTable(wordTableFiltered);
  }
}

function goToWordPage(page) {
  wordTablePage = page;
  fillWordTable(wordTableFiltered);
}

function jumpToPage() {
  const input = document.getElementById("pageJumpInput");
  const page = Number(input.value);
  const totalPages = Math.ceil(wordTableFiltered.length / wordTableRowsPerPage);
  if (page >= 1 && page <= totalPages) {
    wordTablePage = page;
    fillWordTable(wordTableFiltered);
  }
}

function renderWordPagination() {
  const container = document.getElementById("wordPagination");
  if (!container) return;

  const totalPages =
    Math.ceil(wordTableFiltered.length / wordTableRowsPerPage);

  let pages = "";

  for (let i = 1; i <= totalPages; i++) {
    pages += `<span class="pageNum ${i === wordTablePage ? "activePage" : ""}"onclick="goToWordPage(${i})">${i}</span>`;
  }

  container.innerHTML = `
<div class="paginationBar">

<button class="paginationBtn" onclick="prevWordPage()" ${wordTablePage === 1 ? "disabled" : ""}>
Prev
</button>

<span class="pageInfo">
Page ${wordTablePage} / ${totalPages}
</span>

<button class="paginationBtn" onclick="nextWordPage()" ${wordTablePage === totalPages ? "disabled" : ""}>
Next
</button>

<div class="pageNumbers">
${pages}
</div>

<div class="pageJump">
<input type="number" id="pageJumpInput" min="1" max="${totalPages}" placeholder="pg no">
<button id="pageJumpBtn" class="paginationBtn" onclick="jumpToPage()">Go</button>
</div>

</div>
`;
}

function fillWordTable(words) {
  const table = document.getElementById("wordTableBody");
  table.innerHTML = "";
  wordTableFiltered = words;
  const start = (wordTablePage - 1) * wordTableRowsPerPage;
  const end = start + wordTableRowsPerPage;
  const pageRows = wordTableFiltered.slice(start, end);
  pageRows.forEach((w, i) => {
    const row = `
<tr>
<td>${w.sno}</td>
<td>${w.word}</td>
<td>${w.level}</td>
<td class="${accuracyColor(w.accuracy)}">${w.accuracy}%</td>
<td>${w.used}</td>
<td>${"█".repeat(Math.min(w.streak, 8))}</td>
</tr>
`;
    table.insertAdjacentHTML("beforeend", row);
  });
  renderWordPagination();
}

function accuracyColor(acc) {
  if (acc >= 90) return "greenAcc";
  if (acc >= 70) return "yellowAcc";
  return "redAcc";
}

function addWordRow(i, word, level, accuracy, used, streak) {
  const row = `
<tr>
<td>${i}</td>
<td>${word}</td>
<td>${level}</td>
<td class="${accuracyColor(accuracy)}">${accuracy}%</td>
<td>${used}</td>
<td>██████░░</td>
</tr>
`;
  document.getElementById("wordTableBody").innerHTML += row;
}

function searchWordTable() {
  const input =
    document.getElementById("wordSearchInput").value.toLowerCase();
  const filtered =
    dashboardData.wordPerformance.filter(w =>
      w.word.toLowerCase().includes(input)
    );
  wordTablePage = 1;
  fillWordTable(filtered);
}

function updateGraphMode() {

  if (!progressChart) return;

  const graphType = document.getElementById("graphType").value;
  const timeline = document.getElementById("timelineType").value;

  const yMaxInput = document.getElementById("yMax");
  const yIntervalInput = document.getElementById("yInterval");

  let yLabel = "Words Mastered";
  let xLabel = "Sessions";

  /* -------- Y Axis (Graph Type) -------- */

  /* -------- Y Axis (Graph Type) -------- */

  if (graphType !== lastGraphType) {

    if (graphType === "accuracy") {
      yLabel = "Accuracy (%)";
      yMaxInput.value = 100;
      yIntervalInput.value = 5;
      progressChart.data.datasets[0].data = dashboardData.graphData.accuracy;
    }

    if (graphType === "mastery") {
      yLabel = "Words Mastered";
      yMaxInput.value = 1000;
      yIntervalInput.value = 50;
      progressChart.data.datasets[0].data = dashboardData.graphData.mastered;
    }

    lastGraphType = graphType;
  }

  /* -------- X Axis (Timeline) -------- */

  if (timeline === "sessions") {
    xLabel = "Sessions";
  }

  if (timeline === "date") {
    xLabel = "Date";
  }

  /* -------- Apply Labels -------- */

  progressChart.options.scales.y.title.display = true;
  progressChart.options.scales.x.title.display = true;

  progressChart.options.scales.y.title.text = yLabel;
  progressChart.options.scales.x.title.text = xLabel;

  /* -------- Dataset label -------- */

  progressChart.data.datasets[0].label = yLabel;

  /* -------- Apply new axis scale -------- */

  updateAxisSettings();

  progressChart.update();
}


function updateAxisSettings() {

  const xMax = parseInt(document.getElementById("xMax").value);
  const xInterval = parseInt(document.getElementById("xInterval").value);

  const yMax = parseInt(document.getElementById("yMax").value);
  const yInterval = parseInt(document.getElementById("yInterval").value);

  if (!progressChart) return;

  progressChart.options.scales.x.max = xMax;
  progressChart.options.scales.x.ticks.stepSize = xInterval;

  progressChart.options.scales.y.max = yMax;
  progressChart.options.scales.y.ticks.stepSize = yInterval;

  progressChart.update();
}

function resetSortArrows() {
  document.querySelectorAll(".sort-arrow").forEach(a => {
    a.innerHTML = "↕";
    a.classList.remove("active-sort");
  });
}

function sortWordTable(column) {

  if (!dashboardData || !dashboardData.wordPerformance) return;

  if (wordTableSort.column === column) {
    wordTableSort.direction =
      wordTableSort.direction === "asc" ? "desc" : "asc";
  } else {
    wordTableSort.column = column;
    wordTableSort.direction = "asc";
  }

  const dir = wordTableSort.direction === "asc" ? 1 : -1;

  dashboardData.wordPerformance.sort((a, b) => {

    let v1 = a[column];
    let v2 = b[column];

    if (isNaN(v1) || isNaN(v2)) {
      return String(v1).localeCompare(String(v2)) * dir;
    }

    return (Number(v1) - Number(v2)) * dir;

  });

  fillWordTable(dashboardData.wordPerformance);

  resetSortArrows();

  const arrow = document.getElementById("arrow-" + column);

  if (arrow) {
    arrow.innerHTML =
      wordTableSort.direction === "asc" ? "▲" : "▼";
    arrow.classList.add("active-sort");
  }
}

function renderInsights(data) {

  const container = document.getElementById("insightsList");

  container.innerHTML = `
<div class="insight">⭐You have mastered ${data.weeklyMastered ?? 0} words this week</div>
<div class="insight">📝${data.weakWords ?? 0} words need revision</div>
  `;

}

async function loadInsights() {
  const userId = localStorage.getItem("loggedInUser");
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbxeWx6COIWQ2zrHc5wHVl2b9rrbtyOeWZxW7nJ-0Q1TTgjpoW6Q5-bg1UnOCGAtAzad/exec" + "?action=getUserInsights&user_id=" + userId
  );
  const insightData = await res.json();
  renderInsights(insightData);
}

function renderAIAnalysis(data) {

  const container = document.getElementById("aiSuggestion");
  container.innerHTML = "";

  if (!data) return;

  if (!Array.isArray(data)) {
    container.innerHTML = `
      <div class="ai-card">${data}</div>
    `;
    return;
  }

  data.forEach((item, index) => {

    const word = currentApplyWords[index] || "";

    const original = highlightWordsInText(item.original || "", currentApplyWords);
    const improved = highlightWordsInText(item.improved || "", currentApplyWords);
    const suggestion = highlightWordsInText(item.suggestion || "", currentApplyWords);

    const card = `
      <div class="ai-card">
        <div class="ai-word-header">
          WORD: <span class="response-word-pill">${word.toUpperCase()}</span>
        </div>
        <div class="ai-section">
          <strong>Original:</strong>
          <span class="ai-text">${original}</span>
        </div>
        ${item.improved ? `
        <div class="ai-section">
          <strong>Improved:</strong>
          <span class="ai-text">${improved}</span>
          <button class="copy-btn"
            onclick="copyText('${item.improved.replace(/'/g, "\\'")}')">
            📋
          </button>
        </div>
        ` : ""}
        ${item.suggestion ? `
        <div class="ai-suggestion">
          <strong>Suggestion:</strong> ${suggestion}
        </div>
        ` : ""}
      </div>
    `;
    container.insertAdjacentHTML("beforeend", card);
  });
}

function copyText(text) {
  navigator.clipboard.writeText(text);
}