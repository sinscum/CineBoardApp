import "../styles/schedules-page.css";

function SchedulesPage() {
  return (
    <div className="schedules-page">
      <section className="schedules-heading">
        <h1>Schedules</h1>
        <p className="schedules-subtitle">
          Plan active display times, source changes, and automation windows for poster playback.
        </p>
      </section>

      <section className="schedules-toolbar">
        <div className="schedules-search">
          <input type="text" placeholder="Search schedules..." />
        </div>

        <div className="schedules-filter">
          <select>
            <option>All Displays</option>
            <option>Living Room TV</option>
            <option>Theater Main</option>
            <option>Hallway Poster</option>
          </select>
        </div>

        <div className="schedules-filter">
          <select>
            <option>All Types</option>
            <option>Poster Rotation</option>
            <option>Welcome Screen</option>
            <option>Theme Mode</option>
          </select>
        </div>

        <div className="schedules-add">
          <button type="button">Add Schedule</button>
        </div>
      </section>

      <section className="schedules-list">
        <article className="schedule-card">
          <div className="schedule-card-header">
            <h2 className="schedule-card-title">Evening Theater Mode</h2>
            <span className="schedule-card-badge">Active</span>
          </div>
          <div className="schedule-card-meta">
            <p><strong>Display:</strong> Theater Main</p>
            <p><strong>Days:</strong> Mon–Sun</p>
            <p><strong>Time:</strong> 6:00 PM – 11:00 PM</p>
            <p><strong>Mode:</strong> Poster Rotation</p>
          </div>
          <div className="schedule-card-status">
            <p><strong>Status:</strong> Enabled</p>
          </div>
        </article>

        <article className="schedule-card">
          <div className="schedule-card-header">
            <h2 className="schedule-card-title">Weekend Poster Loop</h2>
          </div>
          <div className="schedule-card-meta">
            <p><strong>Display:</strong> Living Room TV</p>
            <p><strong>Days:</strong> Sat–Sun</p>
            <p><strong>Time:</strong> 10:00 AM – 10:00 PM</p>
            <p><strong>Mode:</strong> TMDB Showcase</p>
          </div>
          <div className="schedule-card-status">
            <p><strong>Status:</strong> Enabled</p>
          </div>
        </article>

        <article className="schedule-card">
          <div className="schedule-card-header">
            <h2 className="schedule-card-title">Lobby Welcome Screen</h2>
          </div>
          <div className="schedule-card-meta">
            <p><strong>Display:</strong> Hallway Poster</p>
            <p><strong>Days:</strong> Mon–Fri</p>
            <p><strong>Time:</strong> 8:00 AM – 6:00 PM</p>
            <p><strong>Mode:</strong> Welcome Loop</p>
          </div>
          <div className="schedule-card-status">
            <p><strong>Status:</strong> Disabled</p>
          </div>
        </article>

        <article className="schedule-card">
          <div className="schedule-card-header">
            <h2 className="schedule-card-title">Office Daytime Rotation</h2>
          </div>
          <div className="schedule-card-meta">
            <p><strong>Display:</strong> Office Display</p>
            <p><strong>Days:</strong> Mon–Fri</p>
            <p><strong>Time:</strong> 9:00 AM – 5:00 PM</p>
            <p><strong>Mode:</strong> Poster Rotation</p>
          </div>
          <div className="schedule-card-status">
            <p><strong>Status:</strong> Testing</p>
          </div>
        </article>
      </section>

      <section className="schedules-detail-panel">
        <h2 className="schedules-detail-title">Selected Schedule Details</h2>

        <div className="schedules-detail-grid">
          <p><strong>Schedule Name:</strong> Evening Theater Mode</p>
          <p><strong>Assigned Display:</strong> Theater Main</p>
          <p><strong>Days Active:</strong> Mon–Sun</p>
          <p><strong>Start Time:</strong> 6:00 PM</p>
          <p><strong>End Time:</strong> 11:00 PM</p>
          <p><strong>Source Mode:</strong> Poster Rotation</p>
          <p><strong>Priority:</strong> High</p>
          <p><strong>Last Updated:</strong> Today</p>
        </div>

        <div className="schedules-timeline">
          <div className="timeline-block">Morning</div>
          <div className="timeline-block">Afternoon</div>
          <div className="timeline-block">Evening</div>
          <div className="timeline-block">Night</div>
        </div>

        <div className="schedules-detail-actions">
          <button type="button">Enable</button>
          <button type="button">Edit Schedule</button>
          <button type="button">Duplicate</button>
        </div>
      </section>
    </div>
  );
}

export default SchedulesPage;
``