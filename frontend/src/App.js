import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import Marketplace from './components/Marketplace';
import Auction from './components/Auction'; // Importa il nuovo componente Auction

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/auction" element={<Auction />} /> {/* Aggiungi la route per Auction */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
