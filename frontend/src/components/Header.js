import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Web3 from "web3";
import './Header.css'

const Header = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);
        
        // Controlla se già connesso
        try {
          const accounts = await web3Instance.eth.getAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        } catch (error) {
          console.error("Error checking accounts:", error);
        }
        
        // Ascolta i cambiamenti di account
        window.ethereum.on("accountsChanged", (accounts) => {
          setAccount(accounts[0] || "");
        });
      }
    };
    
    initWeb3();
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0]);
      } catch (error) {
        console.error("Error connecting wallet:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <header className="nft-header">
      <div className="nft-header-container">
        <div className="nft-logo">
          <Link to="/">
            <span className="nft-logo-icon">🎾</span>
            <span className="nft-logo-text">NFTennis</span>
          </Link>
        </div>

        {/* Menu per dispositivi mobili */}
        <div className="nft-mobile-menu-toggle" onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Menu di navigazione */}
        <nav className={`nft-nav ${menuOpen ? "nft-nav-open" : ""}`}>
          <ul className="nft-nav-list">
            <li className="nft-nav-item">
              <Link to="/" className="nft-nav-link">Home</Link>
            </li>
            <li className="nft-nav-item">
              <Link to="/mint" className="nft-nav-link">Create NFT</Link>
            </li>
            <li className="nft-nav-item">
              <Link to="/marketplace" className="nft-nav-link">Marketplace</Link>
            </li>
            <li className="nft-nav-item">
              <Link to="/collection" className="nft-nav-link">My NFT</Link>
            </li>
            
          </ul>
        </nav>

        {/* Wallet Connect Button */}
        <div className="nft-wallet-connect">
          {account ? (
            <div className="nft-wallet-info">
              <div className="nft-wallet-icon">💼</div>
              <div className="nft-wallet-address">
                {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
              </div>
            </div>
          ) : (
            <button className="nft-connect-button" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;