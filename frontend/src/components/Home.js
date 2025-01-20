import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Web3 from "web3";
import NFTennisContract from "./NFTennis.json";

const Home = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [tokenURI, setTokenURI] = useState("");
  const [rarity, setRarity] = useState("0"); // Default: Common
  const [isOwner, setIsOwner] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3Instance.eth.getAccounts();
        setWeb3(web3Instance);
        setAccount(accounts[0]);

        const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS; // Sostituisci con l'indirizzo corretto
        const contractABI = NFTennisContract.abi;
        const contract = new web3Instance.eth.Contract(contractABI, contractAddress);

        try {
          const contractOwner = await contract.methods.owner().call();
          if (accounts[0].toLowerCase() === contractOwner.toLowerCase()) {
            setIsOwner(true);
          }
        } catch (error) {
          console.error("Errore nel recuperare il proprietario del contratto:", error);
        }

        window.ethereum.on("accountsChanged", (accounts) => {
          setAccount(accounts[0]);
          setIsOwner(false);
        });
      } else {
        alert("Please install MetaMask!");
      }
    };

    initWeb3();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOwner) {
      setErrorMessage("Solo il proprietario del contratto può creare nuovi NFT!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/api/nfts/mint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient: account, tokenURI, rarity }),
      });

      if (response.ok) {
        setSuccessMessage("NFT creato con successo!");
        setTokenURI("");
        setRarity("0");
        setErrorMessage("");
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || "Errore nella creazione dell'NFT");
      }
    } catch (error) {
      setErrorMessage("Errore nella creazione dell'NFT. Controlla la console.");
      console.error("Errore nella creazione dell'NFT:", error);
    }
  };

  return (
    <div>
      <h1>Benvenuti in NFTennis!</h1>
      <p>Esplora il marketplace per visualizzare e acquistare gli NFT disponibili.</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Token URI"
          value={tokenURI}
          onChange={(e) => setTokenURI(e.target.value)}
          required
        />
        <select value={rarity} onChange={(e) => setRarity(e.target.value)} required>
          <option value="0">Common</option>
          <option value="1">Rare</option>
          <option value="2">Legendary</option>
        </select>
        <button type="submit">Crea NFT</button>
      </form>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

      <Link to="/marketplace" style={{ marginTop: "20px", display: "inline-block" }}>
        <button>Vai al Marketplace</button>
      </Link>

      {account && <p>Connected Account: {account}</p>}
      {!isOwner && account && <p>Solo il proprietario può creare nuovi NFT</p>}
    </div>
  );
};

export default Home;
