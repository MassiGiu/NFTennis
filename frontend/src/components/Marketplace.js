import React, { useEffect, useState, useRef } from "react";
import { initWeb3 } from "../utils/web3";
import { Link } from "react-router-dom";
import axios from "axios";
import "./Marketplace.css";

const Marketplace = () => {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [filteredNfts, setFilteredNfts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [playerName, setPlayerName] = useState("");
  const [rarity, setRarity] = useState("");
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("20");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPriceInMarket, setMaxPriceInMarket] = useState(20);
  
  // Refs for range slider
  const rangeTrackRef = useRef(null);
  const minHandleRef = useRef(null);
  const maxHandleRef = useRef(null);
  const rangeSelectedRef = useRef(null);

  useEffect(() => {
    const loadWeb3 = async () => {
      const web3Data = await initWeb3();
      if (web3Data) {
        setWeb3(web3Data.web3);
        setContract(web3Data.contract);
        setAccount(web3Data.account);
      }
    };
    loadWeb3();
  }, []);

  useEffect(() => {
    fetchActiveAuctions();
  }, []);

  // Update filtered NFTs when filters or NFT list changes
  useEffect(() => {
    applyFilters();
  }, [nfts, playerName, rarity, minPrice, maxPrice]);

  // Update the price range slider visualization
  useEffect(() => {
    updateRangeSlider();
  }, [minPrice, maxPrice, maxPriceInMarket]);

  const updateRangeSlider = () => {
    if (!rangeTrackRef.current || !rangeSelectedRef.current || 
        !minHandleRef.current || !maxHandleRef.current) return;

    const trackWidth = rangeTrackRef.current.offsetWidth;
    const minPercent = (parseFloat(minPrice) / maxPriceInMarket) * 100;
    const maxPercent = (parseFloat(maxPrice) / maxPriceInMarket) * 100;
    
    // Update slider handles position
    minHandleRef.current.style.left = `${minPercent}%`;
    maxHandleRef.current.style.left = `${maxPercent}%`;
    
    // Update selected range
    rangeSelectedRef.current.style.left = `${minPercent}%`;
    rangeSelectedRef.current.style.width = `${maxPercent - minPercent}%`;
  };

  const fetchActiveAuctions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:5002/api/nfts/active-auctions');
      const nftsWithRemainingTime = response.data.auctions.map(nft => ({
        ...nft,
        remainingTime: getRemainingTime(nft.auction.endTime)
      }));
      
      // Determina il prezzo massimo nel marketplace
      if (nftsWithRemainingTime.length > 0 && web3) {
        const prices = nftsWithRemainingTime.map(nft => 
          parseFloat(web3.utils.fromWei(nft.auction.buyNowPrice, "ether"))
        );
        const highestPrice = Math.ceil(Math.max(...prices));
        setMaxPriceInMarket(highestPrice > 0 ? highestPrice : 20);
        setMaxPrice(String(highestPrice > 0 ? highestPrice : 20));
      }
      
      setNfts(nftsWithRemainingTime);
      setFilteredNfts(nftsWithRemainingTime);
    } catch (error) {
      console.error("Error fetching active auctions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRemainingTime = (endTime) => {
    const now = Math.floor(Date.now() / 1000);
    const endTimeNum = parseInt(endTime);
    const remaining = endTimeNum - now;

    if (remaining <= 0) return "Expired";

    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  // Start a timer to update remaining time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedNfts = nfts.map(nft => ({
        ...nft,
        remainingTime: getRemainingTime(nft.auction.endTime)
      }));
      setNfts(updatedNfts);
    }, 1000);

    return () => clearInterval(interval);
  }, [nfts]);

  const applyFilters = () => {
    let filtered = [...nfts];

    // Filter by player name
    if (playerName.trim() !== "") {
      filtered = filtered.filter(nft => 
        nft.metadata.name.toLowerCase().includes(playerName.toLowerCase())
      );
    }

    // Filter by rarity
    if (rarity !== "") {
      filtered = filtered.filter(nft => 
        nft.metadata.attributes.some(attr => 
          attr.trait_type === "Rarity" && attr.value === rarity
        )
      );
    }

    // Filter by price range
    if (web3 && minPrice !== "" && maxPrice !== "" && !isNaN(minPrice) && !isNaN(maxPrice)) {
      filtered = filtered.filter(nft => {
        const nftPrice = parseFloat(web3.utils.fromWei(nft.auction.buyNowPrice, "ether"));
        return nftPrice >= parseFloat(minPrice) && nftPrice <= parseFloat(maxPrice);
      });
    }

    setFilteredNfts(filtered);
  };

  const resetFilters = () => {
    setPlayerName("");
    setRarity("");
    setMinPrice("0");
    setMaxPrice(String(maxPriceInMarket));
  };

  const handleMinPriceChange = (e) => {
    const value = e.target.value;
    if (value === "" || isNaN(value)) return;
    
    const newMinPrice = Math.min(parseFloat(value), parseFloat(maxPrice) - 0.01);
    setMinPrice(String(Math.max(0, newMinPrice)));
  };

  const handleMaxPriceChange = (e) => {
    const value = e.target.value;
    if (value === "" || isNaN(value)) return;
    
    const newMaxPrice = Math.max(parseFloat(value), parseFloat(minPrice) + 0.01);
    setMaxPrice(String(Math.min(maxPriceInMarket, newMaxPrice)));
  };

  // Handle slider drag events
  const initDrag = (type) => (e) => {
    e.preventDefault();
    
    const handleMouseMove = (moveEvent) => {
      if (!rangeTrackRef.current) return;
      
      const trackRect = rangeTrackRef.current.getBoundingClientRect();
      const trackWidth = trackRect.width;
      
      // Calculate position as percentage
      let percent = Math.max(0, Math.min(100, 
        ((moveEvent.clientX - trackRect.left) / trackWidth) * 100
      ));
      
      // Convert to price value
      let price = (percent / 100) * maxPriceInMarket;
      price = Math.round(price * 100) / 100; // Round to 2 decimal places
      
      if (type === 'min') {
        if (price < parseFloat(maxPrice)) {
          setMinPrice(String(price));
        }
      } else {
        if (price > parseFloat(minPrice)) {
          setMaxPrice(String(price));
        }
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const buyNow = async (tokenId, price) => {
    try {
      setIsLoading(true);
      await contract.methods.buyNow(tokenId).send({
        from: account,
        value: price,
      });
      alert("NFT purchased successfully!");
      fetchActiveAuctions();
    } catch (error) {
      console.error("Error buying NFT:", error);
      alert(`Failed to buy NFT: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMedia = (metadata) => {
    const handleVideoClick = (e) => {
      if (e.target.paused) {
        e.target.play();
      } else {
        e.target.pause();
      }
    };
  
    if (metadata.animation_url) {
      return (
        <video 
          loop
          playsInline
          className="nft-image"
          onClick={handleVideoClick}
          style={{ cursor: "pointer" }}
        >
          <source src={metadata.animation_url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }
  
    if (metadata.image) {
      return <img src={metadata.image} alt={metadata.name} className="nft-image"/>;
    }
  
    return <div className="nft-no-media">No media available</div>;
  };

  return (
    <div className="marketplace-container">
      <div className="marketplace-header">
        <h2>NFT Marketplace</h2>
        <button 
          className="filter-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {showFilters && (
        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="playerName">Player Name:</label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Search by name..."
            />
          </div>

          <div className="filter-group">
            <label htmlFor="rarity">Rarity:</label>
            <select
              id="rarity"
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
            >
              <option value="">All</option>
              <option value="Common">Common</option>
              <option value="Rare">Rare</option>
              <option value="Legendary">Legendary</option>
              <option value="Masterpiece">Masterpiece</option>
            </select>
          </div>

          <div className="price-range-container">
            <label>Price Range (ETH):</label>
            
            <div className="price-slider-container">
              <div className="price-range-track" ref={rangeTrackRef}></div>
              <div className="price-range-selected" ref={rangeSelectedRef}></div>
              <div 
                className="price-range-handle" 
                ref={minHandleRef} 
                onMouseDown={initDrag('min')}
                style={{ left: '0%' }}
              ></div>
              <div 
                className="price-range-handle" 
                ref={maxHandleRef} 
                onMouseDown={initDrag('max')}
                style={{ left: '100%' }}
              ></div>
            </div>
            
            <div className="price-range-values">
              <input
                type="number"
                className="price-range-input"
                value={minPrice}
                onChange={handleMinPriceChange}
                min="0"
                max={maxPrice}
                step="0.01"
              />
              <span>to</span>
              <input
                type="number"
                className="price-range-input"
                value={maxPrice}
                onChange={handleMaxPriceChange}
                min={minPrice}
                max={maxPriceInMarket}
                step="0.01"
              />
            </div>
          </div>

          <button className="reset-btn" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      )}

      {isLoading && <div className="loading">Loading...</div>}

      {!isLoading && (
        <div className="results-summary">
          Found {filteredNfts.length} NFT {filteredNfts.length !== nfts.length ? `(out of ${nfts.length} total)` : ""}
        </div>
      )}

      {!isLoading && filteredNfts.length === 0 ? (
        <div className="no-results">
          <p>No NFTs found with the selected filters.</p>
          {nfts.length > 0 && (
            <button className="reset-btn" onClick={resetFilters}>
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="nft-grid">
          {filteredNfts.map((nft) => (
            <div key={nft.tokenId} className="nft-card">
              <div className="marketplace-nft-media-container">
                {renderMedia(nft.metadata)}
                <div className="nft-card-overlay">
                  <h3>{nft.metadata.name}</h3>
                  <div className="nft-rarity">
                    {nft.metadata.attributes.find(attr => attr.trait_type === "Rarity")?.value || "Unknown"}
                  </div>
                </div>
              </div>
              <div className="nft-auction-time">
                <span>Time Left: {nft.remainingTime}</span>
              </div>
              <div className="nft-card-actions">
                <button
                  onClick={() => buyNow(nft.tokenId, nft.auction.buyNowPrice)}
                  className="buy-btn"
                  disabled={!account || isLoading}
                >
                  Buy Now <br/>({web3 ? web3.utils.fromWei(nft.auction.buyNowPrice, "ether") : 0} ETH)
                </button>
                <Link
                  to={`/nft/${nft.tokenId}`}
                  className="info-btn"
                >
                  Place Bid
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Marketplace;