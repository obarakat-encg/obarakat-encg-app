import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaBook,
  FaFilePowerpoint,
  FaArrowRight,
  FaGraduationCap,
  FaRocket,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { fileOperations } from "../utils/fileOperations";
import { Context } from "./context";
import EncgFixed from "../assets/EncgFixed.png";
import TdImage from "../assets/tdimage.png";
import CoursImg from "../assets/CoursImg.png";
import "./styles/home.css";

function usePreviewData() {
  const [coursItems, setCoursItems] = React.useState([]);
  const [tdItems, setTdItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        // Use the updated fileOperations to get files
        const [coursRaw, tdRaw] = await Promise.all([
          fileOperations.getPublicFiles("cours"),
          fileOperations.getPublicFiles("td")
        ]);

        const normalize = (data) => {
          if (!Array.isArray(data)) return [];
          return data
            .map((item) => ({
              name: item.name || item.originalName || item.url?.split("/").pop() || "Fichier",
              url: item.url,
              uploadedAt: item.uploadedAt || item.uploaded || item.createdAt || null,
              size: item.size || 0,
              ext: item.ext || item.name?.split('.').pop()?.toLowerCase() || 'file'
            }))
            .sort((a, b) => {
              // Sort by upload date, newest first
              const da = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
              const db = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
              return db - da;
            })
            .slice(0, 3); // Keep only the 3 most recent
        };

        if (mounted) {
          setCoursItems(normalize(coursRaw));
          setTdItems(normalize(tdRaw));
        }
      } catch (err) {
        if (mounted) setError("Impossible de charger les aperçus.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const handleFilesUpdated = (e) => {
      if (e.detail.type === 'cours' || e.detail.type === 'td') {
        load();
      }
    };

    window.addEventListener('filesUpdated', handleFilesUpdated);

    return () => {
      mounted = false;
      window.removeEventListener('filesUpdated', handleFilesUpdated);
    };
  }, []);

  return { coursItems, tdItems, loading, error };
}

function formatDate(d) {
  if (!d) return "Date inconnue";

  const date = new Date(d);
  const now = new Date();

  // Reset time to compare only dates
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = nowOnly.getTime() - dateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Show relative time for recent files
  if (diffDays === 0) {
    return "Aujourd'hui";
  } else if (diffDays === 1) {
    return "Hier";
  } else if (diffDays > 1 && diffDays <= 7) {
    return `Il y a ${diffDays} jours`;
  } else if (diffDays > 7 && diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "Il y a 1 semaine" : `Il y a ${weeks} semaines`;
  } else if (diffDays > 30) {
    // For older files, show the actual date
    return date.toLocaleDateString("fr-FR", {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  } else {
    // For future dates (shouldn't happen but just in case)
    return date.toLocaleDateString("fr-FR", {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function HeroCarousel({ autoPlay = true, autoPlayInterval = 3000, role }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);
  const [isDragging, setIsDragging] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchDeltaX, setTouchDeltaX] = useState(0);
  const containerRef = React.useRef(null);

  const slides = [
    {
      id: 'welcome',
      type: 'welcome',
      image: EncgFixed,
      title: 'Bienvenue',
      subtitle: 'Plateforme Éducative - Dr. Ouafa Barakat',
      description: role ?
        'Accédez aux cours et TDs, prévisualisez et téléchargez en un clic. Trouvez rapidement les ressources dont vous avez besoin pour réussir.' :
        'Explorez librement notre collection de cours et TDs. Connectez-vous pour télécharger et prévisualiser les ressources.',
      buttons: role ? [
        { text: 'Explorer les cours', link: '/cours', icon: FaRocket, primary: true },
        { text: 'Voir les TDs', link: '/td', icon: FaEye }
      ] : [
        { text: 'Explorer les cours', link: '/cours', icon: FaRocket, primary: true },
        { text: 'Voir les TDs', link: '/td', icon: FaEye },
        { text: 'Se connecter', link: '/login', icon: FaGraduationCap }
      ]
    },
    {
      id: 'courses',
      type: 'courses',
      image: CoursImg,
      title: 'Explorez nos Cours',
      subtitle: 'Ressources Pédagogiques de Qualité',
      description: 'Découvrez une vaste collection de cours organisés par matière et niveau. Accédez aux ressources pédagogiques de qualité pour enrichir vos connaissances.',
      buttons: [
        { text: 'Voir les Cours', link: '/cours', icon: FaBook, primary: true }
      ]
    },
    {
      id: 'td',
      type: 'td',
      image: TdImage,
      title: 'Travaux Dirigés',
      subtitle: 'Exercices Pratiques & Applications',
      description: 'Entraînez-vous avec nos exercices pratiques et TDs. Mettez en pratique vos connaissances théoriques avec des cas concrets et des corrections détaillées.',
      buttons: [
        { text: 'Découvrir les TDs', link: '/td', icon: FaFilePowerpoint, primary: true }
      ]
    }
  ];

  useEffect(() => {
    let interval;

    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, autoPlayInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPlaying, autoPlayInterval, slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleMouseEnter = () => {
    setIsAutoPlaying(false);
  };

  const handleMouseLeave = () => {
    setIsAutoPlaying(autoPlay);
  };

  const onTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    setIsDragging(true);
    setIsAutoPlaying(false);
    setTouchStartX(e.touches[0].clientX);
    setTouchDeltaX(0);
  };

  const onTouchMove = (e) => {
    if (!isDragging || !e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    setTouchDeltaX(currentX - touchStartX);
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    const threshold = 50; // px
    if (Math.abs(touchDeltaX) > threshold) {
      if (touchDeltaX > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    }
    setIsDragging(false);
    setTouchDeltaX(0);
    setIsAutoPlaying(autoPlay);
  };

  return (
    <div
      className="hero-carousel"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="carousel-container"
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div
          className="carousel-slides"
          style={{
            transform: (() => {
              const base = -currentSlide * 33.333;
              if (isDragging && containerRef.current) {
                const width = containerRef.current.clientWidth || 1;
                const dragPercent = (touchDeltaX / width) * 33.333;
                return `translateX(${base + dragPercent}%)`;
              }
              return `translateX(${base}%)`;
            })(),
            transition: isDragging ? 'none' : undefined,
          }}
        >
          {slides.map((slide, index) => (
            <div key={slide.id} className={`carousel-slide slide-${slide.type}`}>
              <div
                className="slide-background"
                style={{
                  backgroundImage: `url(${slide.image})`,
                }}
              />

              <div className="slide-overlay" />

              <div className="slide-content">
                <div className="slide-text-content">
                  <div className="slide-badge">
                    🎓 {slide.subtitle}
                  </div>

                  <h1 className="slide-title">
                    {slide.title}
                  </h1>

                  <p className="slide-description">
                    {slide.description}
                  </p>

                  <div className="slide-buttons">
                    {slide.buttons.map((button, btnIndex) => (
                      <Link
                        key={btnIndex}
                        to={button.link}
                        className={`slide-btn ${button.primary ? 'slide-btn-primary' : 'slide-btn-secondary'}`}
                      >
                        {React.createElement(button.icon)}
                        {button.text}
                        <FaArrowRight />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          className={`carousel-arrow carousel-arrow-left ${currentSlide === 0 ? 'hidden' : ''}`}
          onClick={prevSlide}
          aria-label="Previous slide"
        >
          <FaChevronLeft />
        </button>

        <button
          className="carousel-arrow carousel-arrow-right"
          onClick={nextSlide}
          aria-label="Next slide"
        >
          <FaChevronRight />
        </button>

        <div className="carousel-nav">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`nav-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { coursItems, tdItems, loading, error } = usePreviewData();
  const { role } = useContext(Context);

  React.useEffect(() => {
    const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = "running";
          entry.target.classList.add("animate-in");
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const animated = document.querySelectorAll(
      ".preview-card, .cta-card, .stat-card, .preview-item"
    );
    animated.forEach((el) => observer.observe(el));

    const shapes = document.querySelectorAll(
      ".floating-shape, .floating-card, .bubble"
    );
    function onScroll() {
      const scrolled =
        window.pageYOffset || document.documentElement.scrollTop || 0;
      const rate = scrolled * -0.5;
      shapes.forEach((shape, index) => {
        const speed = (index + 1) * 0.05;
        shape.style.transform = `translateY(${rate * speed}px)`;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    const actionButtons = Array.from(
      document.querySelectorAll(".btn, .card-button")
    );
    const onClick = (e) => {
      const btn = e.currentTarget;
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';
      setTimeout(() => (btn.innerHTML = original), 800);
    };
    actionButtons.forEach((b) => b.addEventListener("click", onClick));

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const isMobile = window.innerWidth <= 768;
        document.querySelectorAll(".floating-card").forEach((card) => {
          card.style.animationDuration = isMobile ? "4s" : "6s";
        });
      }, 150);
    };
    window.addEventListener("resize", onResize);

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      document.documentElement.classList.add("prefers-reduced-motion");
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      actionButtons.forEach((b) => b.removeEventListener("click", onClick));
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <motion.div 
      className="container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut'}}
    >
      <HeroCarousel autoPlay={true} autoPlayInterval={6000} role={role} />

      <section className="preview-section">
        <div className="section-header">
          <h2 className="section-title">Aperçus récents</h2>
          <p className="section-description">
            Découvrez les derniers contenus ajoutés à notre plateforme
          </p>
        </div>

        <div className="preview-grid">
          <div className="preview-card">
            <div className="card-header">
              <div className="card-icon">
                <FaBook />
              </div>
              <div className="card-badge">PDF / PPT</div>
            </div>
            <h3 className="card-title">Cours</h3>
            <p className="card-description">
              Derniers cours ajoutés par nos professeurs
            </p>

            <div className="preview-items" id="cours-items">
              {loading ? (
                <div className="loading">
                  <div className="loading-dots">
                    <div className="dot" />
                    <div className="dot" />
                    <div className="dot" />
                  </div>
                  <span>Chargement des aperçus…</span>
                </div>
              ) : error ? (
                <div className="error">{error}</div>
              ) : coursItems.length === 0 ? (
                <div className="no-items">
                  <div className="no-items-icon">📚</div>
                  <div className="no-items-text">Aucun cours disponible</div>
                  <div className="no-items-subtext">Les nouveaux cours apparaîtront ici</div>
                </div>
              ) : (
                coursItems.map((it, i) => (
                  <div className="preview-item" key={`cours-${i}`}>
                    <div className="preview-item-icon">
                      {it.ext === 'pdf' ? '📄' : it.ext === 'ppt' || it.ext === 'pptx' ? '📊' : '📁'}
                    </div>
                    <div className="preview-item-content">
                      <span className="preview-item-name" title={it.name}>
                        {it.name}
                      </span>
                      <div className="preview-item-meta">
                        <span className="preview-item-date">
                          {formatDate(it.uploadedAt)}
                        </span>
                        {it.size > 0 && (
                          <span className="preview-item-size">
                            • {formatFileSize(it.size)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link to="/cours" className="card-button">
              Voir Cours <FaArrowRight />
            </Link>
          </div>

          <div className="preview-card">
            <div className="card-header">
              <div className="card-icon">
                <FaFilePowerpoint />
              </div>
              <div className="card-badge">Exercices</div>
            </div>
            <h3 className="card-title">TD</h3>
            <p className="card-description">
              Derniers TDs et exercices pratiques disponibles
            </p>

            <div className="preview-items" id="td-items">
              {loading ? (
                <div className="loading">
                  <div className="loading-dots">
                    <div className="dot" />
                    <div className="dot" />
                    <div className="dot" />
                  </div>
                  <span>Chargement des aperçus…</span>
                </div>
              ) : error ? (
                <div className="error">{error}</div>
              ) : tdItems.length === 0 ? (
                <div className="no-items">
                  <div className="no-items-icon">📝</div>
                  <div className="no-items-text">Aucun TD disponible</div>
                  <div className="no-items-subtext">Les nouveaux TDs apparaîtront ici</div>
                </div>
              ) : (
                tdItems.map((it, i) => (
                  <div className="preview-item" key={`td-${i}`}>
                    <div className="preview-item-icon">
                      {it.ext === 'pdf' ? '📄' : it.ext === 'ppt' || it.ext === 'pptx' ? '📊' : '📁'}
                    </div>
                    <div className="preview-item-content">
                      <span className="preview-item-name" title={it.name}>
                        {it.name}
                      </span>
                      <div className="preview-item-meta">
                        <span className="preview-item-date">
                          {formatDate(it.uploadedAt)}
                        </span>
                        {it.size > 0 && (
                          <span className="preview-item-size">
                            • {formatFileSize(it.size)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link to="/td" className="card-button">
              Voir TD <FaArrowRight />
            </Link>
          </div>
        </div>

        <div className="cta-grid">
          <Link to="/cours" className="cta-card cta-blue">
            <div className="cta-background" />
            <div className="cta-content">
              <div className="cta-icon">
                <FaBook />
              </div>
              <div className="cta-text">
                <h3>Explorer les cours</h3>
                <p>
                  Accédez à l'ensemble des cours classés par année et matière.
                  Téléchargez, prévisualisez et organisez vos ressources.
                </p>
                <div className="cta-link">
                  Commencer maintenant <FaArrowRight />
                </div>
              </div>
            </div>
          </Link>

          <Link to="/td" className="cta-card cta-purple">
            <div className="cta-background" />
            <div className="cta-content">
              <div className="cta-icon">
                <FaFilePowerpoint />
              </div>
              <div className="cta-text">
                <h3>Voir les TDs</h3>
                <p>
                  Trouvez des exercices, corrigés et supports pratiques.
                  Entraînez-vous et améliorez vos compétences.
                </p>
                <div className="cta-link">
                  Découvrir les TDs <FaArrowRight />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </motion.div>
  );
}