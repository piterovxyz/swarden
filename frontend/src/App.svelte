<script lang="ts">
  let name = $state('Swarden');
</script>

<main>
  <div class="card">
    <h1>hello in {name}</h1>
    <p>app works</p>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #0f172a;
    color: #f8fafc;
  }

  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 1rem;
    box-sizing: border-box;
  }

  .card {
    text-align: center;
    padding: 2.5rem;
    background: #1e293b;
    border-radius: 1rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    border: 1px solid #334155;
  }

  h1 {
    margin: 0 0 1rem 0;
    font-size: 2rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: #94a3b8;
    font-size: 1.1rem;
  }
</style>
