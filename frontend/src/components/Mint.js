import React, { useState, useEffect } from "react";
import axios from "axios";
import Web3 from "web3";
import './Mint.css'

const Mint = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rarity, setRarity] = useState("Common");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // Per l'anteprima dell'immagine/video
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
      
      // Crea URL per l'anteprima
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      
      // Pulisci l'URL quando il componente si smonta
      return () => URL.revokeObjectURL(objectUrl);
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
    formData.append("file", file);

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

  // Funzione per determinare se il file è un'immagine o un video
  const isImage = file && file.type.split('/')[0] === 'image';
  const isVideo = file && file.type.split('/')[0] === 'video';

  return (
    <div className="nft-container">
      <h1 className="nft-title">Mint Your NFTennis NFT</h1>
      
      <div className="nft-content">
        {/* Colonna sinistra - Preview area */}
        <div className="nft-preview-container">
          <div className="nft-preview-box">
            {!preview && (
              <div className="nft-upload-placeholder">
                <p>Drag and drop your file here or click to browse</p>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="nft-file-input"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="nft-upload-button">
                  Select File
                </label>
              </div>
            )}
            
            {preview && isImage && (
              <div className="nft-preview-content">
                <img src={preview} alt="Preview" className="nft-preview-image" />
                <button 
                  className="nft-change-file" 
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  Change File
                </button>
              </div>
            )}
            
            {preview && isVideo && (
              <div className="nft-preview-content">
                <video 
                  src={preview} 
                  controls 
                  className="nft-preview-video"
                ></video>
                <button 
                  className="nft-change-file" 
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  Change File
                </button>
              </div>
            )}
          </div>
          
          <div className="nft-file-info">
            {file && (
              <p>Selected file: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>
            )}
          </div>
        </div>
        
        {/* Colonna destra - Form fields */}
        <div className="nft-form-container">
          <div className="nft-form-group">
            <label className="nft-label">Player Name</label>
            <input
              type="text"
              className="nft-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter player name"
              required
            />
          </div>
          
          <div className="nft-form-group">
            <label className="nft-label">Description</label>
            <textarea
              className="nft-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description of your tennis NFT"
              rows="4"
              required
            ></textarea>
          </div>
          
          <div className="nft-form-group">
            <label className="nft-label">Rarity</label>
            <select 
              className="nft-select"
              value={rarity} 
              onChange={(e) => setRarity(e.target.value)} 
              required
            >
              <option value="Common">Common</option>
              <option value="Rare">Rare</option>
              <option value="Legendary">Legendary</option>
            </select>
          </div>
          
          <div className="nft-form-group">
            <label className="nft-label">Connected Wallet</label>
            <div className="nft-wallet-display">
              {account ? (
                <span>{`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}</span>
              ) : (
                <span>Not connected</span>
              )}
            </div>
          </div>
          
          <button 
            className="nft-mint-button" 
            onClick={mintNFT} 
            disabled={loading || !file || !name || !description}
          >
            {loading ? "Minting..." : "Mint NFT"}
          </button>
          
          {feedback && <p className={`nft-feedback ${feedback.includes("Error") ? "nft-error" : "nft-success"}`}>{feedback}</p>}
        </div>
      </div>
    </div>
  );
};

export default Mint;