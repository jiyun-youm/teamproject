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
    const images = slider.querySelectorAll('img');
    if (images.length <= 1) {
        dotsContainer.style.display = 'none';
        return;
    };
    dotsContainer.style.display = 'flex';

    let currentIndex = 0;
    dotsContainer.innerHTML = ''; // 기존 점 제거

    images.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    });

    function goToSlide(index) {
        currentIndex = index;
        slider.style.transform = `translateX(-${currentIndex * 100}%)`;
        updateDots();
    }

    function updateDots() {
        dotsContainer.querySelectorAll('.dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }
    
    // 첫 번째 슬라이드 초기화
    goToSlide(0);
}

// 게시물 댓글 패널
function toggleCommentsPanel() {
    if (isCommentsPanelOpen) {
        closeCommentsPanel(true);
    } else {
        openCommentsPanel();
    }
}

function openCommentsPanel() {
    const wrapper = document.getElementById('postCardWrapper');
    const panel = document.getElementById('commentsPanel');
    wrapper.classList.add('post-with-comments');
    panel.classList.add('active');
    isCommentsPanelOpen = true;
}

function closeCommentsPanel(animated = true) {
    const wrapper = document.getElementById('postCardWrapper');
    const panel = document.getElementById('commentsPanel');
    
    if (!animated) {
        panel.style.transition = 'none';
        wrapper.style.transition = 'none';
        wrapper.querySelector('.post-card').style.transition = 'none';
        wrapper.querySelector('.image-slider-container').style.transition = 'none';
    }
    
    wrapper.classList.remove('post-with-comments');
    panel.classList.remove('active');
    isCommentsPanelOpen = false;

    if (!animated) {
        setTimeout(() => {
            panel.style.transition = '';
            wrapper.style.transition = '';
            wrapper.querySelector('.post-card').style.transition = '';
            wrapper.querySelector('.image-slider-container').style.transition = '';
        }, 0);
    }
}

function toggleReplies() {
    const nestedReplies = event.target.closest('.comment-main').querySelector('.nested-replies');
    if (nestedReplies) {
        nestedReplies.style.display = nestedReplies.style.display === 'none' ? 'block' : 'none';
    }
}

// 숏츠 댓글
function toggleShortsComments() {
    document.getElementById("shortsComments").classList.toggle("active");
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