// map_daum.js
//
// https://apis.map.kakao.com/web/documentation/
//
import {handleAjax} from "./common.js";

const {
    fromEvent,
    from,
    of,
    merge,
    combineLatest
} = rxjs;
const {ajax} = rxjs.ajax;
const {map, switchMap, pluck, mergeMap, scan, tap} = rxjs.operators;

// 버스 타입의 클래스를 결정하는 함수
function getBuesType(name) {
    if (/^광역/.test(name)) {
        return "yellow";
    } else if (/^직행/.test(name)) {
        return "red";
    } else {
        return "";
    }
}

// 다음 지도 생성
function createDaumMap($map) {
    const mapOption = {
        center: new kakao.maps.LatLng(37.4758966, 126.886348), // 지도의 중심좌표
        level: 3 // 지도의 확대 레벨
    };

    // 지도를 표시할 div와  지도 옵션으로  지도를 생성합니다
    return new kakao.maps.Map($map, mapOption);
}

// 다음 지도 위에 표시할 정보윈도우 생성
function createDaumInfoWindow() {
    // 마커를 클릭했을 때 마커 위에 표시할 인포윈도우를 생성합니다
    const iwContent = '<div style="padding:5px;">Hello World!</div>', // 인포윈도우에 표출될 내용으로 HTML 문자열이나 document element가 가능합니다
        iwRemoveable = true; // removeable 속성을 ture 로 설정하면 인포윈도우를 닫을 수 있는 x버튼이 표시됩니다

    // 인포윈도우를 생성합니다
    const infowindow = new kakao.maps.InfoWindow({
        content: iwContent,
        removable: iwRemoveable
    });
    return infowindow;
}

export default class Map {
    // 다음 지도API를 이용하여 지도의 중앙을 주어진 좌표로 이동하고 지도의 zoom을 11로 지정한다. 또한 infoWindow를 닫는다.
    centerMapAndCloseWindow(coord) {
        // 이동할 위도 경도 위치를 생성합니다
        const moveLatLon = new kakao.maps.LatLng(coord.latitude, coord.longitude);
        // 지도 중심을 이동 시킵니다
        this.daumMap.setCenter(moveLatLon);
        this.daumMap.setLevel(11);
        this.infowindow.close();
    }

    // 지도의 특정 위치에 마커를 생성한다.
    createMarker(name, latitude, longitude) {
        const markerPosition = new kakao.maps.LatLng(latitude, longitude);
        const marker = new kakao.maps.Marker({
            // const marker = new MarkerEx({
            title: name,
            position: markerPosition,
            clickable: true // 마커를 클릭했을 때 지도의 클릭 이벤트가 발생하지 않도록 설정합니다
        });

        marker.marker_options = {};
        const setOptions = (key, value) => {
            console.log(`[${marker.getTitle()}] setOptions: [${key}, ${value}]`);
            marker.marker_options[key] = value;
        };
        const getOptions = (key) => {
            let value = marker.marker_options[key];
            console.log(`[${marker.getTitle()}] getOptions: [${key}: ${value}]`);
            return value;
        };
        marker.setOptions = setOptions;
        marker.getOptions = getOptions;

        // 마커가 지도 위에 표시되도록 설정합니다
        marker.setMap(this.daumMap);
        return marker;
    }

    // 지도에 있는 마커를 제거한다.
    deleteMarker(marker) {
        marker && marker.setMap(null);
    }

    // 정류소 정보를 바탕으로 네이버 지도API를 이용하여 지도에 경로를 그린다.
    drawPath(stations) {
        // 경로를 지도에 표시한다.
        // 기존 패스 삭제
        this.polyline && this.polyline.setMap(null);
        this.polyline = new kakao.maps.Polyline({
            map: this.daumMap,
            path: [],
            strokeWeight: 2,
            strokeColor: '#386de8',
            strokeOpacity: 0.8,
            strokeStyle: 'dashed'
        });

        // 패스 그리기
        const path = this.polyline.getPath();
        stations.forEach(station => {
            path.push(new kakao.maps.LatLng(station.x, station.y))
        });
    }

    // 다음 지도API를 이용하여 지도에 경로가 있다면 지운다.
    deletePath() {
        // 기존 패스 삭제
        if (this.polyline) {
            this.polyline.setMap(null);
            this.polyline = null;
        }
    }

    // 지도 위에 표시되는 정보창(infowindow)을 보여준다.
    // 이때 대상 마커 인스턴스와 정보창에 보여줄 내용, 그리고 정보창이 보여질 위치 정보를 전달한다.
    openInfoWindow(marker, position, content) {
        this.infowindow.setContent(content);
        // 마커 위에 인포윈도우를 표시합니다
        this.infowindow.open(this.daumMap, marker);
    }

    // 지도 위에 표시되는 정보창(infowindow)을 닫는다.
    closeInfoWindow() {
        this.infowindow.close();
    }

    // 전달된 위치 정보에서 정보창림을 보여줘야하는 지(true) 감춰야하는지(false) 여부를 반환한다.
    isOpenInfoWindow(position) {
        return !(position.equals(this.infowindow.getPosition()) && this.infowindow.getMap());
    }

    constructor($map, $sidebar, search$) {
        this.daumMap = createDaumMap($map);
        this.infowindow = createDaumInfoWindow();

        const station$ = merge(
            search$,
            this.createDragend$()
        ).pipe(
            this.mapStation,
            this.manageMarker.bind(this),
            this.mapMarkerClick,
            this.mapBus
        );

        station$.subscribe(({markerInfo, buses}) => {
            if (this.isOpenInfoWindow(markerInfo.position)) {
                this.openInfoWindow(
                    markerInfo.marker,
                    markerInfo.position,
                    this.render(buses, markerInfo.name)
                );
            } else {
                this.closeInfoWindow();
            }
        });

        // 지도 클릭 이벤트 등록하기
        fromEvent(this.daumMap, "click").subscribe((evt) => {
            console.log(`observeMapClick$: ${evt}`);
            this.closeInfoWindow();
            $sidebar.close();
        });
    }

    createDragend$() {
        return fromEvent(this.daumMap, "dragend") // 지도 영역을 dragend 했을 때
            .pipe(
                map(() => {
                    // 지도 중심좌표를 얻어옵니다
                    const latlng = this.daumMap.getCenter();
                    return {latitude: latlng.getLat(), longitude: latlng.getLng()};
                })
            );
    }

    mapStation(coord$) {
        return coord$
            .pipe(
                switchMap(coord => ajax.getJSON(`/station/around/${coord.longitude}/${coord.latitude}`)),
                handleAjax("busStationAroundList")
            );
    }

    mapMarkerClick(marker$) {
        return marker$
            .pipe(
                mergeMap(marker => fromEvent(marker, "click", () => {
                    return marker;
                })),
                map((marker) => {
                    console.log(`mapMarkerClick: marker$: ${marker$}`);
                    return {
                        marker: marker,
                        position: marker.getPosition(),
                        id: marker.getOptions("stationId"), // 버스정류소ID 정보를 얻음
                        name: marker.getOptions("stationName") // 버스정류소 이름을 얻음
                    };
                })
            );
    }

    manageMarker(station$) {
        return station$
            .pipe(
                map(stations => stations.map(station => {
                    const marker = this.createMarker(station.stationName, station.x, station.y);
                    // 버스정류소ID, 버스정류소 이름 정보를 marker에 저장
                    marker.setOptions("stationId", station.stationId);
                    marker.setOptions("stationName", station.stationName);
                    return marker;
                })),
                scan((prev, markers) => {
                    // 이전 markers 삭제
                    prev.forEach(this.deleteMarker);
                    prev = markers;
                    return prev;
                }, []),
                mergeMap(markers => from(markers))
            );
    }

    mapBus(markerInfo$) {
        return markerInfo$
            .pipe(
                switchMap(markerInfo => {
                    const marker$ = of(markerInfo);
                    const bus$ = ajax.getJSON(`/bus/pass/station/${markerInfo.id}`)
                        .pipe(handleAjax("busRouteList"));
                    return combineLatest(marker$, bus$, (marker, buses) => ({
                        buses,
                        markerInfo
                    }));
                })
            );
    }

    render(buses, name) {
        const list = buses.map(bus => (`<dd>
                <a href="#${bus.routeId}_${bus.routeName}">
                    <strong>${bus.routeName}</strong> 
                    <span>${bus.regionName}</span> 
                    <span class="type ${getBuesType(bus.routeTypeName)}">${bus.routeTypeName}</span>
                </a>
            </dd>`)).join("");

        return `<dl class="bus-routes">
            <dt><strong>${name}</strong></dt>${list}
        </dl>`;
    }
}
