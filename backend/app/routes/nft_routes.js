const express = require("express");
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = (nftennisContract, web3, ownerAddress) => {
  // Fetch all NFTs
  router.get("/", async (req, res) => {
    try {
      const totalTokens = await nftennisContract.methods.tokenCounter().call();
      const tokens = [];

      for (let i = 0; i < totalTokens; i++) {
        try {
          const tokenURI = await nftennisContract.methods.tokenURI(i).call();
          const owner = await nftennisContract.methods.ownerOf(i).call();
          tokens.push({ tokenId: i.toString(), tokenURI, owner });
        } catch (error) {
          console.warn(`Token ${i} not found or inaccessible:`, error.message);
        }
      }

      res.json({ totalTokens: totalTokens.toString(), tokens });
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      res.status(500).json({ error: "An error occurred while fetching NFTs" });
    }
  });

  // Mint a new NFT
  router.post("/mint", async (req, res) => {
    const { recipient, tokenURI, rarity, mediaType } = req.body;
    
    if (!recipient || !tokenURI || rarity === undefined || mediaType === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields (recipient, tokenURI, rarity, mediaType)" 
      });
    }
    
    // Validate rarity and mediaType combinations
    if (mediaType == 1 && rarity != 3) { // VIDEO must be MASTERPIECE
      return res.status(400).json({ 
        error: "Videos can only have MASTERPIECE rarity" 
      });
    }
    
    if (mediaType == 0 && rarity > 2) { // IMAGES can be COMMON, RARE or LEGENDARY
      return res.status(400).json({ 
        error: "Images can only have COMMON, RARE or LEGENDARY rarity" 
      });
    }

    try {
      console.log("Minting NFT with:", recipient, tokenURI, rarity, mediaType);
      const mintResult = await nftennisContract.methods
        .mintNFT(recipient, tokenURI, rarity, mediaType)
        .send({ from: ownerAddress, gas: 3000000 });
        
      const resultStringified = JSON.parse(
        JSON.stringify(mintResult, (key, value) => 
          (typeof value === "bigint" ? value.toString() : value))
      );
      
      res.json({ success: true, mintResult: resultStringified });
    } catch (error) {
      console.error("Error minting NFT in nft_routes:", error);
      res.status(500).json({ 
        error: "An error occurred while minting the NFT",
        details: error.message 
      });
    }
  });

  // Funzione helper per convertire BigInt in string durante la serializzazione JSON
  function replaceBigInt(key, value) {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }

// Utilizzo nella rotta
router.get("/active-auctions", async (req, res) => {
  try {
    const activeAuctionIds = await nftennisContract.methods.getActiveAuctions().call();
    const auctionsData = await Promise.all(
      activeAuctionIds.map(async (tokenId) => {
        const auction = await nftennisContract.methods.auctions(tokenId).call();
        const tokenURI = await nftennisContract.methods.tokenURI(tokenId).call();
        let metadata = { image: "", name: "Unknown", description: "Unknown" };
        try {
          const metadataResponse = await fetch(tokenURI);
          metadata = await metadataResponse.json();
        } catch (error) {
          console.error(`Error fetching metadata for token ${tokenId}:`, error);
        }

        return {
          tokenId,
          tokenURI,
          auction,
          metadata
        };
      })
    );

    // Serializza con il replacer per gestire BigInt
    const jsonString = JSON.stringify({ auctions: auctionsData }, replaceBigInt);
    res.setHeader('Content-Type', 'application/json');
    res.send(jsonString);
  } catch (error) {
    console.error("Error fetching active auctions:", error);
    res.status(500).json({ error: "An error occurred while fetching active auctions" });
  }
});

  return router;
};
