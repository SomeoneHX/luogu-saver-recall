function initPropaganda() {
  const ads = document.getElementById('propaganda');
  if (!ads) return;
  const prevBtn = ads.querySelector('.prev');
  const nextBtn = ads.querySelector('.next');
  let adsData = [];
  let currentAdIndex = 0;
  let autoPlayInterval;

  function displayError(message) {
    ads.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; width:100%; height:100%; color:#999;">
        ${message}
      </div>
    `;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function loadAds() {
    ads.querySelectorAll('.ad-slide').forEach(slide => slide.remove());
    adsData.forEach((ad, index) => {
      const slide = document.createElement('div');
      slide.className = 'ad-slide';
      slide.dataset.imageUrl = ad.imageUrl;
      slide.innerHTML = `
        <a href="${ad.targetUrl}" target="_blank" rel="noopener noreferrer" class="propaganda-link" aria-label="${ad.altText}"></a>
        <div class="ad-description">${ad.altText}</div>
      `;
      ads.insertBefore(slide, prevBtn);
    });
    showAd(0);
  }

  function loadSlideImage(slide) {
    if (!slide) return;
    if (!slide.style.backgroundImage) {
      slide.style.backgroundImage = `url(${slide.dataset.imageUrl})`;
    }
  }

  function showAd(index) {
    const slides = ads.querySelectorAll('.ad-slide');
    if (slides.length === 0) return;
    const currentSlide = ads.querySelector('.ad-slide.active');
    if (currentSlide) {
      currentSlide.classList.remove('active');
    }
    currentAdIndex = (index + slides.length) % slides.length;
    slides[currentAdIndex].classList.add('active');
    const newSlide = slides[currentAdIndex];
    loadSlideImage(newSlide);
    newSlide.classList.add('active');
    const nextSlide = slides[(currentAdIndex + 1) % slides.length];
    loadSlideImage(nextSlide);
  }

  function showNextAd() {
    showAd(currentAdIndex + 1);
  }

  function showPrevAd() {
    showAd(currentAdIndex - 1);
  }

  function startAutoPlay() {
    clearInterval(autoPlayInterval);
    if (adsData.length > 1) {
      autoPlayInterval = setInterval(showNextAd, 5000);
    }
  }

  nextBtn.addEventListener('click', () => {
    showNextAd();
    startAutoPlay();
  });

  prevBtn.addEventListener('click', () => {
    showPrevAd();
    startAutoPlay();
  });

  ads.addEventListener('mouseenter', () => clearInterval(autoPlayInterval));
  ads.addEventListener('mouseleave', () => startAutoPlay());

  api.get('/advertisement/current')
    .then(data => {
      const advertisements = data.advertisements || [];
      if (advertisements.length > 0) {
        adsData = advertisements.filter(ad => ad.enabled !== false);
        if (adsData.length > 0) {
          shuffle(adsData);
          loadAds();
          if (adsData.length > 1) {
            startAutoPlay();
          } else {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
          }
        } else {
          displayError('无广告内容');
        }
      } else {
        displayError('无广告内容');
      }
    })
    .catch(error => {
      console.error('广告加载失败:', error);
      displayError('广告加载失败');
    });
}
