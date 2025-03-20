import React, { useState, useEffect } from "react";
import axios from "axios";
import { initWeb3 } from "../utils/web3";
import './Mint.css';

const Mint = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rarity, setRarity] = useState("Common");
  const [mediaType, setMediaType] = useState("Image"); // MediaType: "Image" o "Video"
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  

  useEffect(() => {
    const setupWeb3 = async () => {
      const { web3, contract, account } = await initWeb3();
      setWeb3(web3);
      setAccount(account);
    };
    setupWeb3();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
  
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
  
      // Determina automaticamente il MediaType
      const fileType = selectedFile.type.split("/")[0];
      const newMediaType = fileType === "video" ? "Video" : "Image";
      setMediaType(newMediaType);
      
      // Imposta automaticamente la rarità appropriata in base al tipo di file
      if (fileType === "video") {
        setRarity("Masterpiece");
      } else if (rarity === "Masterpiece") {
        // Se era impostato su Masterpiece ma ora è un'immagine, reimposta a Common
        setRarity("Common");
      }
  
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const mintNFT = async () => {
    if (!name || !description || !rarity || !file) {
      setFeedback("Please fill in all fields and upload a file.");
      return;
    }

    // Mappatura rarità e tipo di media per il contratto
    const rarityMapping = {
      Common: 0,
      Rare: 1,
      Legendary: 2,
      Masterpiece: 3
    };

    const mediaTypeMapping = {
      Image: 0,
      Video: 1
    };

    // Controlli di compatibilità
    if (mediaType === "Video" && rarity !== "Masterpiece") {
      setFeedback("Videos can only be minted with 'Masterpiece' rarity.");
      return;
    }

    if (mediaType === "Image" && rarity === "Masterpiece") {
      setFeedback("Images cannot be minted with 'Masterpiece' rarity.");
      return;
    }

    const formData = new FormData();
    formData.append("recipient", account);
    formData.append("name", name);
    formData.append("description", description);
    formData.append("rarity", rarityMapping[rarity]);
    formData.append("mediaType", mediaTypeMapping[mediaType]);
    formData.append("file", file);

    try {
      setLoading(true);
      setFeedback("");
      const response = await axios.post(`http://localhost:5002/api/mint`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
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
    <div className="mint-page">
      <div className="nft-container">
        <h1 className="nft-title">Mint Your NFT</h1>

        <div className="nft-content">
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
                  <label htmlFor="file-upload" className="nft-upload-button">Select File</label>
                </div>
              )}

              {preview && mediaType === "Image" && (
                <div className="nft-preview-content">
                  <img src={preview} alt="Preview" className="nft-preview-image" />
                  <button className="nft-change-file" onClick={() => { setFile(null); setPreview(null); }}>Change File</button>
                </div>
              )}

              {preview && mediaType === "Video" && (
                <div className="nft-preview-content">
                  <video src={preview} controls className="nft-preview-video"></video>
                  <button className="nft-change-file" onClick={() => { setFile(null); setPreview(null); }}>Change File</button>
                </div>
              )}
            </div>

            {file && <p>Selected file: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>}
          </div>

          <div className="nft-form-container">
            <div className="nft-form-group">
              <label className="nft-label">Player Name</label>
              <input type="text" className="nft-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter player name" required />
            </div>

            <div className="nft-form-group">
              <label className="nft-label">Description</label>
              <textarea className="nft-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter a description" rows="4" required></textarea>
            </div>

            <div className="nft-form-group">
            <label className="nft-label">Rarity</label>
              <select
                className="nft-select"
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
                required
              >
                {/* Condizione per i Video */}
                {mediaType === "Video" && <option value="Masterpiece">Masterpiece</option>}
                
                {/* Condizione per le Immagini */}
                {mediaType === "Image" && (
                  <>
                    <option value="Common">Common</option>
                    <option value="Rare">Rare</option>
                    <option value="Legendary">Legendary</option>
                  </>
                )}
              </select>
            </div>

                
            

            <button className="nft-mint-button" onClick={mintNFT} disabled={loading || !file || !name || !description}>
              {loading ? "Minting..." : "Mint NFT"}
            </button>

            {feedback && <p className={`nft-feedback ${feedback.includes("Error") ? "nft-error" : "nft-success"}`}>{feedback}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mint;
