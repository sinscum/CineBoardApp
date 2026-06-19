import '../styles/dashboard-page.css';

const DashboardPage = () => {
  return (
    <main className="dashboard-page">
      <section className="dashboard-heading">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">
            Overview of displays, poster sources, cache health, and personalization status.
          </p>
        </div>
      </section>

      <section className="dashboard-summary-grid" aria-label="Summary cards">
        <article className="dashboard-card">
          <span className="dashboard-card-label">Active Display</span>
          <span className="dashboard-card-value">Living Room TV</span>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card-label">Poster Source</span>
          <span className="dashboard-card-value">TMDB</span>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card-label">Cache Status</span>
          <span className="dashboard-card-value">Healthy</span>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card-label">Personalization</span>
          <span className="dashboard-card-value">2 banners enabled</span>
        </article>
      </section>

      <section className="dashboard-panels">
        <section className="dashboard-panel">
          <h2 className="dashboard-panel-title">Display Status</h2>
          <dl>
            <div>
              <dt>Orientation</dt>
              <dd>Portrait</dd>
            </div>
            <div>
              <dt>Resolution</dt>
              <dd>1080 x 1920</dd>
            </div>
            <div>
              <dt>Active Profile</dt>
              <dd>Theater Main</dd>
            </div>
            <div>
              <dt>Current Mode</dt>
              <dd>Poster Rotation</dd>
            </div>
          </dl>
        </section>

        <section className="dashboard-panel">
          <h2 className="dashboard-panel-title">Recent Activity</h2>
          <ul className="dashboard-list">
            <li>Loaded dashboard shell</li>
            <li>TMDB source ready</li>
            <li>Cache folder configured</li>
            <li>Display profile initialized</li>
          </ul>
        </section>
      </section>
    </main>
  );
};

export default DashboardPage;
