const roleSelect = document.getElementById('role');
const roleField = document.getElementById('roleSpecificField');
const passwordError = document.getElementById('passwordError');

const departmentField = document.getElementById("department").parentElement;
const levelField = document.getElementById("level").parentElement;

departmentField.style.display = "none";
levelField.style.display = "none";

roleSelect.addEventListener("change", () => {
  if (roleSelect.value === "student") {
    departmentField.style.display = "block";
    levelField.style.display = "block";
  } else {
    departmentField.style.display = "none";
    levelField.style.display = "none";
  }
});


// 🔐 DEBUG: confirm token exists
console.log("🔐 Admin token:", localStorage.getItem("token"));

// Fetch next ID when role is selected
roleSelect.addEventListener('change', async () => {
  const role = roleSelect.value;

  if (!role) {
    roleField.value = '';
    return;
  }

  try {
    const response = await fetch(`/api/next-id/${role}`);
    const data = await response.json();

    if (response.ok) {
      roleField.value = data.nextId;
    } else {
      roleField.value = 'Error loading ID';
    }
  } catch (error) {
    console.error('Error fetching next ID:', error);
    roleField.value = 'Error';
  }
});

// Handle form submission
document.getElementById('registrationForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const role = document.getElementById('role').value;
  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const department = document.getElementById("department").value;
  const level = document.getElementById("level").value;

  if (password !== confirmPassword) {
    passwordError.style.display = 'block';
    return;
  } else {
    passwordError.style.display = 'none';
  }

  const token = localStorage.getItem("token");

  if (!token) {
    alert("You must be logged in as an admin to register users.");
    return;
  }

  const data = {
  role,
  fullName,
  email,
  password,
  department,
  level
};

  try {
    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ✅ THIS IS THE MISSING LINE
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(data)
    });

    // 🔒 Not logged in / token missing
    if (response.status === 401) {
      alert("Unauthorized. Please login again.");
      return;
    }

    // 🚫 Logged in but not admin
    if (response.status === 403) {
      alert("Access denied. Only admins can register users.");
      return;
    }

    // ⚠️ Email exists
    if (response.status === 409) {
      const result = await response.json();
      alert(result.error);
      return;
    }

    if (response.ok) {
      const result = await response.json();
      alert(`Registration successful!\nGenerated ID: ${result.generatedId}`);

      document.getElementById('registrationForm').reset();
      roleField.value = '';
    } else {
      alert('Registration failed!');
    }

  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while registering.');
  }
});
