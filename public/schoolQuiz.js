let examId = null;
let userAnswers = {};
let allQuestions = [];
let currentQuestionIndex = 0;
let allocatedTime = 0;

document.addEventListener('DOMContentLoaded', function () {
    // Get examId from query param or URL path
    const urlParams = new URLSearchParams(window.location.search);
    examId = urlParams.get('examId') || window.location.pathname.split('/').pop();

    if (!examId) {
        document.getElementById('message').innerHTML = 'No exam selected';
        return;
    }

    fetchExamData(examId);
});

// ---------------- FETCH EXAM DATA ----------------
function fetchExamData(examId) {
    fetch(`/api/quiz/${examId}`, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    })
    .then(res => {
        if (res.status === 403) throw new Error("EXAM_TAKEN");
        if (!res.ok) throw new Error("Failed to fetch exam data");
        return res.json();
    })
    .then(data => {
        // Set global variables
        allQuestions = data.questions;
        allocatedTime = data.exam.allocatedTime;

        renderExamDetails(data.exam);
        if (allQuestions.length > 0) {
            showQuestion(currentQuestionIndex);
            setupNavigation();
        } else {
            document.getElementById('question-container').innerHTML = 'No questions found.';
        }

        startTimer(); // Pass allocatedTime
    })
    .catch(err => {
        if (err.message === "EXAM_TAKEN") {
            document.body.innerHTML = `
                <h2 style="text-align:center;margin-top:50px;">
                    ❌ You have already taken this exam
                </h2>
            `;
        } else {
            console.error(err);
        }
    });
}

// ---------------- RENDER EXAM DETAILS ----------------
function renderExamDetails(examDetails) {
    document.getElementById('exam-container').innerHTML = `
        <h2>${examDetails.courseTitle}</h2>
        <p>Course Code: ${examDetails.courseCode}</p>
        <p>Eligible Department: ${examDetails.eligibleDepartment}</p>
        <p>Eligible Level: ${examDetails.eligibleLevel}</p>
        <p>Allocated Time: ${examDetails.allocatedTime} minutes</p>
    `;
}

// ---------------- QUESTIONS ----------------
function showQuestion(index) {
    const question = allQuestions[index];

    document.getElementById('question-container').innerHTML = `
        <p><strong>Question ${index + 1}:</strong> ${question.question}</p>
        ${['A','B','C','D'].map(opt => `
            <label>
                <input type="radio"
                       name="answer"
                       value="${opt}"
                       ${userAnswers[question.id] === opt ? 'checked' : ''}>
                ${opt}. ${question['option' + opt]}
            </label><br>
        `).join('')}
    `;

    document.querySelectorAll('input[name="answer"]').forEach(radio => {
        radio.addEventListener('change', e => {
            userAnswers[question.id] = e.target.value;
        });
    });

    updateNavButtons();
}

// ---------------- NAVIGATION ----------------
function setupNavigation() {
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');

    if (!nextBtn || !prevBtn) return;

    nextBtn.classList.remove('hidden');
    prevBtn.classList.remove('hidden');

    nextBtn.onclick = () => {
        if (currentQuestionIndex === allQuestions.length - 1) {
            submitExam();
        } else {
            currentQuestionIndex++;
            showQuestion(currentQuestionIndex);
        }
    };

    prevBtn.onclick = () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showQuestion(currentQuestionIndex);
        }
    };

    updateNavButtons();
}

function updateNavButtons() {
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');

    if (!nextBtn || !prevBtn) return;

    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.textContent = currentQuestionIndex === allQuestions.length - 1 ? 'Submit' : 'Next';
}

// ---------------- SUBMIT ----------------
function submitExam() {
    fetch('/api/submit-exam', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ examId, answers: userAnswers })
    })
    .then(res => res.json())
    .then(data => {
        document.body.innerHTML = `
            <div style="text-align:center; margin-top:50px;">
                <h2>Exam Submitted Successfully</h2>
                <p>Score: ${data.score}/${data.total}</p>
                <p>Percentage: ${data.percentage.toFixed(2)}%</p>
                <p>Weighted Score: ${data.weighted.toFixed(2)}</p>
            </div>
        `;
    })
    .catch(() => alert("Submission failed"));
}

// ---------------- TIMER ----------------
function startTimer() {
    const timerContainer = document.getElementById('timer-container');
    if (!timerContainer) return;

    const endTime = Date.now() + allocatedTime * 60 * 1000;

    const intervalId = setInterval(() => {
        const timeLeft = endTime - Date.now();

        if (timeLeft <= 0) {
            clearInterval(intervalId);
            timerContainer.innerHTML = "Time's up!";
            submitExam();
        } else {
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            timerContainer.innerHTML = `Time left: ${minutes}m ${seconds}s`;
        }
    }, 1000);
}
