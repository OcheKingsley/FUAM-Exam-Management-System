document.getElementById('examForm').addEventListener('submit', function(event) { 
  event.preventDefault();

  const formData = new FormData(this);
  const jsonObject = {};
  formData.forEach((value, key) => { jsonObject[key] = value });

  // Get token from localStorage
  const token = localStorage.getItem('token');

  if (!token) {
    alert('You must be logged in to assign an exam.');
    return;
  }

  fetch('/assignExam', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token // ✅ Attach token here
      },
      body: JSON.stringify(jsonObject)
  })
  .then(async response => {
      const data = await response.text(); // or response.json() if backend returns JSON
      console.log(data); // Log response from server
      document.getElementById('message').textContent = data;
      document.getElementById('message').style.display = 'block';
      document.getElementById('examForm').reset(); // Optional: Reset form after submission
  })
  .catch(error => {
      console.error('Error:', error);
      document.getElementById('message').textContent = 'Error assigning exam';
      document.getElementById('message').style.display = 'block';
  });
});
