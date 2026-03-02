import "./App.css";

function App() {
  return (
    <div className="app">

      {/* Navbar */}
      <nav className="navbar">
        <h2 className="logo">LinkSphere</h2>
        <div className="nav-links">
          <a href="#">Download</a>
          <a href="#">Nitro</a>
          <a href="#">Discover</a>
          <a href="#">Safety</a>
        </div>
        <button className="login-btn">Login</button>
      </nav>

      {/* Hero Section */}
      <div className="hero">
        <h1>IMAGINE A PLACE...</h1>
        <p>
          ...where you can belong to a school club, gaming group,
          or a worldwide art community. Where just you and a handful
          of friends can spend time together.
        </p>

        <div className="buttons">
          <button className="primary-btn">Download for Windows</button>
          <button className="secondary-btn">Open in Browser</button>
        </div>
      </div>

    </div>
  );
}

export default App;