import React, { useEffect, useRef, useState } from 'react';
// bikeData import 제거

const KakaoMap = () => {
  const mapContainer = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [bounds, setBounds] = useState(null);
  const [bikeStations, setBikeStations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // API에서 자전거 데이터 가져오기
  useEffect(() => {
    const fetchBikeData = async () => {
      setIsLoading(true);
      try {
        // 첫 번째 API 호출 (1-1000)
        const response1 = await fetch('https://bike-fjga.vercel.app/api/proxy?url=http://openapi.seoul.go.kr:8088/4e664f6e77617070333550666c494d/json/bikeList/1/1000/');
        /*
        const rawUrl1 =
        'http://openapi.seoul.go.kr:8088/4e664f6e77617070333550666c494d/json/bikeList/1/1000/';
        const proxyUrl1 = `https://bike-fjga.vercel.app/api/proxy?url=${encodeURIComponent(rawUrl1)}`;
        const response1 = await fetch(proxyUrl1);
        */
        const data1 = await response1.json();
        
        // 두 번째 API 호출 (1001-2000)
        const response2 = await fetch('https://bike-fjga.vercel.app/api/proxy?url=http://openapi.seoul.go.kr:8088/4e664f6e77617070333550666c494d/json/bikeList/1001/2000/');
        /*
        const rawUrl2 =
        'http://openapi.seoul.go.kr:8088/4e664f6e77617070333550666c494d/json/bikeList/1001/2000/';
        const proxyUrl2 = `https://bike-fjga.vercel.app/api/proxy?url=${encodeURIComponent(rawUrl2)}`;
        const response2 = await fetch(proxyUrl2);
         */
        const data2 = await response2.json();
        
        // 데이터 합치기
        let combinedData = [];
        
        if (data1.rentBikeStatus && data1.rentBikeStatus.row) {
          combinedData = [...data1.rentBikeStatus.row];
        }
        
        if (data2.rentBikeStatus && data2.rentBikeStatus.row) {
          combinedData = [...combinedData, ...data2.rentBikeStatus.row];
        }
        
        console.log('자전거 데이터 로드 완료:', combinedData.length);
        setBikeStations(combinedData);
      } catch (error) {
        console.error('자전거 데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBikeData();
  }, []);
  
  // 지도 초기화 함수
  useEffect(() => {
    // 카카오 맵 API가 로드되었는지 확인
    if (window.kakao && window.kakao.maps) {
      // 서울 시청을 중심으로 지도 생성 (데이터의 중심에 가깝게 설정)
      const options = {
        center: new window.kakao.maps.LatLng(37.511855, 127.032703),
        level: 3 // 줌 레벨을 조정하여 더 넓은 영역 표시
      };
      
      const kakaoMap = new window.kakao.maps.Map(mapContainer.current, options);
      setMap(kakaoMap);
      
      // 지도 컨트롤 추가
      const zoomControl = new window.kakao.maps.ZoomControl();
      kakaoMap.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
      
      const mapTypeControl = new window.kakao.maps.MapTypeControl();
      kakaoMap.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPRIGHT);
      
      // 초기 지도 영역 설정
      const initialBounds = kakaoMap.getBounds();
      setBounds(initialBounds);
      
      // 지도 이동 이벤트 리스너 추가
      window.kakao.maps.event.addListener(kakaoMap, 'idle', function() {
        const newBounds = kakaoMap.getBounds();
        setBounds(newBounds);
      });
    } else {
      console.error('카카오 맵 API가 로드되지 않았습니다.');
    }
  }, []);
  
  // 마커 생성 함수 - 지도 영역이 변경될 때마다 실행
  useEffect(() => {
    if (!map || !window.kakao || !bounds || isLoading || bikeStations.length === 0) return;
    
    // 기존 마커 제거
    markers.forEach(marker => {
      // Circle인 경우
      if (marker.circle) {
        marker.circle.setMap(null);
      }
    });
    
    // 새 마커 배열
    const newMarkers = [];
    
    // 인포윈도우 객체 생성
    const infowindow = new window.kakao.maps.InfoWindow({ zIndex: 1 });
    
    // 현재 지도 영역 내에 있는 데이터만 필터링
    const visibleBikeData = bikeStations.filter(station => {
      const position = new window.kakao.maps.LatLng(
        parseFloat(station.stationLatitude), 
        parseFloat(station.stationLongitude)
      );
      return bounds.contain(position);
    }).slice(0, 1000); // 성능을 위해 1000개로 제한
    
    visibleBikeData.forEach((station) => {
      const position = new window.kakao.maps.LatLng(
        parseFloat(station.stationLatitude), 
        parseFloat(station.stationLongitude)
      );
      
      // 초록색 원형 마커 생성 (Circle 객체 사용)
      const circle = new window.kakao.maps.Circle({
        center: position,
        radius: 20, // 원의 반지름 (미터 단위)
        strokeWeight: 4, // 선의 두께
        strokeColor: '#25A75C', // 선의 색상
        strokeOpacity: 0.8, // 선의 불투명도
        strokeStyle: 'solid', // 선의 스타일
        fillColor: '#54D98C', // 채우기 색상
        fillOpacity: 0.7 // 채우기 불투명도
      });
     
      
      // 마커 객체에 circle과 station 정보 저장
      const markerObj = {
        circle: circle,
        station: station
      };

    
      // 커스텀 오버레이를 위한 HTML
      const content = `
        <div class="custom-circle">
          ${station.parkingBikeTotCnt}
        </div>
      `;
    
      const customOverlay = new window.kakao.maps.CustomOverlay({
        content: content,
        position: position,
        yAnchor: 0.5,  // 위치 조정
        zIndex: 3
      });
    
      customOverlay.setMap(map);
    
      newMarkers.push({
        overlay: customOverlay,
        station: station
      });
      
      
      // 원 클릭 이벤트 - 인포윈도우 표시
      window.kakao.maps.event.addListener(circle, 'click', function() {
        // 인포윈도우에 표시할 내용
        const content = `
          <div style="padding:10px;width:300px;">
            <h4 style="margin-top:0;margin-bottom:5px;">${station.stationName}</h4>
            <p style="margin-top:0;margin-bottom:5px;">주소: ${station.stationName}</p>
            <p style="margin-top:0;margin-bottom:5px;">자치구: ${station.stationName.split(' ')[0]}</p>
            <p style="margin-top:0;margin-bottom:5px;">거치대 수: ${station.rackTotCnt}대</p>
            <p style="margin-top:0;margin-bottom:5px;">사용 가능 자전거: ${station.parkingBikeTotCnt}대</p>
          </div>
        `;
        
        infowindow.setContent(content);
        infowindow.setPosition(circle.getPosition()); // 또는 `position`
        infowindow.open(map);
        //map.panTo(position);
      });
      
      newMarkers.push(markerObj);
    });
    
    // 마커 상태 업데이트
    setMarkers(newMarkers);
    
    // 지도 클릭 시 인포윈도우 닫기
    window.kakao.maps.event.addListener(map, 'click', function() {
      infowindow.close();
    });
    
    console.log(`현재 지도 영역에 표시된 마커 수: ${newMarkers.length}`);
    
  }, [map, bounds, bikeStations, isLoading]); // bikeStations와 isLoading 의존성 추가
  
  return (
    <div className="map-container">
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          데이터를 불러오는 중...
        </div>
      )}
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '100vh',
          borderRadius: '0',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      ></div>
    </div>
  );
};

export default KakaoMap;