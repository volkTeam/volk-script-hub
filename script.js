:root {
  --bg-color: #0f0f13;
  --card-bg: #16161c;
  --accent-color: #00bcd4;
  --accent-hover: #00acc1;
  --text-main: #ffffff;
  --text-muted: #9e9e9e;
  --border-color: #2a2a35;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

body {
  background-color: var(--bg-color);
  color: var(--text-main);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 15px;
}

.logo {
  font-size: 20px;
  font-weight: bold;
  color: var(--accent-color);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.nav-search input {
  padding: 8px 14px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-main);
  width: 250px;
  font-size: 14px;
}

.nav-search input:focus {
  border-color: var(--accent-color);
  outline: none;
}

.nav-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

button, .btn {
  background-color: transparent;
  color: var(--text-main);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: 0.2s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

button:hover, .btn:hover {
  border-color: var(--accent-color);
}

.btn-primary {
  background-color: var(--accent-color);
  color: #000;
  border: none;
}

.btn-primary:hover {
  background-color: var(--accent-hover);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  width: 100%;
  flex: 1;
}

.page-section {
  display: none;
  position: relative;
  z-index: 10;
}

.page-section.active {
  display: block;
}

.hero-banner {
  text-align: center;
  padding: 30px 20px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 30px;
}

.hero-banner h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.hero-banner p {
  color: var(--text-muted);
  margin-bottom: 20px;
}

.auth-container {
  max-width: 400px;
  margin: 20px auto;
  background-color: var(--card-bg);
  padding: 30px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.auth-container h2 {
  margin-bottom: 10px;
  color: var(--text-main);
}

.auth-container p {
  color: var(--text-muted);
  font-size: 14px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 5px;
}

.form-group input, .form-group textarea {
  width: 100%;
  padding: 10px 12px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-main);
  font-size: 14px;
}

.form-group input:focus, .form-group textarea:focus {
  border-color: var(--accent-color);
  outline: none;
}

.scripts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.script-card {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.script-card h3 {
  font-size: 18px;
  margin-bottom: 5px;
}

.script-card .game-tag {
  color: var(--accent-color);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}

.script-card p {
  color: var(--text-muted);
  font-size: 14px;
  margin-bottom: 15px;
}

@media(max-width: 768px) {
  header {
    flex-direction: column;
    align-items: stretch;
  }
  .nav-search input {
    width: 100%;
  }
}
