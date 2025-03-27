import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { initWeb3 } from "../utils/web3";
import "./NFTPage.css";

const NFT = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [nft, setNft] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [remainingTime, setRemainingTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [owner, setOwner] = useState("");

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
    if (contract && tokenId !== undefined) {
      fetchNFTDetails();
    }
  }, [contract, tokenId]);

  useEffect(() => {
    if (nft && nft.auction.open) {
      const interval = setInterval(() => {
        setRemainingTime(getRemainingTime(nft.auction.endTime));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [nft]);

  const fetchNFTDetails = async () => {
    setIsLoading(true);
    try {
      const auction = await contract.methods.auctions(tokenId).call();
      const tokenURI = await contract.methods.tokenURI(tokenId).call();
      const currentOwner = await contract.methods.ownerOf(tokenId).call();
      
      let metadata = { image: "", name: "Unknown", description: "Unknown" };
      try {
        const metadataResponse = await fetch(tokenURI);
        metadata = await metadataResponse.json();
      } catch (error) {
        console.error(`Error fetching metadata for token ${tokenId}:`, error);
      }

      setNft({
        tokenId,
        tokenURI,
        auction,
        metadata
      });
      
      setOwner(currentOwner);
      
      if (auction.open) {
        setRemainingTime(getRemainingTime(auction.endTime));
      }
    } catch (error) {
      console.error("Error fetching NFT details:", error);
      navigate("/marketplace");
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

  const placeBid = async (e) => {
    e.preventDefault();
    if (!bidAmount) {
      alert("Please enter a bid amount!");
      return;
    }

    try {
      setIsLoading(true);
      const currentBid = web3.utils.toWei(bidAmount, "ether");
      await contract.methods.bid(tokenId).send({
        from: account,
        value: currentBid,
      });

      alert(`Bid of ${bidAmount} ETH placed successfully!`);
      setBidAmount("");
      fetchNFTDetails();
    } catch (error) {
      console.error("Error placing bid:", error);
      alert(`Failed to place bid: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const buyNow = async () => {
    if (!nft) return;
    
    try {
      setIsLoading(true);
      await contract.methods.buyNow(tokenId).send({
        from: account,
        value: nft.auction.buyNowPrice,
      });

      alert("NFT purchased successfully!");
      fetchNFTDetails();
    } catch (error) {
      console.error("Error buying NFT:", error);
      alert(`Failed to buy NFT: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMedia = (metadata) => {
    if (metadata.animation_url) {
      return (
        <video className="nft-page__media" controls> <source src={metadata.animation_url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }
    if (metadata.image) {
      return <img src={metadata.image} alt={metadata.name} className="nft-page__media" />;
    }
    return <div className="nft-page__media nft-page__media--placeholder">No Media</div>;
  };

  const renderMediaLinks = (metadata) => {
    return (
      <>
        <p><strong>Metadata URI:</strong> <a href={nft.tokenURI} target="_blank" rel="noopener noreferrer">{nft.tokenURI}</a></p>
        {metadata.image && (
          <p><strong>Image URI:</strong> <a href={metadata.image} target="_blank" rel="noopener noreferrer">{metadata.image}</a></p>
        )}
        {metadata.animation_url && (
          <p><strong>Animation URI:</strong> <a href={metadata.animation_url} target="_blank" rel="noopener noreferrer">{metadata.animation_url}</a></p>
        )}
      </>
    );
  };

  if (isLoading) {
    return <div className="nft-page__loading">Loading NFT details...</div>;
  }

  if (!nft) {
    return <div className="nft-page__not-found">NFT not found</div>;
  }

  return (
    <div className="nft-page">
      <button 
        onClick={() => navigate("/marketplace")}
        className="nft-page__back-button"
      >
        Back to Marketplace
      </button>
      
      <div className="nft-page__content">
        <div className="nft-page__media-container">
          {renderMedia(nft.metadata)}
        </div>
        
        <div className="nft-page__details">
          <h1 className="nft-page__title">{nft.metadata.name}</h1>
          <p className="nft-page__description">{nft.metadata.description}</p>
          
          <div className="nft-page__info-details">
            <h2 className="nft-page__section-title">NFT Details</h2>
            <div className="nft-page__info">
              <p><strong>Token ID:</strong> {tokenId}</p>
              <p><strong>Current Owner:</strong> {owner}</p>
              {renderMediaLinks(nft.metadata)}
            </div>
          </div>
          
          {nft.auction.open ? (
            <div className="nft-page__auction-details">
              <h2 className="nft-page__section-title">Auction Details</h2>
              <div className="nft-page__auction-info">
                <div className="nft-page__info-column">
                  <p><strong>Seller:</strong> {nft.auction.seller}</p>
                  <p><strong>Current Bid:</strong> {web3.utils.fromWei(nft.auction.highestBid, "ether")} ETH</p>
                </div>
                <div className="nft-page__info-column">
                  <p><strong>Highest Bidder:</strong> {nft.auction.highestBidder !== "0x0000000000000000000000000000000000000000" ? nft.auction.highestBidder : "No bids yet"}</p>
                  <p><strong>Time Remaining:</strong> {remainingTime}</p>
                </div>
              </div>

              <div className="nft-page__buy-now-section">
                <h3 className="nft-page__price-title">Buy Now Price: {web3.utils.fromWei(nft.auction.buyNowPrice, "ether")} ETH</h3>
                <button 
                  onClick={buyNow}
                  className="nft-page__buy-now-button"
                >
                  Buy Now
                </button>
              </div>
              
              <form onSubmit={placeBid} className="nft-page__bid-form">
                <h3 className="nft-page__form-title">Place a Bid</h3>
                <p>Current highest bid: {web3.utils.fromWei(nft.auction.highestBid, "ether")} ETH</p>
                <div className="nft-page__bid-input-container">
                  <label className="nft-page__input-label">
                    Your Bid Amount (ETH):
                    <input 
                      type="number" 
                      step="0.001" 
                      value={bidAmount} 
                      onChange={(e) => setBidAmount(e.target.value)} 
                      min={parseFloat(web3.utils.fromWei(nft.auction.highestBid, "ether")) + 0.001}
                      required 
                      className="nft-page__bid-input"
                    />
                  </label>
                  <button 
                    type="submit" 
                    className="nft-page__place-bid-button"
                  >
                    Place Bid
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="nft-page__not-for-sale">
              <p className="nft-page__not-for-sale-text">This NFT is not currently up for auction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NFT;