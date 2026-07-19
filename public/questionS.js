let questions = [];

document.addEventListener('DOMContentLoaded', function () {
  fetchExamTitles();
});

function fetchExamTitles() {
  const token = localStorage.getItem('token');

  fetch('/api/exam-courseTitle', {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Unauthorized or failed request');
      }
      return response.json();
    })
    .then(data => {
      console.log('Data received:', data);

      const examSelect = document.getElementById('exam');
      examSelect.innerHTML = '<option value="">Select Exam</option>';

      data.forEach(exam => {
        const option = document.createElement('option');
        option.value = exam.id;
        option.textContent = exam.courseTitle;
        examSelect.appendChild(option);
      });
    })
    .catch(err => console.error('Error fetching exam titles:', err));
}


function addQuestion() {
  const questionInput = document.getElementById('question');
  const options = ['A', 'B', 'C', 'D'];
  const correctAnswer = options.find(option => document.getElementById(`option${option}`).checked);
  
  const question = questionInput.value.trim();
  
  const optionTexts = options.reduce((acc, option) => {
    acc[option] = document.getElementById(`option${option}Text`).value.trim();
    return acc;
  }, {});
  
  const examSelect = document.getElementById('exam');
  const examId = examSelect.value;
  const examTitle = examSelect.options[examSelect.selectedIndex].text; // Get the selected exam title
  
  if (!examId) {
    alert("Please select an exam.");
    return;
  }

  if (question && correctAnswer && examId) {
    const newQuestion = {
      examId: examId, // Store exam ID
      examTitle: examTitle, // Store exam title
      question: question,
      optionA: optionTexts['A'],
      optionB: optionTexts['B'],
      optionC: optionTexts['C'],
      optionD: optionTexts['D'],
      correctAnswer: correctAnswer
    };
    
    questions.push(newQuestion);
    displayQuestions();
    clearForm();
  } else {
    alert("Please enter a question, select the correct answer, and choose an exam.");
  }
}



function displayQuestions() {
  const questionListDiv = document.getElementById('questionList');
  questionListDiv.innerHTML = '';
  
  questions.forEach((q, index) => {
    const questionDiv = document.createElement('div');
    questionDiv.classList.add('question-item');
    
    questionDiv.innerHTML = `
      <p><strong>Exam:</strong> ${q.examTitle}</p>
      <p><strong>Question:</strong> ${q.question}</p>
      <p><strong>Options:</strong></p>
      <ul>
        <li>A: ${q.optionA} ${q.correctAnswer === 'A' ? '✔' : ''}</li>
        <li>B: ${q.optionB} ${q.correctAnswer === 'B' ? '✔' : ''}</li>
        <li>C: ${q.optionC} ${q.correctAnswer === 'C' ? '✔' : ''}</li>
        <li>D: ${q.optionD} ${q.correctAnswer === 'D' ? '✔' : ''}</li>
      </ul>
      <p><strong>Correct Answer:</strong> ${q.correctAnswer}</p>
      <button onclick="editQuestion(${index})">Edit</button>
      <button onclick="deleteQuestion(${index})">Delete</button>
    `;
    
    questionListDiv.appendChild(questionDiv);
  });
}



function clearForm() {
  document.getElementById('question').value = '';
  document.querySelectorAll('textarea').forEach(textarea => textarea.value = '');
  const checkedRadio = document.querySelector('input[name="correctAnswer"]:checked');
  if (checkedRadio) {
    checkedRadio.checked = false;
  }
}

function editQuestion(index) {
  const questionToEdit = questions[index];
  if (questionToEdit) {
    document.getElementById('question').value = questionToEdit.question;
    ['A', 'B', 'C', 'D'].forEach(option => {
      document.getElementById(`option${option}Text`).value = questionToEdit[`option${option}`];
      document.getElementById(`option${option}`).checked = questionToEdit.correctAnswer === option;
    });
    // Find the index of the exam title and set it
    const examSelect = document.getElementById('exam');
    const options = Array.from(examSelect.options);
    const selectedIndex = options.findIndex(option => option.text === questionToEdit.examTitle);
    if (selectedIndex !== -1) {
      examSelect.selectedIndex = selectedIndex;
    }
    questions.splice(index, 1);
    displayQuestions();
  }
}


function deleteQuestion(index) {
  questions.splice(index, 1);
  displayQuestions();
}

async function submitAllQuestions() {
  const submitBtn = document.getElementById("submitAllQuestions");

  // Prevent double click
  if (submitBtn.disabled) return;

  if (questions.length === 0) {
    alert("No questions to submit.");
    return;
  }

  const invalidQuestions = questions.filter(q => !q.examId);

  if (invalidQuestions.length > 0) {
    alert("Some questions are missing the exam information.");
    return;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    alert("You must be logged in.");
    return;
  }

  // Disable button immediately
  submitBtn.disabled = true;
  submitBtn.innerText = "Submitting...";

  try {
    const response = await fetch("/submitQuestion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(questions)
    });

    const result = await response.json();

    if (response.ok) {

      alert(result.message);

      // Clear submitted questions
      questions = [];
      displayQuestions();

      // Optional: clear form
      clearForm();

      // Keep button disabled permanently
      submitBtn.innerText = "Submitted";

    } else {

      alert(result.message || "Submission failed.");

      // Allow another attempt if it failed
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit All Questions";
    }

  } catch (error) {

    console.error(error);

    alert("Network error. Please try again.");

    submitBtn.disabled = false;
    submitBtn.innerText = "Submit All Questions";
  }
}



document.getElementById('submitAllQuestions').addEventListener('click', submitAllQuestions);
