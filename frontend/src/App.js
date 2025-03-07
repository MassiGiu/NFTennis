import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import Marketplace from './components/Marketplace';
import Mint from './components/Mint';
import Header from './components/Header';
import Collection from './components/Collection';
import NFT from "./components/NFT";
import Footer from './components/Footer';           

function App() {
  return (
    <Router>
      <div className="App">
        <Header/>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/mint" element={<Mint />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/nft/:tokenId" element={<NFT />} />
        </Routes>
        <Footer/>
      </div>
    </Router>
  );
}

export default App;
