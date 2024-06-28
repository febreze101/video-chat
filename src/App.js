import { BrowserRouter, Router } from "react-router-dom";
import "./App.css";
import RouteList from "./RouteList";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <RouteList />
      </BrowserRouter>
    </div>
  );
}

export default App;
