const express = require("express");
const router = express.Router();

module.exports = (nftennisContract, web3, ownerAddress) => {
  // Start an auction
  router.post("/start", async (req, res) => {
    const { tokenId } = req.body;
    const accounts = await web3.eth.getAccounts();

    try {
      // Verifica che il chiamante sia il proprietario del token
      const owner = await nftennisContract.methods.ownerOf(tokenId).call();
      if (owner.toLowerCase() !== accounts[0].toLowerCase()) {
        return res.status(403).json({ error: "Only the owner can start an auction" });
      }

      // Controlla se l'asta è già aperta
      const auction = await nftennisContract.methods.auctions(tokenId).call();
      if (auction.open) {
        return res.status(400).json({ error: "Auction already open for this token" });
      }

      const startResult = await nftennisContract.methods
        .startAuction(tokenId)
        .send({ from: accounts[0], gas: 3000000 });

      res.json({ success: true, startResult });
    } catch (error) {
      console.error("Error starting auction:", error);
      res.status(500).json({ error: "An error occurred while starting the auction" });
    }
  });

  // Place a bid
  router.post("/bid", async (req, res) => {
    const { tokenId, bidAmount } = req.body;

    if (!bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({ error: "Invalid bid amount" });
    }

    try {
      const accounts = await web3.eth.getAccounts();

      // Verifica se l'asta è aperta
      const auction = await nftennisContract.methods.auctions(tokenId).call();
      if (!auction.open) {
        return res.status(400).json({ error: "Auction is not open" });
      }

      // Verifica che la nuova offerta sia superiore alla puntata corrente
      const highestBid = web3.utils.fromWei(auction.highestBid, "ether");
      if (Number(bidAmount) <= Number(highestBid)) {
        return res.status(400).json({ error: "Bid must be higher than the current highest bid" });
      }

      const bidResult = await nftennisContract.methods
        .bid(tokenId)
        .send({ from: accounts[0], value: web3.utils.toWei(bidAmount, "ether"), gas: 3000000 });

      res.json({ success: true, bidResult });
    } catch (error) {
      console.error("Error placing bid:", error);
      res.status(500).json({ error: "An error occurred while placing the bid" });
    }
  });

  // End an auction
  router.post("/end", async (req, res) => {
    const { tokenId } = req.body;
    const accounts = await web3.eth.getAccounts();

    try {
      // Verifica che il chiamante sia il venditore
      const auction = await nftennisContract.methods.auctions(tokenId).call();
      if (auction.seller.toLowerCase() !== accounts[0].toLowerCase()) {
        return res.status(403).json({ error: "Only the seller can end the auction" });
      }

      // Verifica che l'asta sia aperta
      if (!auction.open) {
        return res.status(400).json({ error: "Auction is not open" });
      }

      const endResult = await nftennisContract.methods
        .endAuction(tokenId)
        .send({ from: accounts[0], gas: 3000000 });

      res.json({ success: true, endResult });
    } catch (error) {
      console.error("Error ending auction:", error);
      res.status(500).json({ error: "An error occurred while ending the auction" });
    }
  });

  // Get auction details
  router.get("/:tokenId", async (req, res) => {
    const { tokenId } = req.params;

    try {
      const auction = await nftennisContract.methods.auctions(tokenId).call();

      res.json({
        tokenId,
        seller: auction.seller,
        highestBid: web3.utils.fromWei(auction.highestBid, "ether"),
        highestBidder: auction.highestBidder,
        open: auction.open,
      });
    } catch (error) {
      console.error("Error fetching auction details:", error);
      res.status(500).json({ error: "An error occurred while fetching auction details" });
    }
  });

  return router;
};
