import React, { useState, useEffect } from "react";
import Web3 from "web3";
import NFTennisContract from './NFTennis.json';
import { Link } from "react-router-dom";
import './Collection.css'

const Collection = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [auctionDuration, setAuctionDuration] = useState(3600);
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [selectedTokenId, setSelectedTokenId] = useState(null);

  const ABI = NFTennisContract.abi;
  const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3Instance.eth.getAccounts();
        setWeb3(web3Instance);
        setAccount(accounts[0]);
        const contractInstance = new web3Instance.eth.Contract(ABI, CONTRACT_ADDRESS);
        setContract(contractInstance);
      } else {
        alert("Please install MetaMask!");
      }
    };
    initWeb3();
  }, []);

  useEffect(() => {
    fetchNFTs();
  }, [account, web3, contract]);

  const fetchNFTs = async () => {
    if (!account || !web3 || !contract) return;

    try {
      setLoading(true);
      setFeedback("");
      
      // Recuperiamo gli ID degli NFT posseduti dall'utente
      const ownedNFTs = await contract.methods.getOwnedNFTs(account).call();
      
      if (ownedNFTs.length === 0) {
        setFeedback("No NFTs found in your collection.");
        setNfts([]);
        setLoading(false);
        return;
      }

      // Recuperiamo i metadati di ciascun NFT
      const nftDetails = await Promise.all(ownedNFTs.map(async (tokenId) => {
        const tokenURI = await contract.methods.tokenURI(tokenId).call();
        
        // Per semplicità, supponiamo che tokenURI contenga l'URL del JSON con i metadati
        const response = await fetch(tokenURI);
        const metadata = await response.json();
        
        // Verifichiamo se l'NFT è già in un'asta attiva
        const isInAuction = await isNFTInAuction(tokenId);
        
        return {
          tokenId,
          metadata,
          isInAuction
        };
      }));

      setNfts(nftDetails);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      setFeedback("Error fetching NFTs");
    } finally {
      setLoading(false);
    }
  };

  // Funzione per verificare se un NFT è già in un'asta attiva
  const isNFTInAuction = async (tokenId) => {
    if (!contract) return false;
    
    try {
      // Ottieni tutte le aste attive
      const activeAuctions = await contract.methods.getActiveAuctions().call();
      
      // Verifica se il tokenId è nell'elenco delle aste attive
      return activeAuctions.includes(tokenId.toString());
    } catch (error) {
      console.error(`Error checking auction status for token ${tokenId}:`, error);
      return false;
    }
  };

  const startAuction = async (tokenId) => {
    try {
      if (!contract) throw new Error("Contract not initialized");
      if (!auctionDuration || isNaN(auctionDuration) || auctionDuration <= 0) {
        alert("Please enter a valid auction duration (in seconds).");
        return;
      }
      if (!buyNowPrice || isNaN(buyNowPrice) || buyNowPrice <= 0) {
        alert("Please enter a valid Buy Now price.");
        return;
      }
      
      const buyNowPriceInWei = web3.utils.toWei(buyNowPrice, "ether");
  
      setFeedback("Checking approval status...");
      
      // Verifica se il contratto è già approvato per gestire questo token
      const approvedAddress = await contract.methods.getApproved(tokenId).call();
      if (approvedAddress.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
        setFeedback("Approving contract to handle your NFT...");
        // Approva il contratto a gestire il token
        await contract.methods.approve(CONTRACT_ADDRESS, tokenId).send({ from: account });
        setFeedback("Approval successful! Now starting auction...");
      }
      
      // Ora che abbiamo l'approvazione, possiamo avviare l'asta
      setFeedback("Starting auction... Please wait and confirm the transaction in MetaMask.");
      
      await contract.methods.startAuction(tokenId, auctionDuration, buyNowPriceInWei).send({ 
        from: account,
        gas: 300000  // Specifico un gas limit più alto per essere sicuri
      });
      
      // Reset dei valori di input
      setAuctionDuration(3600);
      setBuyNowPrice('');
      setSelectedTokenId(null);
      
      setFeedback("Auction started successfully!");
      
      // Aggiorna la lista degli NFT dopo l'inizio dell'asta
      fetchNFTs();
    } catch (error) {
      console.error("Error starting auction:", error);
      setFeedback(`Failed to start auction: ${error.message}`);
    }
  };

  const rarityMapping = {
    0: "Common",
    1: "Rare",
    2: "Legendary"
  };

  return (
    <div className="collection-container">
      <h1 className="collection-title">Your NFTennis Collection</h1>
      
      <div className="collection-content">
        {/* Mostra gli NFT */}
        <div className="nft-grid">
          {loading ? (
            <p>Loading your NFTs...</p>
          ) : (
            <>
              {nfts.length === 0 ? (
                <p>No NFTs found in your collection.</p>
              ) : (
                nfts.map((nft, index) => (
                  <div 
                    key={index} 
                    className={`nft-card ${selectedTokenId === nft.tokenId ? "selected" : ""}`}
                    onClick={() => setSelectedTokenId(selectedTokenId === nft.tokenId ? null : nft.tokenId)}
                  >
                    <div className="nft-card-image">
                      <img src={nft.metadata.image} alt={nft.metadata.name} className="nft-image" />
                    </div>
                    <div className="nft-card-info">
                      <h3 className="nft-name">{nft.metadata.name}</h3>
                      <p className="nft-description">{nft.metadata.description}</p>
                      <p className="nft-rarity">Rarity: {rarityMapping[nft.metadata.attributes?.[0]?.value] || "Unknown"}</p>
                      <p className="nft-status">
                        Status: <span className={nft.isInAuction ? "in-auction" : "not-in-auction"}>
                          {nft.isInAuction ? "In Auction" : "Not Listed"}
                        </span>
                      </p>
                    </div>
                    
                    {selectedTokenId === nft.tokenId && !nft.isInAuction && (
                      <div className="auction-form">
                        <h4>Start Auction</h4>
                        <div className="form-group">
                          <label htmlFor={`duration-${nft.tokenId}`}>Auction Duration (seconds):</label>
                          <input
                            id={`duration-${nft.tokenId}`}
                            type="number"
                            value={auctionDuration}
                            onChange={(e) => setAuctionDuration(e.target.value)}
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`price-${nft.tokenId}`}>Buy Now Price (ETH):</label>
                          <input
                            id={`price-${nft.tokenId}`}
                            type="text"
                            value={buyNowPrice}
                            onChange={(e) => setBuyNowPrice(e.target.value)}
                            className="form-input"
                          />
                        </div>
                        <button 
                          className="start-auction-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            startAuction(nft.tokenId);
                          }}
                        >
                          Start Auction
                        </button>
                      </div>
                    )}
                    
                    {selectedTokenId === nft.tokenId && nft.isInAuction && (
                      <div className="auction-info">
                        <p>This NFT is currently in an auction.</p>
                        <Link to="/marketplace" className="view-auction-btn">
                          Go to Marketplace
                        </Link>
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {feedback && <p className={`nft-feedback ${feedback.includes("Error") ? "nft-error" : "nft-success"}`}>{feedback}</p>}
    </div>
  );
};

export default Collection;