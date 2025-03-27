// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NFTennis is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 public tokenCounter;
    uint256[] public activeAuctions;

    enum Rarity { COMMON, RARE, LEGENDARY, MASTERPIECE }
    enum MediaType { IMAGE, VIDEO }

    struct NFTMetadata {
        Rarity rarity;
        MediaType mediaType;
    }

    struct Auction {
        address payable seller;
        uint256 highestBid;
        address payable highestBidder;
        bool open;
        uint256 endTime;
        uint256 buyNowPrice;
    }

    mapping(uint256 => Auction) public auctions;
    mapping(address => uint256[]) private ownedTokens;
    mapping(uint256 => NFTMetadata) public tokenMetadata;

    // Custom errors per ridurre dimensioni bytecode
    error InvalidAddress();
    error EmptyTokenURI();
    error InvalidMediaRarity();
    error NotOwner();
    error AuctionAlreadyOpen();
    error InvalidDuration();
    error InvalidPrice();
    error AuctionClosed();
    error AuctionExpired();
    error BidTooLow();
    error BidTooHigh();
    error SellerCannotBid();
    error SellerCannotBuyOwnNFT();
    error RefundFailed();
    error TransferFailed();
    error TokenDoesNotExist();

    // Eventi ottimizzati
    event NFTMinted(uint256 indexed tokenId, address indexed recipient);
    event AuctionStarted(uint256 indexed tokenId, address indexed seller, uint256 endTime);
    event NewBid(uint256 indexed tokenId, address indexed bidder, uint256 bidAmount);
    event AuctionEnded(uint256 indexed tokenId, address indexed winner, uint256 winningBid);
    event NFTBought(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event TokenTransferred(uint256 indexed tokenId, address indexed from, address indexed to);

    constructor() ERC721("NFTennis", "NFTN") {
        tokenCounter = 0;
    }

    function mintNFT(address recipient, string calldata tokenURI, Rarity rarity, MediaType mediaType) external onlyOwner {
        if (recipient == address(0)) revert InvalidAddress();
        if (bytes(tokenURI).length == 0) revert EmptyTokenURI();
        
        // Validazione compatibilità rarità e tipo di media
        bool isValid = mediaType == MediaType.VIDEO 
                      ? rarity == Rarity.MASTERPIECE 
                      : (rarity == Rarity.COMMON || rarity == Rarity.RARE || rarity == Rarity.LEGENDARY);
        
        if (!isValid) revert InvalidMediaRarity();

        uint256 tokenId = tokenCounter++;
        _mint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        tokenMetadata[tokenId] = NFTMetadata({
            rarity: rarity,
            mediaType: mediaType
        });
        
        ownedTokens[recipient].push(tokenId);
        emit NFTMinted(tokenId, recipient);
    }

    function startAuction(uint256 tokenId, uint256 duration, uint256 buyNowPrice) external {
        if (ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (auctions[tokenId].open) revert AuctionAlreadyOpen();
        if (duration == 0) revert InvalidDuration();
        if (buyNowPrice == 0) revert InvalidPrice();

        auctions[tokenId] = Auction({
            seller: payable(msg.sender),
            highestBid: 0,
            highestBidder: payable(address(0)),
            open: true,
            endTime: block.timestamp + duration,
            buyNowPrice: buyNowPrice
        });

        activeAuctions.push(tokenId);
        emit AuctionStarted(tokenId, msg.sender, block.timestamp + duration);
    }

    function bid(uint256 tokenId) external payable nonReentrant {
        Auction storage currentAuction = auctions[tokenId];

        if (block.timestamp >= currentAuction.endTime) {
            endAuction(tokenId);
            revert AuctionExpired();
        }

        if (!currentAuction.open) revert AuctionClosed();
        if (msg.value <= currentAuction.highestBid) revert BidTooLow();
        if (msg.value > currentAuction.buyNowPrice) revert BidTooHigh();
        if (msg.sender == currentAuction.seller) revert SellerCannotBid();

        if (currentAuction.highestBidder != address(0)) {
            (bool success, ) = currentAuction.highestBidder.call{value: currentAuction.highestBid}("");
            if (!success) revert RefundFailed();
        }

        currentAuction.highestBid = msg.value;
        currentAuction.highestBidder = payable(msg.sender);

        emit NewBid(tokenId, msg.sender, msg.value);

        if (msg.value >= currentAuction.buyNowPrice) {
            endAuction(tokenId);
        }
    }

    function buyNow(uint256 tokenId) external payable nonReentrant {
        Auction storage currentAuction = auctions[tokenId];
        
        if (!currentAuction.open) revert AuctionClosed();
        if (msg.value != currentAuction.buyNowPrice) revert InvalidPrice();
        if (msg.sender == currentAuction.seller) revert SellerCannotBuyOwnNFT();

        if (currentAuction.highestBidder != address(0)) {
            (bool success, ) = currentAuction.highestBidder.call{value: currentAuction.highestBid}("");
            if (!success) revert RefundFailed();
        }

        currentAuction.open = false;
        _transferToken(currentAuction.seller, msg.sender, tokenId);

        (bool successSeller, ) = currentAuction.seller.call{value: msg.value}("");
        if (!successSeller) revert TransferFailed();

        _removeFromActiveAuctions(tokenId);
        emit NFTBought(tokenId, msg.sender, msg.value);
    }


    function _removeFromActiveAuctions(uint256 tokenId) internal {
        for (uint256 i = 0; i < activeAuctions.length; i++) {
            if (activeAuctions[i] == tokenId) {
                activeAuctions[i] = activeAuctions[activeAuctions.length - 1];
                activeAuctions.pop();
                break;
            }
        }
    }

    function endAuction(uint256 tokenId) public nonReentrant {
        Auction storage currentAuction = auctions[tokenId];
        if (!currentAuction.open) revert AuctionClosed();

        currentAuction.open = false;

        if (currentAuction.highestBidder != address(0)) {
            _transferToken(currentAuction.seller, currentAuction.highestBidder, tokenId);

            (bool success, ) = currentAuction.seller.call{value: currentAuction.highestBid}("");
            if (!success) revert TransferFailed();

            emit AuctionEnded(tokenId, currentAuction.highestBidder, currentAuction.highestBid);
        } else {
            emit AuctionEnded(tokenId, address(0), 0);
        }

        _removeFromActiveAuctions(tokenId);
    }

    function _updateOwnedTokens(address from, address to, uint256 tokenId) internal {
        uint256[] storage fromTokens = ownedTokens[from];
        for (uint256 i = 0; i < fromTokens.length; i++) {
            if (fromTokens[i] == tokenId) {
                fromTokens[i] = fromTokens[fromTokens.length - 1];
                fromTokens.pop();
                break;
            }
        }
        ownedTokens[to].push(tokenId);
    }

    function _transferToken(address from, address to, uint256 tokenId) internal {
        _updateOwnedTokens(from, to, tokenId);
        _transfer(from, to, tokenId);
        emit TokenTransferred(tokenId, from, to);
    }

    // Override delle funzioni di trasferimento
    function transferFrom(address from, address to, uint256 tokenId) public override {
        super.transferFrom(from, to, tokenId);
        _updateOwnedTokens(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        super.safeTransferFrom(from, to, tokenId);
        _updateOwnedTokens(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        super.safeTransferFrom(from, to, tokenId, data);
        _updateOwnedTokens(from, to, tokenId);
    }

    // Funzioni di visualizzazione 
    function getOwnedNFTs(address owner) external view returns (uint256[] memory) {
        return ownedTokens[owner];
    }

    function getNFTsInAuctionByOwner(address owner) external view returns (uint256 count) {
        uint256[] memory owned = ownedTokens[owner];
        for (uint256 i = 0; i < owned.length; i++) {
            if (auctions[owned[i]].open) {
                count++;
            }
        }
    }

    function getActiveAuctions() external view returns (uint256[] memory) {
        return activeAuctions;
    }
    
    function getTokenMetadata(uint256 tokenId) external view returns (Rarity, MediaType) {
        if (!_exists(tokenId)) revert TokenDoesNotExist();
        NFTMetadata memory metadata = tokenMetadata[tokenId];
        return (metadata.rarity, metadata.mediaType);
    }
    
    function getRarityName(Rarity rarity) external pure returns (string memory) {
        if (rarity == Rarity.COMMON) return "Common";
        if (rarity == Rarity.RARE) return "Rare";
        if (rarity == Rarity.LEGENDARY) return "Legendary";
        if (rarity == Rarity.MASTERPIECE) return "Masterpiece";
        return "";
    }
    
    function getMediaTypeName(MediaType mediaType) external pure returns (string memory) {
        if (mediaType == MediaType.IMAGE) return "Image";
        if (mediaType == MediaType.VIDEO) return "Video";
        return "";
    }
}