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
        src: `${process.env.PUBLIC_URL}/JANNIKSINNER.png`
      },
      title: "Common NFT",
      description: "Our common works, unique but accessible to everyone. These pieces represent the foundation of our collection, offering high-quality digital art at an entry level.",
    },
    {
      type: "rare",
      media: {
        type: "image",
        src: `${process.env.PUBLIC_URL}/logo192.png`
      },
      title: "Rare NFT",
      description: "Limited editions with special characteristics that make them stand out. Each rare NFT brings unique advantages and prestige to its owner.",
    },
    {
      type: "legendary",
      media: {
        type: "image",
        src: `${process.env.PUBLIC_URL}/logo192.png`
      },
      title: "Legendary NFT",
      description: "Our most exclusive and sought-after pieces with extraordinary features. These legendary works are the cornerstone of any serious collector's portfolio.",
    },
    {
      type: "masterpiece",
      media: {
        type: "video",
        src: `${process.env.PUBLIC_URL}/AO.mp4`
      },
      title: "Masterpiece NFT",
      description: "Unique world-class masterpieces with extraordinary artistic value. These one-of-a-kind creations represent the pinnacle of digital art innovation.",
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
            <source src={`${process.env.PUBLIC_URL}/Intro-Home.mp4`} type="video/mp4" />
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