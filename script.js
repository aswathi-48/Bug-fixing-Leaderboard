const STORAGE_KEY = "devix_bugfixing_leaderboard_v1";
let students = loadStudents();

const $ = (id) => document.getElementById(id);
const form = $("studentForm");

function loadStudents() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveStudents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}
function showMessage(message, isError = false) {
  $("formMessage").textContent = message;
  $("formMessage").style.color = isError ? "#b3261e" : "#197346";
}
function clearForm() {
  form.reset();
  $("editId").value = "";
  $("paperSet").value = "A";
  $("saveButton").textContent = "Add Student Score";
}
function sortedStudents() {
  return [...students].sort((a,b) => b.marks - a.marks || a.name.localeCompare(b.name));
}
function render() {
  const sorted = sortedStudents();
  $("participantCount").textContent = students.length;
  $("markedCount").textContent = students.length;
  $("highestScore").textContent = sorted.length ? `${sorted[0].marks}/100` : "—";
  renderMarksChart(sorted);
  const body = $("leaderboardBody");
  if (!sorted.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">No scores added yet.</td></tr>';
    return;
  }
  let previousScore = null, currentRank = 0;
  body.innerHTML = sorted.map((student, index) => {
    if (student.marks !== previousScore) currentRank = index + 1;
    previousScore = student.marks;
    return `<tr>
      <td class="rank">#${currentRank}</td>
      <td>${escapeHtml(student.studentId)}</td>
      <td>${escapeHtml(student.name)}</td>
      <td>Set ${student.set}</td>
      <td class="score">${student.marks}/100</td>
      <td>
        <button class="action-btn edit" data-edit="${student.id}">Edit</button>
        <button class="action-btn remove" data-delete="${student.id}">Delete</button>
      </td>
    </tr>`;
  }).join("");
}
function renderMarksChart(sorted) {
  const chart = $("marksChart");
  const selectedSet = $("chartSetFilter").value;
  const visibleStudents = selectedSet === "all" ? sorted : sorted.filter(student => student.set === selectedSet);
  if (!visibleStudents.length) {
    chart.innerHTML = `<p class="empty">${sorted.length ? `No scores for Set ${selectedSet}.` : "Add student marks to see the dashboard."}</p>`;
    return;
  }
  chart.innerHTML = `
    <div class="chart-frame">
      <div class="chart-axis" aria-hidden="true"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
      <div class="chart-scroll">
        <div class="chart-plot" role="group" aria-label="Student marks from 0 to 100">
          <div class="chart-columns">
          ${visibleStudents.map(student => `
            <div class="chart-column">
              <div class="chart-bar" role="progressbar" aria-label="${escapeHtml(student.name)} marks"
                   aria-valuemin="0" aria-valuemax="100" aria-valuenow="${student.marks}"
                   style="height:${student.marks}%"></div>
            </div>`).join("")}
          </div>
        </div>
        <div class="chart-labels">
          ${visibleStudents.map(student => `
            <div class="chart-label">
              <strong class="chart-score">${student.marks}/100</strong>
              <span class="chart-name">${escapeHtml(student.name)}</span>
              <span class="chart-id">${escapeHtml(student.studentId)} · Set ${student.set}</span>
            </div>`).join("")}
        </div>
      </div>
    </div>`;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const studentId = $("studentId").value.trim();
  const name = $("studentName").value.trim();
  const set = $("paperSet").value;
  const marks = Number($("marks").value);
  const editId = $("editId").value;
  if (!studentId || !name || !Number.isInteger(marks) || marks < 0 || marks > 100) {
    showMessage("Enter valid details and a whole-number score from 0 to 100.", true);
    return;
  }
  const duplicate = students.find(s => s.studentId.toLowerCase() === studentId.toLowerCase() && s.id !== editId);
  if (duplicate) {
    showMessage("This Student ID already exists. Use a unique ID.", true);
    return;
  }
  if (editId) {
    students = students.map(s => s.id === editId ? {...s, studentId, name, set, marks} : s);
    showMessage("Student score updated.");
  } else {
    students.push({id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), studentId, name, set, marks});
    showMessage("Student score added.");
  }
  saveStudents(); render(); clearForm();
});
$("clearButton").addEventListener("click", () => { clearForm(); showMessage(""); });
$("marksDashboardToggle").addEventListener("click", () => {
  const dashboard = $("marksDashboard");
  const isExpanded = $("marksDashboardToggle").getAttribute("aria-expanded") === "true";
  dashboard.hidden = isExpanded;
  $("marksDashboardToggle").setAttribute("aria-expanded", String(!isExpanded));
  $("marksDashboardToggle").textContent = isExpanded ? "Show dashboard" : "Hide dashboard";
});
$("chartSetFilter").addEventListener("change", () => renderMarksChart(sortedStudents()));
$("leaderboardBody").addEventListener("click", (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) {
    const s = students.find(item => item.id === editId);
    if (!s) return;
    $("editId").value = s.id; $("studentId").value = s.studentId;
    $("studentName").value = s.name; $("paperSet").value = s.set;
    $("marks").value = s.marks; $("saveButton").textContent = "Update Student Score";
    showMessage(`Editing ${s.name}. Change the details and select Update Student Score.`);
    window.scrollTo({top:0,behavior:"smooth"});
  }
  if (deleteId) {
    const s = students.find(item => item.id === deleteId);
    if (s && confirm(`Delete ${s.name}'s score?`)) {
      students = students.filter(item => item.id !== deleteId);
      saveStudents(); render(); showMessage("Student score deleted.");
    }
  }
});
$("exportButton").addEventListener("click", () => {
  if (!students.length) { alert("There are no scores to export."); return; }
  const rows = [["Rank","Student ID","Student Name","Set","Marks"]];
  let previous = null, rank = 0;
  sortedStudents().forEach((s,i) => {
    if (s.marks !== previous) rank = i + 1;
    previous = s.marks;
    rows.push([rank,s.studentId,s.name,`Set ${s.set}`,s.marks]);
  });
  const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "devix-bug-fixing-leaderboard.csv"; a.click();
  URL.revokeObjectURL(url);
});
$("resetButton").addEventListener("click", () => {
  if (confirm("Permanently delete all leaderboard entries from this browser? Export a CSV backup first if needed.")) {
    students = []; saveStudents(); render(); clearForm(); showMessage("All leaderboard data has been cleared.");
  }
});
render();
