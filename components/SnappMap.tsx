import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * SnappMap: a real street map with markers, free and with no API key (Snapp's default map).
 *
 * The base map is OpenFreeMap (https://openfreemap.org: OpenStreetMap data, no key, no usage limit, commercial use
 * allowed), drawn by MapLibre inside a WebView, so it looks the same in the Snapp preview, on Android, on iPhone and
 * on the web. Drag to pan, pinch to zoom; the screen gets the new centre and zoom when a gesture ends.
 *
 *   <SnappMap
 *     latitude={41.01} longitude={28.97} zoom={13}
 *     markers={[{ id: 'a', latitude: 41.01, longitude: 28.97, color: '#E8365D', icon: 'restaurant' }]}
 *     onMarkerPress={(id) => openPlace(id)}
 *     theme="light"
 *   />
 *
 * Markers: `icon` is an Ionicons name drawn inside the pin; without it the pin shows a dot. Change `latitude`,
 * `longitude` or `zoom` to move the map (it glides there). Coordinates come from real data or utils/geocode.ts,
 * never invented.
 *
 * Routes and editing: `lines` draws polylines (a route, a trail), `fitTo` frames a set of points (the map glides to
 * show them all whenever the list changes), `onMapPress` gives the tapped spot, and a marker with `draggable` can be
 * dragged (`onMarkerDragEnd` gives its new spot).
 */

export interface SnappMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  /** Pin colour (any CSS colour). */
  color?: string;
  /** Ionicons name drawn inside the pin. */
  icon?: string;
  /** The user can drag this pin (see onMarkerDragEnd). */
  draggable?: boolean;
}

export interface SnappMapPoint {
  latitude: number;
  longitude: number;
}

export interface SnappMapLine {
  id: string;
  coordinates: SnappMapPoint[];
  /** Line colour (any CSS colour). */
  color?: string;
  /** Width in pixels (default 5). */
  width?: number;
}

export interface SnappMapProps {
  latitude: number;
  longitude: number;
  /** 3 (world) to 18 (street). */
  zoom?: number;
  markers?: SnappMapMarker[];
  /** The marker drawn larger, with a pulsing halo. */
  activeMarkerId?: string | null;
  onMarkerPress?: (id: string) => void;
  /** A draggable marker was dropped: its id and new spot. */
  onMarkerDragEnd?: (id: string, point: SnappMapPoint) => void;
  /** The user tapped the map (not a marker): the spot. */
  onMapPress?: (point: SnappMapPoint) => void;
  /** Polylines: routes, trails, areas' outlines. */
  lines?: SnappMapLine[];
  /** Frame these points: whenever the list changes, the map glides to show them all (two or more). */
  fitTo?: SnappMapPoint[];
  /** After a drag or pinch: the new centre and zoom. */
  onRegionChange?: (region: { latitude: number; longitude: number; zoom: number }) => void;
  /** 'light' (streets, buildings and places) or 'dark'. */
  theme?: 'light' | 'dark';
  /** false: the map stays still (inside a scrolling page); markers can still be tapped. */
  interactive?: boolean;
  style?: any;
}

const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
const clampZoom = (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value)));

const mapHtml = (lat: number, lng: number, zoom: number, interactive: boolean, styleUrl: string, background: string) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.css">
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.0/dist/maplibre-gl.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/ionicons@7.4.0/dist/ionicons/ionicons.esm.js"></script>
<style>
  html,body,#map{margin:0;padding:0;width:100%;height:100%;background:${background};overflow:hidden}
  .pin{position:absolute;width:40px;height:46px;display:flex;flex-direction:column;align-items:center;cursor:pointer}
  .head{width:30px;height:30px;border-radius:15px;border:2px solid #fff;display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 6px rgba(0,0,0,.25);box-sizing:border-box;color:#fff;font-size:15px}
  .dot{width:9px;height:9px;border-radius:5px;background:#fff}
  .tip{width:0;height:0;margin-top:-2px;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid}
  .pin.active{z-index:4}
  .pin.active .head{width:36px;height:36px;border-radius:18px;border-width:3px;margin-top:-6px}
  .halo{position:absolute;top:8px;width:30px;height:30px;border-radius:15px;opacity:0;pointer-events:none}
  .pin.active .halo{animation:pulse 1.7s ease-in-out infinite}
  @keyframes pulse{0%{transform:scale(1);opacity:.35}100%{transform:scale(2.1);opacity:0}}
  .maplibregl-ctrl-attrib{font-size:9px}
</style>
</head><body><div id="map"></div>
<script>
  function send(m){var s=JSON.stringify(m);if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(s)}else if(window.parent!==window){window.parent.postMessage(s,'*')}}
  var map,markers={},activeId=null;
  function esc(v){return String(v||'').replace(/[^#\\w(),.% -]/g,'')}
  function makePin(p){
    var el=document.createElement('div');el.className='pin';var c=esc(p.color)||'#E8365D';
    el.innerHTML='<div class="halo" style="background:'+c+'"></div><div class="head" style="background:'+c+'">'+(p.icon?'<ion-icon name="'+esc(p.icon)+'"></ion-icon>':'<div class="dot"></div>')+'</div><div class="tip" style="border-top-color:'+c+'"></div>';
    el.addEventListener('click',function(e){e.stopPropagation();send({type:'marker',id:p.id})});
    return el;
  }
  window.__setLines=function(list){
    var data={type:'FeatureCollection',features:list.map(function(l){return {type:'Feature',properties:{color:esc(l.color)||'#E8365D',width:Number(l.width)||5},geometry:{type:'LineString',coordinates:l.coordinates.map(function(c){return [c.longitude,c.latitude]})}}})};
    var put=function(){
      var src=map.getSource('snapp-lines');
      if(src){src.setData(data);return}
      map.addSource('snapp-lines',{type:'geojson',data:data});
      map.addLayer({id:'snapp-lines',type:'line',source:'snapp-lines',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':['get','width'],'line-opacity':0.9}});
    };
    if(map.isStyleLoaded())put();else map.once('load',put);
  };
  window.__fitTo=function(points){
    if(!map||points.length<2)return;
    var b=new maplibregl.LngLatBounds();points.forEach(function(p){b.extend([p.longitude,p.latitude])});
    map.fitBounds(b,{padding:48,duration:450,maxZoom:16});
  };
  window.__setMarkers=function(list,active){
    var seen={};
    list.forEach(function(p){
      seen[p.id]=1;var m=markers[p.id];var key=JSON.stringify(p);
      if(m&&m.__key!==key){m.remove();m=null}
      if(!m){
        m=new maplibregl.Marker({element:makePin(p),anchor:'bottom',draggable:!!p.draggable}).setLngLat([p.longitude,p.latitude]).addTo(map);m.__key=key;markers[p.id]=m;
        if(p.draggable){(function(id,mk){mk.on('dragend',function(){var ll=mk.getLngLat();send({type:'drag',id:id,latitude:ll.lat,longitude:ll.lng})})})(p.id,m)}
      }
    });
    Object.keys(markers).forEach(function(id){if(!seen[id]){markers[id].remove();delete markers[id]}});
    activeId=active||null;
    Object.keys(markers).forEach(function(id){markers[id].getElement().classList.toggle('active',id===activeId)});
  };
  window.__setView=function(lat,lng,zoom){
    if(!map)return;var c=map.getCenter();
    if(Math.abs(c.lat-lat)<1e-6&&Math.abs(c.lng-lng)<1e-6&&Math.round(map.getZoom())===zoom)return;
    map.easeTo({center:[lng,lat],zoom:zoom,duration:450});
  };
  try{
    map=new maplibregl.Map({container:'map',style:'${styleUrl}',center:[${lng},${lat}],zoom:${zoom},
      minZoom:${MIN_ZOOM},maxZoom:${MAX_ZOOM},interactive:${interactive},attributionControl:{compact:true},
      dragRotate:false,pitchWithRotate:false,touchPitch:false});
    if(map.touchZoomRotate)map.touchZoomRotate.disableRotation();
    map.on('load',function(){send({type:'ready'})});
    map.on('error',function(e){if(!map.isStyleLoaded())send({type:'error',message:(e&&e.error&&e.error.message)||''})});
    map.on('click',function(e){send({type:'press',latitude:e.lngLat.lat,longitude:e.lngLat.lng})});
    map.on('moveend',function(e){if(!e.originalEvent)return;var c=map.getCenter();send({type:'move',latitude:c.lat,longitude:c.lng,zoom:Math.round(map.getZoom())})});
  }catch(err){send({type:'error',message:String(err&&err.message||err)})}
</script></body></html>`;

const SnappMap = ({
  latitude,
  longitude,
  zoom = 13,
  markers = [],
  activeMarkerId = null,
  onMarkerPress,
  onMarkerDragEnd,
  onMapPress,
  lines = [],
  fitTo,
  onRegionChange,
  theme = 'light',
  interactive = true,
  style,
}: SnappMapProps) => {
  const webRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const viewZoom = clampZoom(zoom);
  const background = theme === 'dark' ? '#0E1116' : '#E9E5DC';

  // Built once per theme: later moves and markers go in through injected calls, so the map never reloads mid-gesture.
  const html = useMemo(
    () => mapHtml(latitude, longitude, viewZoom, interactive, STYLES[theme] || STYLES.light, background),
    [theme, interactive] // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => setReady(false), [html]);

  // On the web (the browser and the iPhone preview) the WebView is an iframe. Given as srcdoc, MapLibre never finished
  // loading its style (measured 2026-10-29: no tiles, no pins, a blank map); given as a blob address it loads at once.
  const source = useMemo(() => {
    if (Platform.OS === 'web' && typeof URL !== 'undefined' && typeof Blob !== 'undefined' && URL.createObjectURL) {
      return { uri: URL.createObjectURL(new Blob([html], { type: 'text/html' })) };
    }
    return { html, baseUrl: 'https://snappai.co/' };
  }, [html]);
  useEffect(
    () => () => {
      if ('uri' in source && source.uri.startsWith('blob:')) URL.revokeObjectURL(source.uri);
    },
    [source]
  );

  const live = useRef({ onMarkerPress, onRegionChange, onMarkerDragEnd, onMapPress });
  live.current = { onMarkerPress, onRegionChange, onMarkerDragEnd, onMapPress };
  const run = (script: string) => webRef.current?.injectJavaScript(`${script};true;`);

  const markerData = useMemo(
    () =>
      markers
        .filter((m) => Number.isFinite(m.latitude) && Number.isFinite(m.longitude))
        .map((m) => ({ id: String(m.id), latitude: m.latitude, longitude: m.longitude, color: m.color || '', icon: m.icon || '', draggable: !!m.draggable })),
    [markers]
  );

  useEffect(() => {
    if (ready) run(`window.__setMarkers(${JSON.stringify(markerData)}, ${JSON.stringify(activeMarkerId)})`);
  }, [ready, markerData, activeMarkerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const lineData = useMemo(
    () =>
      lines
        .map((l) => ({
          id: String(l.id),
          color: l.color || '',
          width: l.width || 5,
          coordinates: (l.coordinates || []).filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude)),
        }))
        .filter((l) => l.coordinates.length > 1),
    [lines]
  );
  useEffect(() => {
    if (ready) run(`window.__setLines(${JSON.stringify(lineData)})`);
  }, [ready, lineData]); // eslint-disable-line react-hooks/exhaustive-deps

  const fitKey = JSON.stringify((fitTo || []).filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)));
  useEffect(() => {
    if (ready && fitTo && fitTo.length > 1) run(`window.__fitTo(${fitKey})`);
  }, [ready, fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ready) run(`window.__setView(${latitude}, ${longitude}, ${viewZoom})`);
  }, [ready, latitude, longitude, viewZoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // No map after a while (no connection): say so instead of an empty box.
  useEffect(() => {
    if (ready || failed) return;
    const timer = setTimeout(() => setFailed(true), 20000);
    return () => clearTimeout(timer);
  }, [ready, failed]);

  const onMessage = (event: any) => {
    let message: any;
    try {
      const data = event?.nativeEvent?.data;
      message = typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return;
    }
    if (!message || typeof message !== 'object') return;
    if (message.type === 'ready') {
      setReady(true);
      setFailed(false);
    } else if (message.type === 'error') setFailed(true);
    else if (message.type === 'marker') live.current.onMarkerPress?.(String(message.id));
    else if (message.type === 'drag') live.current.onMarkerDragEnd?.(String(message.id), { latitude: message.latitude, longitude: message.longitude });
    else if (message.type === 'press') live.current.onMapPress?.({ latitude: message.latitude, longitude: message.longitude });
    else if (message.type === 'move') {
      live.current.onRegionChange?.({ latitude: message.latitude, longitude: message.longitude, zoom: clampZoom(message.zoom) });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: background }, style]}>
      <WebView
        ref={webRef}
        style={styles.web}
        source={source as any}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        // Android: pinch must reach the map, not zoom the page (a page zoom blows the map up like a picture: blurred or
        // missing street names, pins drifting out of frame).
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        nestedScrollEnabled={interactive}
        setSupportMultipleWindows={false}
        onMessage={onMessage}
        onError={() => setFailed(true)}
      />
      {failed ? (
        <View style={[styles.cover, { backgroundColor: background }]} pointerEvents="none">
          <Text style={[styles.coverText, theme === 'dark' && styles.coverTextDark]}>
            The map could not load. Check your internet connection.
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  web: { flex: 1, backgroundColor: 'transparent' },
  cover: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  coverText: { color: '#55524C', fontSize: 14, textAlign: 'center' },
  coverTextDark: { color: '#A9B1BD' },
});

export default SnappMap;
