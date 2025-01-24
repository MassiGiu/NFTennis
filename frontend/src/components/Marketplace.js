import React, { useEffect, useState } from "react";
import Web3 from "web3";
import NFTennisContract from './NFTennis.json'

const ABI = NFTennisContract.abi;
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS; // Specifica l'indirizzo del contratto

const Marketplace = () => {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [selectedTokenId, setSelectedTokenId] = useState(null);

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
          alert('Please install MetaMask!');
        }
      } catch (error) {
        console.error("Error initializing Web3: ", error);
      }
    };

    initWeb3();
  }, []);

  useEffect(() => {
    if (contract) {
      fetch("http://localhost:5001/api/nfts")
        .then((response) => response.json())
        .then((data) => {
          const fetchMetadata = async () => {
            const nftDetails = await Promise.all(data.tokens.map(async (nft) => {
              try {
                const metadataResponse = await fetch(nft.tokenURI);
                const metadata = await metadataResponse.json();
                return {
                  ...nft,
                  metadata
                };
              } catch (error) {
                console.error(`Error fetching metadata for token ${nft.tokenId}:`, error);
                return {
                  ...nft,
                  metadata: { image: '', name: 'Unknown', description: 'Unknown' }
                };
              }
            }));
            setNfts(nftDetails);
          };
          fetchMetadata();
        })
        .catch((error) => console.error("Error fetching NFTs:", error));
    }
  }, [contract]);

  // Funzione per avviare un'asta
  const startAuction = async (tokenId, duration) => {
    try {
      // La durata dell'asta va passata come secondo parametro (in secondi)
      await contract.methods.startAuction(tokenId, duration).send({ from: account });
      alert('Auction started successfully!');
    } catch (error) {
      console.error("Error starting auction:", error);
      alert('Error starting auction');
    }
  };

  // Funzione per fare un'offerta
  const placeBid = async () => {
    if (!selectedTokenId || !bidAmount) {
      alert('Please select a token and enter a bid amount!');
      return;
    }

    try {
      await contract.methods.bid(selectedTokenId).send({
        from: account,
        value: web3.utils.toWei(bidAmount, 'ether'),
      });
      alert('Bid placed successfully!');
    } catch (error) {
      console.error("Error placing bid:", error);
      alert('Error placing bid');
    }
  };

  // Funzione per terminare un'asta
  const endAuction = async (tokenId) => {
    try {
      await contract.methods.endAuction(tokenId).send({ from: account });
      alert('Auction ended successfully!');
    } catch (error) {
      console.error("Error ending auction:", error);
      alert('Error ending auction');
    }
  };

  return (
    <div>
      <h1>Marketplace</h1>
      {web3 && account && (
        <div>
          <p>Connected Account: {account}</p>
          <p>Web3 Version: {web3.version}</p>
        </div>
      )}
      <div>
        {nfts.map((nft) => (
          <div key={nft.tokenId}>
            <p>Token ID: {nft.tokenId}</p>
            <p>Owner: {nft.owner}</p>
            <p>Metadata: <a href={nft.tokenURI}>{nft.tokenURI}</a></p>
            {nft.metadata.image && (
              <img src={nft.metadata.image} alt={nft.metadata.name} style={{ width: '200px', height: '200px' }} />
            )}
            <p>{nft.metadata.name}</p>
            <p>{nft.metadata.description}</p>

            <button onClick={() => setSelectedTokenId(nft.tokenId)}>Select for Auction</button>
            <button onClick={() => startAuction(nft.tokenId, 3600)}>Start Auction (1 hour)</button>
            <button onClick={() => endAuction(nft.tokenId)}>End Auction</button>

            {selectedTokenId === nft.tokenId && (
              <div>
                <h3>Place a Bid</h3>
                <input 
                  type="text" 
                  placeholder="Bid Amount in ETH" 
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)} 
                />
                <button onClick={placeBid}>Place Bid</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marketplace;
