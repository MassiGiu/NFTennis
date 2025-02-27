import React, { useEffect, useState } from "react";
import Web3 from "web3";
import NFTennisContract from "./NFTennis.json";

const ABI = NFTennisContract.abi;
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

const Marketplace = () => {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [myNfts, setMyNfts] = useState([]);
  const [remainingTimes, setRemainingTimes] = useState({});
  const [bidAmount, setBidAmount] = useState('');
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('auctions'); // 'auctions' o 'myNFTs'

  useEffect(() => {
    const initWeb3 = async () => {
      try {
        if (window.ethereum) {
          const web3Instance = new Web3(window.ethereum);
          await window.ethereum.request({ method: "eth_requestAccounts" });
          const accounts = await web3Instance.eth.getAccounts();
          setWeb3(web3Instance);
          setAccount(accounts[0]);
          
          // Ascolta i cambiamenti di account
          window.ethereum.on('accountsChanged', function (accounts) {
            setAccount(accounts[0]);
          });
          
          const contractInstance = new web3Instance.eth.Contract(ABI, CONTRACT_ADDRESS);
          setContract(contractInstance);
        } else {
          alert("Please install MetaMask!");
        }
      } catch (error) {
        console.error("Error initializing Web3:", error);
      }
    };

    initWeb3();
    
    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  useEffect(() => {
    if (contract) {
      fetchActiveAuctions();
    }
  }, [contract]);
  
  useEffect(() => {
    if (contract && account) {
      fetchMyNFTs();
    }
  }, [contract, account]);

  const fetchActiveAuctions = async () => {
    setIsLoading(true);
    try {
      const activeAuctionIds = await contract.methods.getActiveAuctions().call();
      if (activeAuctionIds.length === 0) {
        setNfts([]);
        setIsLoading(false);
        return;
      }

      const auctionsData = await Promise.all(
        activeAuctionIds.map(async (tokenId) => {
          const auction = await contract.methods.auctions(tokenId).call();
          const tokenURI = await contract.methods.tokenURI(tokenId).call();
          const owner = await contract.methods.ownerOf(tokenId).call();

          let metadata = { image: "", name: "Unknown", description: "Unknown" };
          try {
            const metadataResponse = await fetch(tokenURI);
            metadata = await metadataResponse.json();
          } catch (error) {
            console.error(`Error fetching metadata for token ${tokenId}:`, error);
          }

          return {
            tokenId,
            owner,
            tokenURI,
            auction: {
              seller: auction.seller,
              highestBidder: auction.highestBidder,
              highestBid: auction.highestBid,
              endTime: auction.endTime,
              buyNowPrice: auction.buyNowPrice,
              open: auction.open, // Corretto da 'active' a 'open'
            },
            metadata,
          };
        })
      );

      setNfts(auctionsData);
    } catch (error) {
      console.error("Error fetching active auctions:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchMyNFTs = async () => {
    if (!account || !contract) return;
    
    setIsLoading(true);
    try {
      const myTokenIds = await contract.methods.getOwnedNFTs(account).call();
      
      const myNftsData = await Promise.all(
        myTokenIds.map(async (tokenId) => {
          let tokenURI;
          let metadata = { image: "", name: "Unknown", description: "Unknown" };
          
          try {
            tokenURI = await contract.methods.tokenURI(tokenId).call();
            const metadataResponse = await fetch(tokenURI);
            metadata = await metadataResponse.json();
          } catch (error) {
            console.error(`Error fetching metadata for token ${tokenId}:`, error);
          }
          
          return {
            tokenId,
            tokenURI,
            metadata
          };
        })
      );
      
      setMyNfts(myNftsData);
    } catch (error) {
      console.error("Error fetching your NFTs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (nfts.length === 0) return;

    const interval = setInterval(() => {
      const updatedTimes = {};
      nfts.forEach((nft) => {
        updatedTimes[nft.tokenId] = getRemainingTime(nft.auction.endTime);
      });
      setRemainingTimes(updatedTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [nfts]);

  const getRemainingTime = (endTime) => {
    // Conversione in sicurezza per evitare errori con BigInt
    const now = Math.floor(Date.now() / 1000);
    
    // Converti in numeri normali invece di BigInt
    const endTimeNum = parseInt(endTime);
    const remaining = endTimeNum - now;

    if (remaining <= 0) return "Expired";

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const placeBid = async (e) => {
    if (e) e.preventDefault(); // Prevenire il comportamento predefinito del form
    
    if (!selectedTokenId || !bidAmount) {
      alert("Please select a token and enter a bid amount!");
      return;
    }

    try {
      setIsLoading(true);
      const auction = await contract.methods.auctions(selectedTokenId).call();
      const currentBid = web3.utils.toWei(bidAmount, "ether");
      const currentHighestBid = auction.highestBid;

      if (parseInt(currentBid) <= parseInt(currentHighestBid)) {
        alert(`Your bid must be higher than the current bid (${web3.utils.fromWei(currentHighestBid, "ether")} ETH).`);
        setIsLoading(false);
        return;
      }

      const buyNowPrice = auction.buyNowPrice;
      if (parseInt(currentBid) > parseInt(buyNowPrice)) {
        alert("Bid exceeds the Buy Now price. Proceeding with Buy Now instead.");
        await buyNow(selectedTokenId);
        return;
      }

      await contract.methods.bid(selectedTokenId).send({
        from: account,
        value: currentBid,
      });

      alert(`Bid of ${bidAmount} ETH placed successfully on token ID ${selectedTokenId}!`);
      setBidAmount('');
      
      // Aggiorna i dati
      await fetchActiveAuctions();
      await fetchMyNFTs();
    } catch (error) {
      console.error("Error placing bid:", error);
      alert(`Failed to place bid: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const buyNow = async (tokenId) => {
    try {
      setIsLoading(true);
      const auction = await contract.methods.auctions(tokenId).call();
      
      if (!auction.open) { // Verificare 'open' invece di 'active'
        alert("This auction is no longer active.");
        setIsLoading(false);
        return;
      }

      const buyNowPrice = auction.buyNowPrice;

      await contract.methods.buyNow(tokenId).send({
        from: account,
        value: buyNowPrice,
      });

      alert(`NFT bought successfully for ${web3.utils.fromWei(buyNowPrice, "ether")} ETH!`);
      
      // Aggiorna i dati
      await fetchActiveAuctions();
      await fetchMyNFTs();
    } catch (error) {
      console.error("Error buying now:", error);
      alert(`Failed to buy NFT: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const startAuction = async (tokenId) => {
    try {
      // Implementare la logica per avviare un'asta per un NFT posseduto
      const duration = prompt("Enter auction duration in seconds:", "86400");
      const buyNowPrice = prompt("Enter Buy Now price in ETH:", "1");
      
      if (!duration || !buyNowPrice) return;
      
      setIsLoading(true);
      await contract.methods.startAuction(
        tokenId, 
        parseInt(duration), 
        web3.utils.toWei(buyNowPrice, "ether")
      ).send({
        from: account
      });
      
      alert(`Auction started successfully for token ID ${tokenId}!`);
      
      // Aggiorna i dati
      await fetchActiveAuctions();
      await fetchMyNFTs();
    } catch (error) {
      console.error("Error starting auction:", error);
      alert(`Failed to start auction: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMedia = (metadata) => {
    if (metadata.image) {
      return <img src={metadata.image} alt={metadata.name} style={{ width: "200px", height: "200px", objectFit: "cover" }} />;
    }
    if (metadata.video) {
      return (
        <video width="200" height="200" controls>
          <source src={metadata.video} type="video/mp4" />
        </video>
      );
    }
    return null;
  };

  const handleTokenSelect = (tokenId) => {
    setSelectedTokenId(tokenId);
  };

  return (
    <div>
      <h1>NFTennis Marketplace</h1>
      {web3 && account && <p>Connected Account: <span style={{ fontWeight: "bold" }}>{account}</span></p>}
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: "20px", borderBottom: "1px solid #eee" }}>
        <button 
          style={{ 
            padding: "10px 20px", 
            marginRight: "10px", 
            backgroundColor: activeTab === 'auctions' ? "#0066cc" : "#f1f1f1",
            color: activeTab === 'auctions' ? "white" : "black",
            border: "none",
            borderRadius: "5px 5px 0 0"
          }}
          onClick={() => setActiveTab('auctions')}
        >
          Active Auctions
        </button>
        <button 
          style={{ 
            padding: "10px 20px", 
            backgroundColor: activeTab === 'myNFTs' ? "#0066cc" : "#f1f1f1",
            color: activeTab === 'myNFTs' ? "white" : "black",
            border: "none",
            borderRadius: "5px 5px 0 0"
          }}
          onClick={() => setActiveTab('myNFTs')}
        >
          My NFTs
        </button>
      </div>
      
      {/* Loader */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <p>Loading...</p>
        </div>
      )}
      
      {/* Tab Content */}
      {activeTab === 'auctions' ? (
        <div>
          {/* Bid Form */}
          {selectedTokenId && (
            <div style={{ margin: "20px 0", padding: "15px", border: "1px solid #eee", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
              <h3>Place a Bid</h3>
              <form onSubmit={placeBid}>
                <div>
                  <label>Selected Token ID: </label>
                  <span style={{ fontWeight: "bold" }}>{selectedTokenId}</span>
                </div>
                <div style={{ margin: "10px 0" }}>
                  <label>Bid Amount (ETH): </label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={bidAmount} 
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="0.0" 
                    style={{ padding: "5px", width: "150px" }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={!selectedTokenId || isLoading}
                  style={{ 
                    padding: "8px 15px", 
                    backgroundColor: "#0066cc", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Place Bid
                </button>
              </form>
            </div>
          )}
          
          <h2>Active Auctions</h2>
          {!isLoading && nfts.length === 0 ? (
            <p>No active auctions found.</p>
          ) : (
            <div className="nft-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              {nfts.map((nft) => (
                <div
                  key={nft.tokenId}
                  className={`auction-card ${selectedTokenId === nft.tokenId ? "selected" : ""}`}
                  style={{ 
                    border: selectedTokenId === nft.tokenId ? "2px solid #0066cc" : "1px solid #ccc", 
                    padding: "15px", 
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor: "white",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                  onClick={() => handleTokenSelect(nft.tokenId)}
                >
                  <div style={{ textAlign: "center", marginBottom: "10px" }}>
                    {nft.metadata && renderMedia(nft.metadata)}
                  </div>
                  <h3 style={{ margin: "10px 0", fontSize: "18px" }}>{nft.metadata.name}</h3>
                  <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>{nft.metadata.description}</p>
                  
                  <div style={{ fontSize: "14px", marginBottom: "5px" }}>
                    <strong>Token ID:</strong> {nft.tokenId}
                  </div>
                  <div style={{ fontSize: "14px", marginBottom: "5px" }}>
                    <strong>Seller:</strong> {nft.auction.seller.substring(0, 6)}...{nft.auction.seller.substring(38)}
                  </div>
                  <div style={{ fontSize: "14px", marginBottom: "5px" }}>
                    <strong>Current Bid:</strong> {web3 ? web3.utils.fromWei(nft.auction.highestBid, "ether") : 0} ETH
                  </div>
                  <div style={{ fontSize: "14px", marginBottom: "5px" }}>
                    <strong>Buy Now Price:</strong> {web3 ? web3.utils.fromWei(nft.auction.buyNowPrice, "ether") : 0} ETH
                  </div>
                  <div style={{ fontSize: "14px", marginBottom: "15px", color: remainingTimes[nft.tokenId] === "Expired" ? "red" : "green" }}>
                    <strong>Time Remaining:</strong> {remainingTimes[nft.tokenId] || "Calculating..."}
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Fermare la propagazione per non selezionare il token
                      buyNow(nft.tokenId);
                    }}
                    disabled={isLoading}
                    style={{ 
                      width: "100%", 
                      padding: "8px", 
                      backgroundColor: "#28a745", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginTop: "5px"
                    }}
                  >
                    Buy Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2>My NFTs</h2>
          {!isLoading && myNfts.length === 0 ? (
            <p>You don't own any NFTs yet.</p>
          ) : (
            <div className="nft-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              {myNfts.map((nft) => (
                <div
                  key={nft.tokenId}
                  style={{ 
                    border: "1px solid #ccc", 
                    padding: "15px", 
                    borderRadius: "8px",
                    backgroundColor: "white",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                >
                  <div style={{ textAlign: "center", marginBottom: "10px" }}>
                    {nft.metadata && renderMedia(nft.metadata)}
                  </div>
                  <h3 style={{ margin: "10px 0", fontSize: "18px" }}>{nft.metadata.name}</h3>
                  <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>{nft.metadata.description}</p>
                  
                  <div style={{ fontSize: "14px", marginBottom: "15px" }}>
                    <strong>Token ID:</strong> {nft.tokenId}
                  </div>
                  
                  <button 
                    onClick={() => startAuction(nft.tokenId)}
                    disabled={isLoading}
                    style={{ 
                      width: "100%", 
                      padding: "8px", 
                      backgroundColor: "#0066cc", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Start Auction
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Update Button */}
      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <button 
          onClick={activeTab === 'auctions' ? fetchActiveAuctions : fetchMyNFTs}
          disabled={isLoading}
          style={{ 
            padding: "10px 20px", 
            backgroundColor: "#6c757d", 
            color: "white", 
            border: "none", 
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default Marketplace;