const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");
const year = document.getElementById("year");
const form = document.getElementById("contactForm");
const statusEl = document.getElementById("formStatus");

year.textContent = new Date().getFullYear();

menuBtn?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll(".nav a").forEach(link => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  });
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button[type='submit']");
  const data = Object.fromEntries(new FormData(form).entries());

  statusEl.className = "form-status";
  statusEl.textContent = "Sending…";
  button.disabled = true;
  button.style.opacity = ".65";

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();

    if (!response.ok || !result.ok) throw new Error(result.message || "Something went wrong.");

    statusEl.className = "form-status success";
    statusEl.textContent = result.message;
    form.reset();
  } catch (error) {
    statusEl.className = "form-status error";
    statusEl.textContent = error.message || "Unable to send your message.";
  } finally {
    button.disabled = false;
    button.style.opacity = "1";
  }
});

const themeBtn = document.getElementById("themeBtn");
const savedTheme = localStorage.getItem("aryan-theme");
if (savedTheme === "light") document.body.classList.add("light");
themeBtn?.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("aryan-theme", document.body.classList.contains("light") ? "light" : "dark");
});
