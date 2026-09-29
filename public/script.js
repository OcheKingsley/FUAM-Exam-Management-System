document.getElementById('examForm').addEventListener('submit', function(event) {
    event.preventDefault();
  
    // Fetch values from form inputs
    const courseTitle = document.getElementById('courseTitle').value;
    const courseCode = document.getElementById('courseCode').value;
    const eligibleDepartment = document.getElementById('eligibleDepartment').value;
    const eligibleLevel = document.getElementById('eligibleLevel').value;
    const unitAllocated = document.getElementById('unitAllocated').value;
    const allocatedTime = document.getElementById('allocatedTime').value;
    const examTime = document.getElementById('examTime').value;
    const endTime = document.getElementById('endTime').value;
  
    // You can perform additional validation if needed
  
    // Display success message
    const message = document.getElementById('message');
    message.style.display = 'block';
    message.textContent = `Exam assigned successfully for ${courseTitle}.`;
  
    // Optional: Clear form inputs after submission
    document.getElementById('examForm').reset();
  });
  