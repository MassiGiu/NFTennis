import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import Marketplace from './components/Marketplace';
import Auction from './components/Auction'; // Importa il nuovo componente Auction
import Mint from './components/Mint';
import Header from './components/Header';
import Collection from './components/Collection';

function App() {
  return (
    <Router>
      <div className="App">
        <Header/>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/auction" element={<Auction />} /> 
          <Route path="/mint" element={<Mint />} />
          <Route path="/collection" element={<Collection />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
