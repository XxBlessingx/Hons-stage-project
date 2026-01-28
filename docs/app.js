document.getElementById("signup-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  console.log("Signup attempt:", email, password);

  alert("Signup functionality coming next 🚀");
});
