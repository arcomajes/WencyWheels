import React from "react";
import {BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Admin from "./pages/Admin";
import Home from "./pages/Login";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  )
}

export default App;