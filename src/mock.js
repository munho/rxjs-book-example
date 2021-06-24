//
// mock.js
//
let mockBusRouteList = [
    {
        'routeId': '0',
        'routeName': 'routeName-0',
        'regionName': 'regionName-0',
        'routeTypeName': 'routeTypeName-0'
    },
    {
        'routeId': '1',
        'routeName': 'routeName-1',
        'regionName': 'regionName-1',
        'routeTypeName': 'routeTypeName-1'
    }
];
let mockBusStationAroundList = [
    {
        'stationId': 'stationId-0',
        'stationName': 'stationName-0',
        'x': 37.47754208650613,
        'y': 126.88778021181646
    },
    {
        'stationId': 'stationId-1',
        'stationName': 'stationName-1',
        'x': 37.47658847690168,
        'y': 126.88578464843303
    },
    {
        'stationId': 'stationId-2',
        'stationName': 'stationName-2',
        'x': 37.475685942317895,
        'y': 126.88692190498487
    }
];
let mockBusRouteStationList = [
    {
        'stationId': 'stationId-0',
        'stationName': 'stationName-0',
        'x': 37.47754208650613,
        'y': 126.88778021181646
    },
    {
        'stationId': 'stationId-1',
        'stationName': 'stationName-1',
        'x': 37.47658847690168,
        'y': 126.88578464843303
    },
    {
        'stationId': 'stationId-2',
        'stationName': 'stationName-2',
        'x': 37.475685942317895,
        'y': 126.88692190498487
    }
];

export function mockJsonRes(property) {
    console.log(`mockJsonRes of ${property}.`);
    switch (property) {
        case 'busRouteList':
            return mockBusRouteList;
        case 'busStationAroundList':
            return mockBusStationAroundList;
        case 'busRouteStationList':
            return mockBusRouteStationList;
        default:
            console.log(`Sorry, we are out of ${property}.`);
            return [];
    }
}
