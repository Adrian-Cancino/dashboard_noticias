<script>
  import { page } from '$app/stores';
</script>

<nav class="navbar">
  <div class="nav-container">
    <div class="nav-brand">
      <span class="brand-text">Dashboard Electoral SLP</span>
    </div>
    <div class="nav-links">
      <a href="/" class="nav-link {!$page.url.pathname || $page.url.pathname === '/' ? 'active' : ''}">
        📊 Análisis de Noticias
      </a>
      <a href="/mapa" class="nav-link {$page.url.pathname === '/mapa' ? 'active' : ''}">
        🗺️ Mapa Electoral
      </a>
    </div>
  </div>
</nav>

<main>
  <slot />
</main>

<style>
  .navbar {
    background: white;
    border-bottom: 1px solid #e1e4e8;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    position: sticky;
    top: 0;
    z-index: 1000;
  }

  .nav-container {
    max-width: 1600px;
    margin: 0 auto;
    padding: 0 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 60px;
  }

  .nav-brand {
    font-size: 18px;
    font-weight: 700;
    color: #24292e;
  }

  .brand-text {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-links {
    display: flex;
    gap: 20px;
  }

  .nav-link {
    padding: 8px 16px;
    border-radius: 6px;
    color: #586069;
    text-decoration: none;
    font-weight: 500;
    font-size: 14px;
    transition: background-color 0.2s, color 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .nav-link:hover {
    background: #f6f8fa;
    color: #0366d6;
  }

  .nav-link.active {
    background: #0366d6;
    color: white;
  }

  main {
    min-height: calc(100vh - 60px);
    background: #f6f8fa;
  }
</style>