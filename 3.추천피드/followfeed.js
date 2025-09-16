let historyStack = ["feedPage"];
let isCommentsPanelOpen = false;

// 페이지 이동
function showPage(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(pageId).classList.add("active");

    if (historyStack[historyStack.length - 1] !== pageId) {
        historyStack.push(pageId);
    }
    
    // 새 페이지의 슬라이더 초기화
    if (pageId === 'postPage' || pageId === 'restaurantInfoPage') {
        document.querySelectorAll(`#${pageId} .image-slider-container`).forEach(initSlider);
    }

    // 상태 초기화
    resetShortsComments();
    closeCommentsPanel(false); // 페이지 전환 시 애니메이션 비활성화
    updateSidebarActiveIcon();
}

// 뒤로 가기
function goBack() {
    if (isCommentsPanelOpen) {
        closeCommentsPanel(true);
        return;
    }

    if (historyStack.length > 1) {
        historyStack.pop();
        const prevPage = historyStack[historyStack.length - 1];
        showPage(prevPage);
    }
}

function openPost() { showPage("postPage"); }
function openShorts() { showPage("shortsPage"); }
function openRestaurantInfo() { showPage("restaurantInfoPage"); }

// 이미지 슬라이더
function initSlider(sliderContainer) {
    const slider = sliderContainer.querySelector('.image-slider');
    const dotsContainer = sliderContainer.querySelector('.slider-dots');
    const prevBtn = sliderContainer.querySelector('.prev-btn');
    const nextBtn = sliderContainer.querySelector('.next-btn');
    const images = slider.querySelectorAll('img');

    if (images.length <= 1) {
        if (dotsContainer) dotsContainer.style.display = 'none';
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        return;
    };
    if (dotsContainer) dotsContainer.style.display = 'flex';
    if (prevBtn) prevBtn.style.display = 'block';
    if (nextBtn) nextBtn.style.display = 'block';

    let currentIndex = 0;
    if (dotsContainer) dotsContainer.innerHTML = ''; // 기존 점 제거

    images.forEach((_, i) => {
        if (dotsContainer) {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    });

    function goToSlide(index) {
        currentIndex = index;
        slider.style.transform = `translateX(-${currentIndex * 100}%)`;
        updateDots();
    }

    function updateDots() {
        if (dotsContainer) {
            dotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
            });
        }
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex > 0) ? currentIndex - 1 : images.length - 1;
            goToSlide(currentIndex);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex < images.length - 1) ? currentIndex + 1 : 0;
            goToSlide(currentIndex);
        });
    }
    
    // 첫 번째 슬라이드 초기화
    goToSlide(0);
}

// 좋아요 및 저장 기능
document.addEventListener('click', function(event) {
    // 좋아요 버튼
    if (event.target.closest('.heart-icon')) {
        const heartIcon = event.target.closest('.heart-icon');
        const isLiked = heartIcon.src.includes('heart-fill.png');
        heartIcon.src = isLiked ? 'img/heart.png' : 'img/heart-fill.png';
    }
    // 저장 버튼
    if (event.target.closest('.save-icon')) {
        const saveIcon = event.target.closest('.save-icon');
        const isSaved = saveIcon.src.includes('save-fill.png');
        saveIcon.src = isSaved ? 'img/save.png' : 'img/save-fill.png';
    }
});

// 게시물 댓글 패널
function toggleCommentsPanel() {
    const wrapper = document.getElementById('postCardWrapper');
    if (isCommentsPanelOpen) {
        wrapper.classList.remove('post-with-comments');
        closeCommentsPanel(true);
    } else {
        wrapper.classList.add('post-with-comments');
        openCommentsPanel();
    }
}

function openCommentsPanel() {
    const panel = document.getElementById('commentsPanel');
    panel.classList.add('active');
    isCommentsPanelOpen = true;
}

function closeCommentsPanel(animated = true) {
    const wrapper = document.getElementById('postCardWrapper');
    const panel = document.getElementById('commentsPanel');
    
    if (!animated) {
        panel.style.transition = 'none';
        wrapper.style.transition = 'none';
    }
    
    wrapper.classList.remove('post-with-comments');
    panel.classList.remove('active');
    isCommentsPanelOpen = false;

    if (!animated) {
        setTimeout(() => {
            panel.style.transition = '';
            wrapper.style.transition = '';
        }, 0);
    }
}

function toggleReplies() {
    const nestedReplies = event.target.closest('.comment-main').querySelector('.nested-replies');
    if (nestedReplies) {
        nestedReplies.style.display = nestedReplies.style.display === 'none' ? 'block' : 'none';
    }
}

// 게시물 내용 더보기 기능
function toggleFullContent(moreLink) {
    const contentText = moreLink.closest('.post-content').querySelector('.content-text');
    const postCard = moreLink.closest('.post-card');
    
    if (contentText.classList.contains('collapsed')) {
        contentText.classList.remove('collapsed');
        moreLink.textContent = '줄이기';
        postCard.style.height = 'auto'; // 내용에 맞춰 높이 자동 조절
    } else {
        contentText.classList.add('collapsed');
        moreLink.textContent = '더보기';
        postCard.style.height = 'auto'; // '줄이기'를 눌렀을 때도 높이를 자동으로 조절
    }
}

// 숏츠 댓글
function toggleShortsComments() {
    document.getElementById("shortsComments").classList.toggle("open"); // 'active'를 'open'으로 변경
    document.getElementById("shortsVideoWrapper").classList.toggle("shifted");
}

function resetShortsComments() {
    document.getElementById("shortsComments").classList.remove("active");
    document.getElementById("shortsVideoWrapper").classList.remove("shifted");
}

// 기타 기능
function setCurrentLocation() {
    const input = document.querySelector(".location-search-input");
    if (input.value.trim() !== "") {
        const newLocation = input.value.trim();
        document.getElementById("currentLocationDisplay").textContent = "현재 위치: " + newLocation;
        input.value = "";
    } else {
        console.warn("위치를 입력해주세요.");
    }
}

function updateSidebarActiveIcon() {
    document.querySelectorAll(".sidebar-icon").forEach(i => i.classList.remove("active"));
    const currentPage = historyStack[historyStack.length - 1];
    
    if (["feedPage", "postPage", "restaurantInfoPage"].includes(currentPage)) {
        document.getElementById("home-icon").classList.add("active");
    }
    else if (currentPage === "shortsPage") {
        document.getElementById("compass-icon").classList.add("active");
    }
}

// 초기 로드
document.addEventListener('DOMContentLoaded', () => {
    showPage('feedPage');
});