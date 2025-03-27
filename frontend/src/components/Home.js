import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faGavel, faImages, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import './Home.css';

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const nftProfiles = [
    {
      type: "common",
      media: {
        type: "image",
        src: `${process.env.PUBLIC_URL}/image/common.png`
      },
      title: "Common NFT",
      description: "The tennis player in his most authentic form, representing the beginning of his career. A tribute to the origins, where every champion takes his first steps towards glory. Perfect to start your collection.",
    },
    {
      type: "rare",
      media: {
        type: "image",
        src: `${process.env.PUBLIC_URL}/image/rare.png`
      },
      title: "Rare NFT",
      description: "The thrill of holding a trophy in your hands. These NFTs capture the determination and growth of a tennis player, telling the story of the road to glory. A unique piece for those who know how to recognize the value of the journey.",
    },
    {
      type: "legendary",
      media: {
        type: "image",
        src: `${process.env.PUBLIC_URL}/image/legendary.png`
      },
      title: "Legendary NFT",
      description: "A celebration of greatness: a tennis player immortalized in the moment of winning a Slam. These NFTs tell the story of legends, of those who have left an indelible mark on the world of tennis. A rarity that embodies glory.",
    },
    {
      type: "masterpiece",
      media: {
        type: "video",
        src: `${process.env.PUBLIC_URL}/image/masterpiece.mp4`
      },
      title: "Masterpiece NFT",
      description: "The pinnacle of the collection: an exclusive video that captures an iconic moment in a tennis player’s career. An unforgettable shot, a historic victory, an everlasting emotion. Not just an NFT, but a fragment of tennis history.",
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === nftProfiles.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? nftProfiles.length - 1 : prev - 1));
  };

  // Reset video playback when changing slides
  useEffect(() => {
    // Pause all videos when changing slides
    const videos = document.querySelectorAll('.nft-profile-video');
    videos.forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
    
    // Play the current video if it exists
    const currentVideo = document.querySelector(`.nft-carousel-item[data-index="${currentSlide}"] .nft-profile-video`);
    if (currentVideo) {
      currentVideo.play();
    }
  }, [currentSlide]);



  // Function to render media based on type
  const renderMedia = (media, index) => {
    if (media.type === "video") {
      return (
        <video 
          className="nft-profile-video" 
          src={media.src} 
          loop 
          playsInline
          autoPlay={currentSlide === index}
        />
      );
    } else {
      return <img src={media.src} alt={`NFT Item ${index + 1}`} />;
    }
  };

  return (
    <div className="nft-home">
      {/* Hero Section with Video Background */}
      <div className="nft-hero">
        {/* Video Background */}
        <div className="nft-video-container">
          <video
            className="nft-background-video"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src={`${process.env.PUBLIC_URL}/image/Intro-Home.mp4`} type="video/mp4" />
            Your browser does not support HTML5 video.
          </video>
          <div className="nft-overlay"></div>
        </div>
        {/* Hero Content */}
        <div className="nft-hero-content">
          <h1 className="nft-hero-title">
            Get in the game
          </h1>
          <Link to="/marketplace" className="nft-hero-button">
            Explore NFT
          </Link>
        </div>
      </div>

      {/* Carousel NFT Section */}
      <div className="nft-explanation-section">
        <div className="nft-floating-particle"></div>
        <div className="nft-floating-particle"></div>
        <div className="nft-floating-particle"></div>
        <div className="nft-section-container">
          <h2 className="nft-section-title">Discover our collection</h2>
          <p className="nft-section-description">Explore unique NFTs of different rarities in our exclusive collection</p>
          
          <div className="nft-carousel-container">
            <button className="nft-carousel-arrow nft-carousel-prev" onClick={prevSlide}>
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            
            <div className="nft-carousel">
              <div className="nft-carousel-inner" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                {nftProfiles.map((profile, index) => (
                  <div className="nft-carousel-item" key={index} data-index={index}>
                    <div className="nft-profile-image">
                      {renderMedia(profile.media, index)}
                    </div>
                    <div className={`nft-profile-content ${profile.type}`}>
                      <h3>{profile.title}</h3>
                      <p>{profile.description}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
            
            <button className="nft-carousel-arrow nft-carousel-next" onClick={nextSlide}>
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
            
            <div className="nft-carousel-indicators">
              {nftProfiles.map((_, index) => (
                <button 
                  key={index} 
                  className={`nft-carousel-indicator ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Steps Section */}
      <div className="nft-steps-section">
        <div className="nft-section-container">
          <h2 className="nft-section-title">How to get started</h2>
          <p className="nft-section-description">Follow these simple steps to enter the world of NFTs</p>
          
          <div className="nft-steps">
            <div className="nft-step">
              <div className="nft-step-icon">
                <span className="nft-step-number">1</span>
                <FontAwesomeIcon icon={faWallet} />
              </div>
              <h3>Connect your wallet</h3>
              <p>Securely connect your digital wallet to our platform and get ready to explore</p>
            </div>

            <div className="nft-step">
              <div className="nft-step-icon">
                <span className="nft-step-number">2</span>
                <FontAwesomeIcon icon={faGavel} />
              </div>
              <h3>Explore auctions</h3>
              <p>Browse available collections and bid on your favorite NFTs</p>
            </div>

            <div className="nft-step">
              <div className="nft-step-icon">
                <span className="nft-step-number">3</span>
                <FontAwesomeIcon icon={faImages} />
              </div>
              <h3>Collect NFTs</h3>
              <p>Build and manage your personal NFT collection</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;