import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { haversineM, SPLIT_DISTANCE_M, type RunPoint } from '@/lib/run'
import { getComputedAccent } from '@/lib/utils'

/**
 * Mapa del recorrido con Leaflet + tiles de OpenStreetMap. Carga lazy
 * (chunk propio, ver vite.config.ts) — Leaflet + su CSS pesan y solo se
 * usan acá. Los tiles necesitan conexión; sin ella Leaflet muestra el
 * fondo gris y la polilínea igual se dibuja encima (el aviso "sin
 * conexión" lo pone el que lo usa).
 *
 * Marcadores como `circleMarker` a propósito: los íconos por defecto de
 * Leaflet dependen de assets con rutas que los bundlers rompen, y un punto
 * de color es más acorde al lenguaje visual de la app que un pin.
 */
export default function RunMap({
  points,
  className,
  interactive = true,
}: {
  points: RunPoint[]
  className?: string
  interactive?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const lineRef = useRef<L.Polyline | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      zoomControl: interactive,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    map.setView([-34.6, -58.4], 13)
    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      lineRef.current = null
      markersRef.current = null
    }
  }, [interactive])

  useEffect(() => {
    const map = mapRef.current
    if (!map || points.length === 0) return

    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number])
    const accent = getComputedAccent()

    if (lineRef.current) {
      lineRef.current.setLatLngs(latlngs)
    } else {
      lineRef.current = L.polyline(latlngs, { color: accent, weight: 4, opacity: 0.9 }).addTo(map)
    }

    // Marcadores: inicio, fin y cada km.
    const markers = markersRef.current!
    markers.clearLayers()
    L.circleMarker(latlngs[0], { radius: 6, color: '#fff', weight: 2, fillColor: accent, fillOpacity: 1 }).addTo(markers)

    let acc = 0
    let nextKm = SPLIT_DISTANCE_M
    for (let i = 1; i < points.length; i++) {
      acc += haversineM(points[i - 1], points[i])
      while (acc >= nextKm) {
        L.circleMarker(latlngs[i], {
          radius: 4,
          color: accent,
          weight: 2,
          fillColor: '#fff',
          fillOpacity: 1,
        })
          .bindTooltip(`${nextKm / 1000} km`, { permanent: false })
          .addTo(markers)
        nextKm += SPLIT_DISTANCE_M
      }
    }
    if (latlngs.length > 1) {
      L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 6,
        color: '#fff',
        weight: 2,
        fillColor: accent,
        fillOpacity: 1,
      }).addTo(markers)
    }

    map.fitBounds(L.latLngBounds(latlngs).pad(0.15))
  }, [points])

  return <div ref={containerRef} className={className} aria-label="Mapa del recorrido" />
}
