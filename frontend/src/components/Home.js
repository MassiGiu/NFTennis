import React, { useState, useEffect } from "react";
import axios from "axios";
import Web3 from "web3";

const Home = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rarity, setRarity] = useState("Common");
  const [file, setFile] = useState(null); // Stato per il file (immagine o video)
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3Instance.eth.getAccounts();
        setWeb3(web3Instance);
        setAccount(accounts[0]);
      } else {
        alert("Please install MetaMask!");
      }
    };

    initWeb3();
  }, []);

  // Funzione per gestire il caricamento del file (immagine o video)
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // Funzione per inviare la richiesta di minting dell'NFT
  const mintNFT = async () => {
    if (!name || !description || !rarity || !file) {
      setFeedback("Please fill in all the fields and upload a file (image or video).");
      return;
    }

    const rarityMapping = {
      Common: 0,
      Rare: 1,
      Legendary: 2,
    };

    const formData = new FormData();
    formData.append("recipient", account);
    formData.append("name", name);
    formData.append("description", description);
    formData.append("rarity", rarityMapping[rarity]);
    formData.append("file", file); // Aggiungi il file (immagine o video)

    try {
      setLoading(true);
      setFeedback("");

      const response = await axios.post("http://localhost:5001/api/mint", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setFeedback("NFT minted successfully!");
      console.log("Server Response:", response.data);
    } catch (error) {
      console.error("Error response:", error.response?.data || error.message);
      setFeedback(`Error minting NFT: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Mint Your NFTennis NFT</h1>
      <div>
        <label>Name: </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter player name"
          required
        />
      </div>
      <div>
        <label>Description: </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description"
          required
        />
      </div>
      <div>
        <label>Rarity: </label>
        <select value={rarity} onChange={(e) => setRarity(e.target.value)} required>
          <option value="Common">Common</option>
          <option value="Rare">Rare</option>
          <option value="Legendary">Legendary</option>
        </select>
      </div>
      <div>
        <label>Upload Image or Video: </label>
        <input
          type="file"
          accept="image/*,video/*"  // Permette sia immagini che video
          onChange={handleFileChange}
          required
        />
      </div>
      <button onClick={mintNFT} disabled={loading}>
        {loading ? "Minting..." : "Mint NFT"}
      </button>
      {feedback && <p>{feedback}</p>}
    </div>
  );
};

export default Home;
