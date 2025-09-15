
	/* =========================
	*  전역 엘리먼트 & 공용 상태
	* ========================= */
	const panel = document.getElementById('shopPanel');       // 좌측 슬라이드 패널
	const btnClose = document.getElementById('panelClose');   // 패널 닫기 버튼
	const shopContent = document.getElementById('shopContent'); // 패널 내부 콘텐츠 영역
	const $status = document.getElementById('status');        // 상태 표시 텍스트

	/* ================
	*  카카오 지도 생성
	* ================ */
	const container = document.getElementById('map'); // 지도를 표시할 div

	//지도를 생성할 때 필요한 기본 옵션
	const options = {
		center: new kakao.maps.LatLng(37.5665, 126.9780), // 초깃값: 서울시청
		draggable: true,    // 지도 드래그 가능 여부
		level: 3 //지도의 레벨(확대, 축소 정도)
	};

	// 주소 검색(지오코딩) 객체
	const geocoder = new kakao.maps.services.Geocoder();

	// 카카오 지도 생성
	const map = new kakao.maps.Map(container, options);

	/* =========================
	*  전역 인포윈도우 (하나만 재사용)
	*  - 마커 클릭 시 가게명만 표시
	*  - 지도 빈 곳 클릭 시 닫힘
	* ========================= */
	const infoWindow = new kakao.maps.InfoWindow({ removable: true });

	/* =========================
	*  "평점→아이콘" 매핑
	* ========================= */

	// 점수에 따라 다른 핀 아이콘 선택
	function pinByRating(score) {
        if (score == null || isNaN(score)) return "./assets/pin_icons/pin0.png";
        if (score >= 4.5) return "./assets/pin_icons/pin5.png";
        if (score >= 3.5) return "./assets/pin_icons/pin4.png";
        if (score >= 3.0) return "./assets/pin_icons/pin3.png";
        if (score >= 2.0) return "./assets/pin_icons/pin2.png";
        return "./assets/pin_icons/pin1.png";
	}

	// 아이콘 이미지 미리 로드 (깜빡임 방지)
	(function preloadPins(){
        ["pin0.png","pin1.png","pin2.png","pin3.png","pin4.png","pin5.png"]
            .forEach(n => { const img = new Image(); img.src = `./assets/pin_icons/${n}`; });
	})();

	// 리뷰 평균 점수 계산
	function scoreAvgFromStore(store) {
        const ratings = (store.reviews || []).map(r => Number(r.rating) || 0);
        const n = ratings.length;
        return n ? ratings.reduce((a,b)=>a+b,0) / n : null;
	}

    // 리뷰 합계의 정수부 계산
	function scoreSumIntFromStore(store) {
        const ratings = (store.reviews || []).map(r => Number(r.rating) || 0);
        const sum = ratings.reduce((a,b)=>a+b,0);
        return parseInt(sum);
	}

	// 점수 기반 마커 생성
	function createStoreMarker(map, store, useAvg = true) {
        const lat = Number(store?.location?.lat);
        const lng = Number(store?.location?.lng);
        if (isNaN(lat) || isNaN(lng)) return null;

        // 점수 계산 (true=평균, false=합계정수부)
        const score = useAvg ? scoreAvgFromStore(store) : scoreSumIntFromStore(store);

        // 평점별 아이콘
        const imgSrc  = pinByRating(score);
        const imgSize = new kakao.maps.Size(32, 42);
        const imgOff  = new kakao.maps.Point(16, 42); // 핀 하단 중앙 기준점
        const markerImage = new kakao.maps.MarkerImage(imgSrc, imgSize, { offset: imgOff });

        const marker = new kakao.maps.Marker({
            map,
            position: new kakao.maps.LatLng(lat, lng),
            image: markerImage,
            title: store.name || ""
	    });

	    return marker;
	}

    /* =========================
    *  마커 렌더링 & 음식 필터
    * ========================= */
	let CURRENT_MARKERS = [];       // 현재 지도에 표시된 마커 배열
	let USE_AVG_SCORE = true;        // true=평균, false=합계정수부
	let ACTIVE_FOOD_SET = new Set(); // 현재 활성화된 음식 카테고리들

	// 마커 모두 제거
	function clearMarkers() {
        CURRENT_MARKERS.forEach(m => m.setMap(null));
        CURRENT_MARKERS = [];
	}

    // 가게 데이터(stores)를 기준으로 마커 다시 그림
	function renderMarkers(map, stores, { categorySet=null, useAvg=true } = {}) {
        clearMarkers();
        stores.forEach(store => {
            const cat = store.category || store.foodType; // 네 프로젝트 키명에 맞추기
            if (categorySet && categorySet.size > 0 && !categorySet.has(cat)) return;

            const m = createStoreMarker(map, store, useAvg);
            if (m) CURRENT_MARKERS.push(m);
	});
	}

	/* 최초 1회 렌더(데이터 로딩 후) */
	// renderMarkers(map, stores, { categorySet: ACTIVE_FOOD_SET, useAvg: USE_AVG_SCORE });

	// 음식 버튼 토글 시 실행 (필터링 적용)
	function onFoodToggle(foodName, isOn) {
        if (isOn) ACTIVE_FOOD_SET.add(foodName);
        else ACTIVE_FOOD_SET.delete(foodName);
        renderMarkers(map, stores, { categorySet: ACTIVE_FOOD_SET, useAvg: USE_AVG_SCORE });
	}

	// 점수 계산 방식(평균/합계정수부) 전환
	function onToggleUseAvg(flag) {
        USE_AVG_SCORE = !!flag;
        renderMarkers(map, stores, { categorySet: ACTIVE_FOOD_SET, useAvg: USE_AVG_SCORE });
	}


	/* =========================
	*  현재 위치 마커 (지도 중심 추적)
	* ========================= */

    // 현재 위치용 아이콘
	const myIcon = new kakao.maps.MarkerImage(
		'./assets/pin_icons/pin5.png',
		new kakao.maps.Size(32, 32),
		{ offset: new kakao.maps.Point(16, 32) }
	);
	
	// 기본 마커 사용(이미지 제거 원하면 image: myIcon 사용)
	let currentMarker = new kakao.maps.Marker({
		map,
		position: map.getCenter(),
		zIndex: 999
	});

	/* ==================================================
	*  지도 이동/줌 종료(idle) → 현재 위치 마커를 중심으로 이동
	*  + 디바운스로 현재 지역 구 별로 판별 & JSON 재로딩
	* ================================================== */
	let districtDebounce = null; // 연속 이벤트 방지(디바운스)
	let lastDistrict = null; // 마지막으로 로딩한 구 이름

	kakao.maps.event.addListener(map, 'idle', () => {
		const c = map.getCenter();
		currentMarker.setPosition(c);

		// 구 자동 갱신: 디바운스
		clearTimeout(districtDebounce);
		districtDebounce = setTimeout(resolveDistrictAndReloadByCenter, 400);
	});

	/* =================
	*  주소 문자열 유틸
	* ================= */

    // 신주소 문자열 정리
	function cleanNewAddress(addr) {
		if (!addr) return '';
		// "서울" 앞의 우편번호/공백을 제거
		return addr.replace(/^\d*\s*서울/, '서울').trim();
	}

    // 구주소 문자열 정리
	function cleanOldAddress(addr) {
		if (!addr) return '';
		// "525-13 525-13" 과 같은 번지 중복 제거
		return addr.replace(/(\d+-?\d*)\s+\1/, '$1').trim();
	}

    // 주소에서 '서울 ○○구' 추출
	function extractDistrict(addr) {
		if (!addr) return '';
		const m = addr.match(/서울\s+\S+구/);
		return m ? m[0] : '';
	}

	/* =================
	*  평점 랜덤 유틸
	* ================= */

	// 0.0 ~ 5.0 사이 값(소수 첫째 자리) — 예: 3.2
	function getRandomRating01dp() {
		// 0~50 정수 -> 0.0~5.0 (0.1 단위)
		return Math.round(Math.random() * 50) / 10;
	}

	// 점수 → 핀/텍스트 변환 (핀은 정수부만 반영)
	function renderRatingView(rating) {
		const intPart = Math.floor(rating);               // 핀 개수
		const ratingText = `${rating.toFixed(1)}점`;      // 숫자 표기(항상 1자리 소수)
		const pins = intPart === 0 ? '평점 0점 대' : '📌'.repeat(intPart);
		// 핀은 0이면 회색, 있으면 노랑
		const pinClass = intPart === 0 ? 'text-gray-500' : 'text-yellow-500';

		return {
			pinHtml: `<span class="${pinClass}">${pins}</span>`,
			numHtml: `<span class="text-sm text-gray-600">${ratingText}</span>`
		};
	}
	/* =========================
	*  매장(Shop) 커스텀 마커 생성
	*  - 클릭 시: 인포윈도우(가게명) + 패널 바인딩
	* ========================= */

  // 단일 매장 마커 생성 + 클릭 핸들러
  function placeMarker(pos, shop) {
    // 1) 가게별 점수 확정(한 번 정하면 세션 동안 고정)
    if (typeof shop._rating !== 'number') {
      // A안) 지금처럼 랜덤 점수 유지
      shop._rating = getRandomRating01dp();

      // B안) 리뷰 평균을 쓰려면 위 한 줄 대신 아래 2줄 사용
      // const avg = scoreAvgFromStore(shop);  // 리뷰 평균(없으면 null)
      // shop._rating = (avg ?? getRandomRating01dp());
    }
    // 2) 점수 → 아이콘 경로 매핑
    const imgSrc = pinByRating(shop._rating);
    const markerImage = new kakao.maps.MarkerImage(
      imgSrc,
      new kakao.maps.Size(32, 42),
      { offset: new kakao.maps.Point(16, 42) } // 핀 바닥 중앙 기준
    );
    // 3) 마커 생성(가게마다 다른 아이콘 적용)
    const marker = new kakao.maps.Marker({
      map,
      position: pos,
      title: shop.post_sj,
      image: markerImage          // 가게별 아이콘
    });       
  
	// 가게별 랜덤 음식종류(세션 유지) → 마커 메타로도 보관
	const foodKind = getFoodKindFor(shop);
	marker.foodKind = foodKind;
	markers.push(marker);

	// 새로 추가된 마커도 현재 필터에 맞춰 즉시 반영
	applyFoodFilter(getSelectedFoods());

	kakao.maps.event.addListener(marker, 'click', () => {
		// 1) 인포윈도우: 가게명만 표시
		const content = `
		<div style="padding:6px 10px;font-size:13px;white-space:nowrap;">
			${shop.post_sj || '이름 없음'}
		</div>`;
		infoWindow.setContent(content);
		infoWindow.open(map, marker);

		// 2) 좌측 패널 열기 + JSON 데이터 바인딩
		panel.classList.remove('-translate-x-full');
		panel.classList.add('translate-x-0');

        // 점수: 가게마다 1회 생성 후 재사용(클릭할 때마다 변하지 않게)
        if (typeof shop._rating !== 'number') {
            shop._rating = getRandomRating01dp();
        }
        const { pinHtml, numHtml } = renderRatingView(shop._rating);
        const rating = shop._rating;
        //const ratingHtml = renderRatingPins(rating);
        const ratingClass = (rating === 0) ? 'text-gray-500' : 'text-yellow-500';

        const foodKind = getFoodKindFor(shop);

        shopContent.innerHTML = `
            <!-- 대표 이미지(고정) -->
            <div
                class="w-full h-96 rounded-lg bg-gray-200 bg-center bg-contain bg-no-repeat"
                style="background-image: url('./assets/info_assets/main_pic.png');">
            </div>

            <!-- 가게명 / 카테고리(고정) + 별점(고정) -->
            <div class="flex justify-between items-center mt-4">
                <div>
                <h3 class="text-xl font-semibold">${shop.post_sj || '이름 없음'}</h3>
                <p class="text-gray-500 text-sm">${foodKind}</p>
                </div>
                <div class="flex items-center gap-2">${pinHtml}${numHtml}</div>

            </div>

            <!-- 연락처: 없으면 'null' -->
            <p class="flex items-center gap-2">
                <img src="./assets/info_assets/tel_icon.png" alt="전화" class="w-5 h-5"/>
                ${shop.cmmn_telno || 'null'}
            </p>

            <!-- 팔로워/리뷰 안내(고정) -->
            <div class="text-sm text-gray-600 space-y-1 border-t pt-2 mt-2">
                <p>♥ 내 팔로워 2명이 좋아요를 눌렀습니다.</p>
                <p>● xxx님이 리뷰를 작성한 식당입니다.</p>
            </div>

            <!-- 리뷰 섹션(고정) -->
            <div class="border-t pt-4 mt-2">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold">리뷰 112</h4>
                    <button class="text-blue-500 text-sm">더보기</button>
                </div>

                <div class="grid grid-cols-3 gap-2" id="reviewGrid">
                    <div class="h-40 rounded overflow-hidden">
                        <img src="./assets/info_assets/review01.png" alt="리뷰1" class="w-full h-full object-cover">
                    </div>
                    <div class="h-40 rounded overflow-hidden">
                        <img src="./assets/info_assets/review02.png" alt="리뷰2" class="w-full h-full object-cover">
                    </div>
                    <div class="h-40 rounded overflow-hidden">
                        <img src="./assets/info_assets/review03.png" alt="리뷰3" class="w-full h-full object-cover">
                    </div>
                    <div class="h-40 rounded overflow-hidden">
                        <img src="./assets/info_assets/review04.png" alt="리뷰4" class="w-full h-full object-cover">
                    </div>
                    <div class="h-40 rounded overflow-hidden">
                        <img src="./assets/info_assets/review05.png" alt="리뷰5" class="w-full h-full object-cover">
                    </div>
                </div>
            </div>`;
        });
	}

	/* =========================================
	*  지오코딩 + 3단계 폴백(new → old → 조합)
	*  - new_address가 실패하면 address로 재시도
	* ========================================= */
	function searchAndMark(addr, shop, _type, fallback = null) {
		if (!addr) return fallback && fallback();

		geocoder.addressSearch(addr, (result, status) => {
			if (status === kakao.maps.services.Status.OK && result[0]) {
				const pos = new kakao.maps.LatLng(result[0].y, result[0].x);
				placeMarker(pos, shop);
			} 
			else {
				fallback && fallback();
			}
		});
	}

	function addMarkerWithFallback(shop) {
	const newAddr = cleanNewAddress(shop.new_address || '');
	const oldAddr = cleanOldAddress(shop.address || '');
	const district = extractDistrict(shop.address || '');
	const combined = district && shop.post_sj ? `${district} ${shop.post_sj}` : '';

	// 1) new_address → 2) address → 3) "서울 ○○구 + 상호명"
	searchAndMark(newAddr, shop, 'new_address', () =>
			searchAndMark(oldAddr, shop, 'address', () =>
			searchAndMark(combined, shop, 'district+post_sj')
			)
		);
	}

	/* ===========================
	*  페이지네이션 & 마커 관리
	* =========================== */
	let shops = [];                // 현재 구 의 가게 목록
	let page = 0;                  // 현재 페이지 인덱스(0부터)
	const pageSize = 20;           // 한 번에 표기할 개수
	const markers = [];            // 생성된 마커 모음(지우기 용)

    // 모든 마커 제거
	function clearMarkers() {
		markers.forEach(m => m.setMap(null));
		markers.length = 0;
		infoWindow.close();
	}

    // 페이지/마커 초기화
	function resetPaging() {
		page = 0;
		clearMarkers();
		document.getElementById('loadMore').style.display = 'none';
	}

    // p번째 페이지 표시
	function showPage(p) {
		const start = p * pageSize;
		const end = start + pageSize;
		shops.slice(start, end).forEach(shop => addMarkerWithFallback(shop));
	}

    // 다음 페이지 표시
	function showNextPage() {
		if (page * pageSize >= shops.length) {
			alert('더 이상 불러올 데이터가 없습니다.');
			return;
		}
		showPage(page++);
	}

	document.getElementById('loadMore').addEventListener('click', showNextPage);

	/* =========================
	*  구 단위 JSON 로딩
	* ========================= */
	function loadDistrictJsonAndRender(districtName) {
	const filePath = `./assets/location_seperate/seoul_${districtName}.json`;

	resetPaging();
	fetch(filePath)
		.then(res => {
			if (!res.ok) throw new Error(`JSON 로드 실패: ${res.status}`);
				return res.json();
		})
		.then(data => {
			shops = data.DATA || [];
			$status.textContent = `현재 지역: 서울 ${districtName} (총 ${shops.length}건)`;
			showNextPage(); // 첫 20개
			if (shops.length > pageSize) {
				document.getElementById('loadMore').style.display = 'inline-block';
			}
		})
		.catch(err => {
			console.error(err);
			$status.textContent = `해당 구 데이터 로드 실패(서울 ${districtName}). 파일/경로 확인 필요`;
		});
	}

	/* ==============================
	*  역지오코딩 → 현재 구 판별 용
	* ============================== */
	function resolveDistrictByLatLng(lat, lng, cb) {
	geocoder.coord2RegionCode(lng, lat, (result, status) => {
		if (status !== kakao.maps.services.Status.OK || !result?.length) return cb(null);
			const info = result.find(r => r.region_type === 'B') || result[0];
			const city = info.region_1depth_name;      // "서울특별시"
			const district = info.region_2depth_name;  // "강남구" 등
		if (!city?.startsWith('서울')) return cb(null);
		cb(district);
	});
	}

	// 지도 중심 기준으로 구 판별 → 바뀌면 JSON 재로딩
	function resolveDistrictAndReloadByCenter() {
	const c = map.getCenter();
	resolveDistrictByLatLng(c.getLat(), c.getLng(), (district) => {
		if (!district) return;
		if (district !== lastDistrict) {
		lastDistrict = district;
		$status.textContent = `현재 위치: 서울 ${district} (해당 구 데이터 로드 중…)`;
		loadDistrictJsonAndRender(district);
		}
	});
	}

	/* ====================
	*  초기 위치 처리
	* ==================== */
	if ('geolocation' in navigator) {
	navigator.geolocation.getCurrentPosition(
		(pos) => {
			const lat = pos.coords.latitude;
			const lng = pos.coords.longitude;
			const center = new kakao.maps.LatLng(lat, lng);

			map.setCenter(center);
			map.setLevel(6);
			currentMarker.setPosition(center); // 초기 설정 시 현재 위치 마커 동기화
			$status.textContent = '현재 위치 확인 완료. 구 식별 중…';

			resolveDistrictByLatLng(lat, lng, (district) => {
				if (!district) {
					$status.textContent = '서울 외 지역입니다. 지도를 이동해 주세요.';
					return;
				}
				lastDistrict = district;
				loadDistrictJsonAndRender(district);
				});
			},
			(err) => {
				console.warn('Geolocation 실패:', err);
				$status.textContent = '위치 권한 거부됨. 지도 중심 기준으로 구를 식별합니다.';
				// 지도 중심으로 구 판별
				resolveDistrictAndReloadByCenter();
			},
			{ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
		);
	} else {
		$status.textContent = '브라우저가 위치 기능을 지원하지 않습니다.';
		resolveDistrictAndReloadByCenter();
	}

	/* =========================
	*  지도 컨트롤(줌/현재 위치)
	* ========================= */
	document.getElementById('zoomIn').addEventListener('click', () => {
		const level = map.getLevel();
		if (level > 1) map.setLevel(level - 1);
	});

	document.getElementById('zoomOut').addEventListener('click', () => {
		const level = map.getLevel();
		map.setLevel(level + 1);
	});

	// 현재 위치로 지도 이동 + 마커 표시 (공용 함수)
	function goToCurrentLocation() {
		if (!navigator.geolocation) {
			console.warn("이 브라우저에서는 위치 정보가 지원되지 않습니다.");
			return;
	}
	navigator.geolocation.getCurrentPosition(
		(pos) => {
			const lat = pos.coords.latitude;
			const lng = pos.coords.longitude;
			const loc = new kakao.maps.LatLng(lat, lng);

			// 이미 만들어둔 currentMarker만 이동/표시 (불필요한 재생성 제거)
			currentMarker.setPosition(loc);
			currentMarker.setMap(map);

			map.setCenter(loc);
			map.setLevel(3);
		},
		(err) => {
			console.warn("현재 위치를 가져올 수 없습니다. (" + err.message + ")");
		},
		{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
		);
	}

	document.getElementById('currentLocationBtn').addEventListener('click', goToCurrentLocation);
	window.addEventListener('DOMContentLoaded', goToCurrentLocation); // 초기 이동
	

	/* =========================
	*  음식 버튼(다중 토글)
	*  - 필터 로직은 아직 존재x
	* ========================= */

    // 지원 음식 종류
	const FOOD_KINDS = ['한식', '중식', '양식', '일식', '분식'];

	// 각 가게에 랜덤 음식종류 매핑 (세션 동안 유지)
	const foodKindStore = new Map();

    // 음식종류 랜덤 선택
	function pickRandomFoodKind() {
		return FOOD_KINDS[Math.floor(Math.random() * FOOD_KINDS.length)];
	}

	// 가게를 안정적으로 식별할 키 (이름 + 주소 기반)
	function getShopKey(shop) {
		return `${shop.post_sj || 'NO_NAME'}|${shop.address || shop.new_address || ''}`.trim();
	}

	// 가게별 음식 종류 가져오기(없으면 랜덤 생성 후 저장)
	function getFoodKindFor(shop) {
		const key = getShopKey(shop);
		let kind = foodKindStore.get(key);
		if (!kind) {
			kind = pickRandomFoodKind();
			foodKindStore.set(key, kind);
		}
		// 캐시를 shop 객체에도 붙여두면 템플릿에서 바로 접근 가능
		shop._foodKind = kind;
		return kind;
	}
	// 버튼 초기화: label을 data-key로 박아두면 안전
	document.querySelectorAll('.food-btn').forEach(btn => {
		const labelEl = btn.querySelector('span:last-child');
		if (labelEl) btn.dataset.key = labelEl.textContent.trim();
	});

	//	const foodBtns = document.querySelectorAll('.food-btn');
	//	foodBtns.forEach(btn => {
	//		btn.addEventListener('click', () => {
	//		const isActive = btn.getAttribute('aria-pressed') === 'true';
	//		btn.setAttribute('aria-pressed', String(!isActive));
	//		// TODO: applyFoodFilter(getSelectedFoods());
	//		});
	//	});


	// 현재 활성 카테고리 목록
	function getSelectedFoods() {
		return Array.from(document.querySelectorAll('.food-btn[aria-pressed="true"]'))
			.map(b => b.dataset.key || b.textContent.trim());
	}
	// 핵심: 필터 적용
	function applyFoodFilter(selected) {
		const active = (selected || []).filter(Boolean);
		// 아무것도 선택 안 했으면 → 전체 보이기
		if (active.length === 0) {
			markers.forEach(m => m.setMap(map));
			return;
		}
		// 활성 목록에 포함된 카테고리만 보이기
		markers.forEach(m => {
			const show = active.includes(m.foodKind);
			m.setMap(show ? map : null);
		});

		// 가려질 수 있으니, UX적으로 인포윈도우/패널은 닫아주는 편이 자연스러움(선택)
		infoWindow.close();
		panel.classList.remove('translate-x-0');
		panel.classList.add('-translate-x-full');
	}

	// 버튼 토글 + 필터 반영
	document.querySelectorAll('.food-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			const isActive = btn.getAttribute('aria-pressed') === 'true';
			btn.setAttribute('aria-pressed', String(!isActive));
			applyFoodFilter(getSelectedFoods());
		});
	});
	/* =========================
	*  좌측 사이드 탭 활성 토글
	* ========================= */
	function setActiveTab(tabName) {
	document.querySelectorAll('.side-btn').forEach(btn => {
		if (btn.dataset.tab === tabName) btn.setAttribute('aria-current', 'page');
		else btn.removeAttribute('aria-current');
	});
	}
	setActiveTab('map'); // 이 페이지는 map이라고 알리는 함수

	/* =========================
	*  패널 닫기(버튼/ESC/지도 클릭)
	*  + 지도 클릭 시 인포윈도우도 닫음
	* ========================= */

	// 버튼으로 좌측 슬라이드 닫기
	btnClose?.addEventListener('click', () => {
		panel.classList.remove('translate-x-0');
		panel.classList.add('-translate-x-full');
	});

	// ESC로 좌측 슬라이드 닫기
	window.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			panel.classList.remove('translate-x-0');
			panel.classList.add('-translate-x-full');
		}
	});

	// 지도 클릭 시 좌측 슬라이드 닫기
	kakao.maps.event.addListener(map, 'click', () => {
		panel.classList.remove('translate-x-0');
		panel.classList.add('-translate-x-full');
		infoWindow.close(); // 지도 빈 곳 클릭 → 인포윈도우 닫기
	});

	/* =========================
	*  Lightbox (리뷰 이미지 확대)
	* ========================= */
	const lightbox   = document.getElementById('lightbox');
	const lbImg      = document.getElementById('lbImage');
	const lbCaption  = document.getElementById('lbCaption');
	const lbClose    = document.getElementById('lbClose');
	const lbBackdrop = document.getElementById('lbBackdrop');

	function openLightbox(src, caption = '') {
		lbImg.src = src;
		lbCaption.textContent = caption;
		lightbox.classList.remove('hidden');
		document.body.style.overflow = 'hidden'; // 스크롤 잠금
	}

	function closeLightbox() {
		lightbox.classList.add('hidden');
		lbImg.src = '';
		lbCaption.textContent = '';
		document.body.style.overflow = ''; // 스크롤 복구
	}

	lbClose.addEventListener('click', closeLightbox);
	lbBackdrop.addEventListener('click', closeLightbox);
	window.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') closeLightbox();
	});

	// 이벤트 위임: 패널 내 리뷰 썸네일 클릭 시 라이트박스 오픈
	// 다만, 이미지 비율이 부정확함. 개선이 필요할듯?
	document.getElementById('shopPanel').addEventListener('click', (e) => {
		const img = e.target.closest('#shopContent img');
		if (!img) return;
		const fullSrc = img.getAttribute('data-full') || img.src;
		openLightbox(fullSrc, img.alt || '');
	});
