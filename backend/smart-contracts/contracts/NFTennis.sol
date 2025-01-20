// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTennis is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;

    // Mappa per memorizzare la rarità dei token
    mapping(uint256 => uint8) public tokenRarity;

    struct Auction {
        address payable seller;
        uint256 highestBid;
        address payable highestBidder;
        bool open;
    }

    mapping(uint256 => Auction) public auctions;

    // Eventi per monitorare le azioni
    event NFTMinted(uint256 tokenId, address recipient, string tokenURI);
    event AuctionStarted(uint256 tokenId, address seller);
    event NewBid(uint256 tokenId, address bidder, uint256 bidAmount);
    event AuctionEnded(uint256 tokenId, address winner, uint256 winningBid);

    constructor() ERC721("NFTennis", "NFTN") {
        tokenCounter = 0; // Inizializza il contatore dei token
    }

    /**
     * @dev Crea un nuovo NFT e lo assegna al destinatario. Solo il proprietario può eseguire questa funzione.
     * @param recipient L'indirizzo che riceverà l'NFT.
     * @param tokenURI URI dei metadati dell'NFT.
     * @param rarity La rarità del token (0 = comune, 1 = raro, 2 = leggendario).
     */
    function mintNFT(address recipient, string memory tokenURI, uint8 rarity) public onlyOwner {
        require(rarity >= 0 && rarity <= 2, "Invalid rarity");
        uint256 tokenId = tokenCounter;
        _mint(recipient, tokenId); // Mint del nuovo NFT
        _setTokenURI(tokenId, tokenURI); // Imposta l'URI dei metadati
        tokenRarity[tokenId] = rarity; // Salva la rarità del token
        tokenCounter += 1;

        emit NFTMinted(tokenId, recipient, tokenURI); // Emissione evento
    }


    /**
     * @dev Avvia un'asta per un NFT. Solo il proprietario dell'NFT può avviare l'asta.
     * @param tokenId ID del token da mettere all'asta.
     */
    function startAuction(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Only the owner can start an auction");
        require(!auctions[tokenId].open, "Auction already open for this token");

        auctions[tokenId] = Auction({
            seller: payable(msg.sender),
            highestBid: 0,
            highestBidder: payable(address(0)),
            open: true
        });

        emit AuctionStarted(tokenId, msg.sender); // Emissione evento
    }

    /**
     * @dev Effettua un'offerta per un NFT all'asta.
     * @param tokenId ID del token per cui si vuole fare un'offerta.
     */
    function bid(uint256 tokenId) public payable {
        Auction storage auction = auctions[tokenId];
        require(auction.open, "Auction is closed");
        require(msg.value > auction.highestBid, "Bid must be higher than the current highest bid");

        // Rimborsa il precedente miglior offerente
        if (auction.highestBidder != address(0)) {
            auction.highestBidder.transfer(auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = payable(msg.sender);

        emit NewBid(tokenId, msg.sender, msg.value); // Emissione evento
    }

    /**
     * @dev Termina un'asta e trasferisce l'NFT al miglior offerente.
     * @param tokenId ID del token all'asta.
     */
    function endAuction(uint256 tokenId) public {
        Auction storage auction = auctions[tokenId];
        require(auction.open, "Auction is already closed");
        require(auction.seller == msg.sender, "Only the seller can end the auction");

        auction.open = false;

        if (auction.highestBidder != address(0)) {
            // Trasferisce l'NFT al miglior offerente
            _transfer(auction.seller, auction.highestBidder, tokenId);
            // Trasferisce i fondi al venditore
            auction.seller.transfer(auction.highestBid);

            emit AuctionEnded(tokenId, auction.highestBidder, auction.highestBid); // Emissione evento
        } else {
            // Nessuna offerta valida, asta chiusa senza vincitore
            emit AuctionEnded(tokenId, address(0), 0);
        }
    }
}
