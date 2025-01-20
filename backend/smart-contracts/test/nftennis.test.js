const NFTennis = artifacts.require("NFTennis");

contract("NFTennis", (accounts) => {
  const [owner, addr1, addr2] = accounts;

  beforeEach(async () => {
    this.nftennis = await NFTennis.new({ from: owner });
  });

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      const contractOwner = await this.nftennis.owner();
      assert.equal(contractOwner, owner);
    });

    it("Should start with tokenCounter at 0", async () => {
      const tokenCounter = await this.nftennis.tokenCounter();
      assert.equal(tokenCounter.toNumber(), 0);
    });
  });

  describe("Minting", () => {
    it("Should mint a new NFT", async () => {
      await this.nftennis.mintNFT(addr1, "https://example.com/token1", { from: owner });
      const tokenCounter = await this.nftennis.tokenCounter();
      const ownerOfToken = await this.nftennis.ownerOf(0);
      assert.equal(tokenCounter.toNumber(), 1);
      assert.equal(ownerOfToken, addr1);
    });

    it("Should not allow non-owner to mint", async () => {
      try {
        await this.nftennis.mintNFT(addr1, "https://example.com/token1", { from: addr1 });
        assert.fail("Minting should only be allowed by the owner");
      } catch (error) {
        assert(error.message.includes("Only the owner can perform this action"), "Expected revert error");
      }
    });
  });

  describe("Auction", () => {
    beforeEach(async () => {
      await this.nftennis.mintNFT(addr1, "https://example.com/token1", { from: owner });
    });

    it("Should start an auction", async () => {
      await this.nftennis.startAuction(0, { from: addr1 });
      const auction = await this.nftennis.auctions(0);
      assert.equal(auction.seller, addr1);
      assert.equal(auction.open, true);
    });

    it("Should place a bid", async () => {
      await this.nftennis.startAuction(0, { from: addr1 });
      await this.nftennis.bid(0, { from: addr2, value: web3.utils.toWei("1", "ether") });
      const auction = await this.nftennis.auctions(0);
      assert.equal(auction.highestBid, web3.utils.toWei("1", "ether"));
      assert.equal(auction.highestBidder, addr2);
    });

    it("Should end an auction", async () => {
      await this.nftennis.startAuction(0, { from: addr1 });
      await this.nftennis.bid(0, { from: addr2, value: web3.utils.toWei("1", "ether") });
      await this.nftennis.endAuction(0, { from: addr1 });
      const auction = await this.nftennis.auctions(0);
      const newOwner = await this.nftennis.ownerOf(0);
      assert.equal(auction.open, false);
      assert.equal(newOwner, addr2);
    });
  });
});
