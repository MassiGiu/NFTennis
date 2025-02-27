const express = require("express");
const router = express.Router();

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
    const { recipient, tokenURI } = req.body;

    if (!recipient || !tokenURI) {
      return res.status(400).json({ error: "Missing required fields (recipient, tokenURI)" });
    }

    try {
      console.log("Minting NFT with:", recipient, tokenURI);

      const mintResult = await nftennisContract.methods
        .mintNFT(recipient, tokenURI)
        .send({ from: ownerAddress, gas: 3000000 });

      const resultStringified = JSON.parse(
        JSON.stringify(mintResult, (key, value) => (typeof value === "bigint" ? value.toString() : value))
      );

      res.json({ success: true, mintResult: resultStringified });
    } catch (error) {
      console.error("Error minting NFT in nft_routes:", error);
      res.status(500).json({ error: "An error occurred while minting the NFT" });
    }
  });

  return router;
};
