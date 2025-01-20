import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import axios from 'axios';

// ABI del contratto
const ABI = [ /* ABI del contratto */ ];
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS; // Indirizzo del contratto

function Auction() {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [tokenId, setTokenId] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [auctionStatus, setAuctionStatus] = useState("");  // Stato dell'asta (es. "in corso", "terminata")

  useEffect(() => {
    const initWeb3 = async () => {
      try {
        if (window.ethereum) {
          const web3Instance = new Web3(window.ethereum);
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const accounts = await web3Instance.eth.getAccounts();
          setWeb3(web3Instance);
          setAccount(accounts[0]);
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
  }, []);

  const startAuction = async () => {
    try {
      if (!web3 || !contract || !account) {
        alert("Please connect your wallet first!");
        return;
      }

      const auctionDuration = 3600; // Durata dell'asta in secondi (1 ora)
      await contract.methods.startAuction(tokenId, auctionDuration).send({ from: account });

      setAuctionStatus('Auction started');
      alert("Auction started successfully!");
    } catch (error) {
      console.error("Error starting auction:", error);
    }
  };

  const placeBid = async () => {
    try {
      if (!web3 || !contract || !account) {
        alert("Please connect your wallet first!");
        return;
      }

      const bidAmountInWei = web3.utils.toWei(bidAmount, 'ether');
      await contract.methods.placeBid(tokenId).send({ from: account, value: bidAmountInWei });

      setAuctionStatus('Bid placed');
      alert("Bid placed successfully!");
    } catch (error) {
      console.error("Error placing bid:", error);
    }
  };

  const endAuction = async () => {
    try {
      if (!web3 || !contract || !account) {
        alert("Please connect your wallet first!");
        return;
      }

      await contract.methods.endAuction(tokenId).send({ from: account });

      setAuctionStatus('Auction ended');
      alert("Auction ended successfully!");
    } catch (error) {
      console.error("Error ending auction:", error);
    }
  };

  return (
    <div>
      <h2>Auction</h2>
      <div>
        <label>Token ID: </label>
        <input
          type="text"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="Enter Token ID"
        />
      </div>
      <div>
        <label>Bid Amount (ETH): </label>
        <input
          type="text"
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
          placeholder="Enter bid amount"
        />
      </div>
      <div>
        <p>Auction Status: {auctionStatus}</p>
      </div>
      <button onClick={startAuction}>Start Auction</button>
      <button onClick={placeBid}>Place Bid</button>
      <button onClick={endAuction}>End Auction</button>
    </div>
  );
}

export default Auction;
