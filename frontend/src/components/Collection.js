import React, { useState, useEffect } from "react";
import { initWeb3 } from "../utils/web3";
import { Link } from "react-router-dom";
import axios from "axios";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import './Collection.css';

const Collection = () => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [activeAuctions, setActiveAuctions] = useState([]);
  const [nftInAuctionCount, setNftInAuctionCount] = useState(0);
  
  const [nftStates, setNftStates] = useState({});
  
  const [stats, setStats] = useState({
    total: 0,
    inAuction: 0,
    rarityDistribution: [
      { name: 'Common', value: 0, color: '#4CAF50' },
      { name: 'Rare', value: 0, color: '#FF9800' },
      { name: 'Legendary', value: 0, color: '#FFEB3B' },
      { name: 'Masterpiece', value: 0, color: '#9C27B0' }
    ]
  });

  useEffect(() => {
    const initialize = async () => {
      const { web3, contract, account } = await initWeb3();
      if (web3 && contract && account) {
        setWeb3(web3);
        setAccount(account);
        setContract(contract);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (web3 && contract && account) {
      fetchNFTs();
      fetchAndCacheAuctionStatus();
      fetchUserNFTsInAuction();
    }
  }, [account, web3, contract]);

  useEffect(() => {
    if (nfts.length > 0) {
      calculateStats();
      
      // Inizializza gli stati per ogni NFT
      const initialNftStates = nfts.reduce((acc, nft) => {
        acc[nft.tokenId] = {
          sellMode: false,
          auctionDuration: { 
            days: 0, 
            hours: 1, 
            minutes: 0, 
            seconds: 0 
          },
          buyNowPrice: ''
        };
        return acc;
      }, {});
      
      setNftStates(initialNftStates);
    }
  }, [nfts, activeAuctions, nftInAuctionCount]);

  const fetchUserNFTsInAuction = async () => {
    if (!contract || !account) return;
    
    try {
      const count = await contract.methods.getNFTsInAuctionByOwner(account).call();
      setNftInAuctionCount(Number(count));
    } catch (error) {
      console.error("Error fetching NFTs in auction count:", error);
    }
  };

  const fetchActiveAuctions = async () => {
    try {
      const response = await axios.get('http://localhost:5002/api/nfts/active-auctions');
      setActiveAuctions(response.data.auctions);
      return response.data.auctions;
    } catch (error) {
      console.error("Error fetching active auctions:", error);
      return [];
    }
  };

  const calculateStats = () => {
    const rarityCount = {
      'Common': 0,
      'Rare': 0,
      'Legendary': 0,
      'Masterpiece': 0
    };
    
    nfts.forEach(nft => {
      const rarity = getRarityName(nft.metadata.attributes);
      if (rarityCount.hasOwnProperty(rarity)) {
        rarityCount[rarity]++;
      } else {
        rarityCount['Common']++;
      }
    });
    
    const updatedRarityDistribution = [
      { name: 'Common', value: rarityCount['Common'], color: '#4CAF50' },
      { name: 'Rare', value: rarityCount['Rare'], color: '#FF9800' },
      { name: 'Legendary', value: rarityCount['Legendary'], color: '#FFEB3B' },
      { name: 'Masterpiece', value: rarityCount['Masterpiece'], color: '#9C27B0' }
    ].filter(item => item.value > 0);
    
    setStats({
      total: nfts.length,
      inAuction: nftInAuctionCount,
      rarityDistribution: updatedRarityDistribution
    });
  };

  const fetchAndCacheAuctionStatus = async () => {
    if (!web3) return [];
    
    try {
      // Recupera l'account corrente dell'utente
      const currentAccount = await window.ethereum.request({ method: 'eth_accounts' });
      const userAddress = currentAccount[0];
      
      // Recupera le aste attive dall'API o dalla blockchain
      const response = await axios.get('http://localhost:5002/api/nfts/active-auctions');
      const auctions = response.data.auctions;
      
      // Aggiungi un flag per indicare se l'NFT appartiene all'utente corrente
      const auctionsWithOwnership = auctions.map(auction => {
        return {
          ...auction,
          isOwnedByUser: auction.ownerAddress && 
                        auction.ownerAddress.toLowerCase() === userAddress.toLowerCase()
        };
      });
      
      // Salva nella sessione o localStorage per mantenere lo stato tra i refresh
      localStorage.setItem('activeAuctions', JSON.stringify(auctionsWithOwnership));
      
      // Aggiorna lo stato React
      setActiveAuctions(auctionsWithOwnership);
      return auctionsWithOwnership;
      
    } catch (error) {
      console.error("Error fetching active auctions:", error);
      // In caso di errore, prova a recuperare dalla cache
      const cachedAuctions = JSON.parse(localStorage.getItem('activeAuctions') || '[]');
      setActiveAuctions(cachedAuctions);
      return cachedAuctions;
    }
  };

  // Nuova funzione per verificare se un NFT è in asta utilizzando la cache
  const isNFTInAuction = async (tokenId) => {
    // Prima prova a controllare la cache
    const cachedAuctions = JSON.parse(localStorage.getItem('activeAuctions') || '[]');
    const isInCachedAuctions = cachedAuctions.some(auction => 
      auction.tokenId.toString() === tokenId.toString()
    );
    
    if (isInCachedAuctions) return true;
    
    // Se non è nella cache, controlla il contratto
    if (!contract) return false;
    
    try {
      const activeAuctions = await contract.methods.getActiveAuctions().call();
      return activeAuctions.includes(tokenId.toString());
    } catch (error) {
      console.error(`Error checking auction status for token ${tokenId}:`, error);
      return false;
    }
  };

  const fetchNFTs = async () => {
    if (!account || !web3 || !contract) return;
    try {
      setLoading(true);
      setFeedback("");
      
      // Ottieni gli NFT posseduti dall'utente
      const ownedNFTs = await contract.methods.getOwnedNFTs(account).call();
      
      if (ownedNFTs.length === 0) {
        setNfts([]);
        setLoading(false);
        return;
      }
      
      // Recupera i dettagli di ogni NFT
      const nftDetails = await Promise.all(ownedNFTs.map(async (tokenId) => {
        const tokenURI = await contract.methods.tokenURI(tokenId).call();
        const response = await fetch(tokenURI);
        const metadata = await response.json();
        
        // Verifica se l'NFT è in asta usando la nuova funzione
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

  // Nuove funzioni per gestire gli stati dei singoli NFT
  const toggleSellMode = (tokenId) => {
    setNftStates(prev => ({
      ...prev,
      [tokenId]: {
        ...prev[tokenId],
        sellMode: !prev[tokenId].sellMode
      }
    }));
  };

  const handleDurationChange = (tokenId, field, value) => {
    setNftStates(prev => ({
      ...prev,
      [tokenId]: {
        ...prev[tokenId],
        auctionDuration: {
          ...prev[tokenId].auctionDuration,
          [field]: Math.max(0, prev[tokenId].auctionDuration[field] + value)
        }
      }
    }));
  };

  const handleBuyNowPriceChange = (tokenId, price) => {
    setNftStates(prev => ({
      ...prev,
      [tokenId]: {
        ...prev[tokenId],
        buyNowPrice: price
      }
    }));
  };

  const startAuction = async (tokenId) => {
    const { auctionDuration, buyNowPrice } = nftStates[tokenId];
    
    try {
      if (!contract) throw new Error("Contract not initialized");
      
      const durationInSeconds = 
        auctionDuration.days * 86400 + 
        auctionDuration.hours * 3600 + 
        auctionDuration.minutes * 60 + 
        auctionDuration.seconds;
      
      if (durationInSeconds <= 0) {
        alert("La durata dell'asta deve essere maggiore di zero.");
        return;
      }
      
      if (!buyNowPrice || isNaN(buyNowPrice) || buyNowPrice <= 0) {
        alert("Inserisci un prezzo di acquisto valido.");
        return;
      }
      
      const buyNowPriceInWei = web3.utils.toWei(buyNowPrice, "ether");
      setFeedback("Verifico lo stato di approvazione...");
      
      const approvedAddress = await contract.methods.getApproved(tokenId).call();
      if (approvedAddress.toLowerCase() !== process.env.REACT_APP_CONTRACT_ADDRESS.toLowerCase()) {
        setFeedback("Approvo il contratto per gestire il tuo NFT...");
        await contract.methods.approve(process.env.REACT_APP_CONTRACT_ADDRESS, tokenId).send({ from: account });
        setFeedback("Approvazione completata! Ora avvio l'asta...");
      }
      
      setFeedback("Avvio dell'asta... Attendi e conferma la transazione in MetaMask.");
      await contract.methods.startAuction(tokenId, durationInSeconds, buyNowPriceInWei).send({
        from: account,
        gas: 300000
      });
      
      // Update local state to immediately reflect the NFT is in auction
      const updatedNfts = nfts.map(nft => 
        nft.tokenId === tokenId ? { ...nft, isInAuction: true } : nft
      );
      
      setNfts(updatedNfts);
      
      // Resetta lo stato dell'NFT specifico
      setNftStates(prev => ({
        ...prev,
        [tokenId]: {
          ...prev[tokenId],
          sellMode: false,
          auctionDuration: { days: 0, hours: 1, minutes: 0, seconds: 0 },
          buyNowPrice: ''
        }
      }));
      
      setFeedback("Asta avviata con successo!");
      
      // Aggiorna i dati
      const auctions = await fetchActiveAuctions();
      fetchUserNFTsInAuction();
      
      // Aggiorna la cache delle aste attive
      localStorage.setItem('activeAuctions', JSON.stringify(auctions));
    } catch (error) {
      console.error("Error starting auction:", error);
      setFeedback(`Impossibile avviare l'asta: ${error.message}`);
    }
  };

  const getRarityName = (attributes) => {
    if (attributes && attributes.length > 0) {
      const rarityAttribute = attributes.find(attr => attr.trait_type === "Rarity");
      if (rarityAttribute) {
        return rarityAttribute.value || "Unknown";
      }
    }
    return "Unknown";
  };

  const renderMedia = (metadata) => {
    if (metadata.animation_url) {
      return (
        <video 
          className="nft-media"
          controls
          loop
          playsInline
        >
          <source src={metadata.animation_url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }
  
    if (metadata.image) {
      return <img src={metadata.image} alt={metadata.name} className="nft-media" />;
    }
  
    return <div className="nft-no-media">No media available</div>;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="nft-collection-page">
      <h1 className="collection-title">Your NFT Collection</h1>
      
      {/* Stats Section */}
      <div className="stats-container">
        <div className="stats-card">
          <h3>Total NFT:</h3>
          <p className="stats-number">{stats.total}</p>
        </div>
        
        <div className="stats-chart-card">
          <h3>Rarity Distribution:</h3>
          <div className="stats-chart-container">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={stats.rarityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={renderCustomizedLabel}
                >
                  {stats.rarityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="legend-container">
              <ul>
                {stats.rarityDistribution.map((item, index) => (
                  <li key={index} style={{ color: item.color }}>
                    {item.name}: {item.value}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <h3>In Auction:</h3>
          <p className="stats-number">{stats.inAuction}</p>
        </div>
      </div>
      
      {/* Collection Section */}
      <div className="collection-content">
        {loading ? (
          <div className="loading-message">Loading your NFTs...</div>
        ) : (
          <>
            {nfts.length === 0 ? (
              <div className="nft-empty-message">
                No NFTs found in your collection.
              </div>
            ) : (
              <div className="nft-grid">
                {nfts.map((nft) => (
                  <div 
                    key={nft.tokenId} 
                    className={`nft-card-new ${nftStates[nft.tokenId]?.sellMode ? 'sell-mode-active' : ''}`}
                  >
                    <div className="nft-image-container">
                      {/* Bollino "In Asta" */}
                      {nft.isInAuction && (
                        <div className="auction-badge">In Auction</div>
                      )}
                      {nft.metadata && renderMedia(nft.metadata)}
                    </div>
                    
                    <div className="nft-action-section">
                      <div className="nft-action-buttons">
                        {!nft.isInAuction ? (
                          <>
                            <button 
                              className="btn-action btn-sell" 
                              onClick={() => toggleSellMode(nft.tokenId)}
                            >
                              Sell
                            </button>
                            <Link 
                              to={`/nft/${nft.tokenId}`} 
                              className="btn-action btn-info"
                            >
                              Info
                            </Link>
                          </>
                        ) : (
                            <Link 
                              to={`/nft/${nft.tokenId}`} 
                              className="btn-action btn-info"
                            >
                              Info
                            </Link>
                        )}
                        </div>
                    </div>
                    
                    {nftStates[nft.tokenId] && nftStates[nft.tokenId].sellMode && !nft.isInAuction && (
                      <div className="auction-form-new">    
                        <div className="duration-inputs">
                          <div className="duration-input-group">
                            <label>Days</label>
                            <div className="duration-controls">
                              <button 
                                className="duration-btn" 
                                onClick={() => handleDurationChange(nft.tokenId, 'days', -1)}
                              >
                                &minus;
                              </button>
                              <span className="duration-value">
                                {nftStates[nft.tokenId].auctionDuration.days}
                              </span>
                              <button 
                                className="duration-btn" 
                                onClick={() => handleDurationChange(nft.tokenId, 'days', 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          
                          <div className="duration-input-group">
                            <label>Hours</label>
                            <div className="duration-controls">
                              <button 
                                className="duration-btn" 
                                onClick={() => handleDurationChange(nft.tokenId, 'hours', -1)}
                              >
                                &minus;
                              </button>
                              <span className="duration-value">
                                {nftStates[nft.tokenId].auctionDuration.hours}
                              </span>
                              <button 
                                className="duration-btn" 
                                onClick={() => handleDurationChange(nft.tokenId, 'hours', 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          
                          <div className="duration-input-group">
                            <label>Minutes</label>
                            <div className="duration-controls">
                              <button 
                                className="duration-btn" 
                                onClick={() => handleDurationChange(nft.tokenId, 'minutes', -1)}
                              >
                                &minus;
                              </button>
                              <span className="duration-value">
                                {nftStates[nft.tokenId].auctionDuration.minutes}
                              </span>
                              <button 
                                className="duration-btn" 
                                onClick={() => handleDurationChange(nft.tokenId, 'minutes', 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          
                          <div className="duration-input-group">
                            <label>Seconds</label>
                            <div className="duration-controls">
                              <button 
                                className="duration-btn" 
                                onClick={() => handleDurationChange(nft.tokenId, 'seconds', -1)}
                              >
                                &minus;
                              </button>
                              <span className="duration-value">
                                {nftStates[nft.tokenId].auctionDuration.seconds}
                              </span>
                              <button 
                                className="duration-btn" 
                                onClick={() => handleDurationChange(nft.tokenId, 'seconds', 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="form-group">
                          <label>Buy Now Price (ETH):</label>
                          <input
                            type="number"
                            step="0.01"
                            value={nftStates[nft.tokenId].buyNowPrice}
                            onChange={(e) => handleBuyNowPriceChange(nft.tokenId, e.target.value)}
                            className="form-input"
                          />
                        </div>
                        
                        <div className="auction-buttons">
                          <button
                            className="btn-start-auction"
                            onClick={() => startAuction(nft.tokenId)}
                          >
                            Start Auction
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => toggleSellMode(nft.tokenId)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {feedback && <div className={`feedback-message ${feedback.includes("success") ? "nft-success" : "nft-error"}`}>{feedback}</div>}
    </div>
  );
};

export default Collection;