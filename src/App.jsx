
import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin, Navigation, CarFront, Clock3, Route,
  Share2, RotateCcw, Info
} from 'lucide-react';

const RATE = 14;

const money = n => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0
}).format(n);

function AddressSearch({ label, value, onSelect, color }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value) {
      setQuery(value.name);
    } else {
      setQuery('');
    }
  }, [value]);

  useEffect(() => {
    if (query.trim().length < 3 || (value && query === value.name)) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          q: query,
          limit: '5',
          lat: '19.0414',
          lon: '-98.2063',
          lang: 'es',
          countrycode: 'MX',
          suggest_addresses: 'true'
        });

        const url = `https://photon.komoot.io/api/?${params.toString()}`;

        const response = await fetch(url, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('Error al consultar direcciones');
        }

        const data = await response.json();

        setResults(data.features || []);
        setOpen(true);

      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error en autocompletado:', error);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, value]);

  const choose = feature => {
    const p = feature.properties;

    const name = [
      p.name,
      p.street,
      p.housenumber,
      p.city || p.town || p.village,
      p.state
    ].filter(Boolean).join(', ');

    onSelect({
      name,
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0]
    });

    setQuery(name);
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="address-field">
      <label className="field-label">{label}</label>

      <div className="address-input-wrap">
        <span style={{ color }}>
          <MapPin size={18} />
        </span>

        <input
          className="text-input address-input"
          value={query}
          placeholder="Escribe una dirección o establecimiento..."
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);

            if (value) {
              onSelect(null);
            }
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
        />

        {loading && (
          <span className="search-loading">Buscando...</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="suggestions">
          {results.map((item, i) => (
            <button
              type="button"
              className="suggestion"
              key={i}
              onMouseDown={e => e.preventDefault()}
              onClick={() => choose(item)}
            >
              <MapPin size={16} />

              <span>
                {[
                  item.properties.name,
                  item.properties.street,
                  item.properties.city || item.properties.town || item.properties.village,
                  item.properties.state
                ].filter(Boolean).join(', ')}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 3 && !loading && results.length === 0 && !value && (
        <p className="search-hint">
          No encontramos sugerencias. Prueba con otra dirección.
        </p>
      )}
    </div>
  );
}

export default function App() {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const originMarker = useRef(null);
  const destinationMarker = useRef(null);
  const routeLine = useRef(null);

  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [base, setBase] = useState(30);
  const [vehicle, setVehicle] = useState('Unidad por asignar');
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  // Inicializar mapa
  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    const map = L.map(mapElement.current).setView(
      [19.0414, -98.2063],
      12
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Actualizar marcadores del mapa
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (origin) {
      if (originMarker.current) {
        originMarker.current.setLatLng([origin.lat, origin.lon]);
      } else {
        originMarker.current = L.marker([origin.lat, origin.lon])
          .addTo(map)
          .bindPopup('Origen');
      }
    } else if (originMarker.current) {
      map.removeLayer(originMarker.current);
      originMarker.current = null;
    }

    if (destination) {
      if (destinationMarker.current) {
        destinationMarker.current.setLatLng([
          destination.lat,
          destination.lon
        ]);
      } else {
        destinationMarker.current = L.marker([
          destination.lat,
          destination.lon
        ])
          .addTo(map)
          .bindPopup('Destino');
      }
    } else if (destinationMarker.current) {
      map.removeLayer(destinationMarker.current);
      destinationMarker.current = null;
    }

    if (origin && destination) {
      map.fitBounds(
        [
          [origin.lat, origin.lon],
          [destination.lat, destination.lon]
        ],
        { padding: [45, 45] }
      );
    } else if (origin) {
      map.setView([origin.lat, origin.lon], 14);
    } else if (destination) {
      map.setView([destination.lat, destination.lon], 14);
    }
  }, [origin, destination]);

  // Calcular ruta y distancia
  useEffect(() => {
    if (!origin || !destination) {
      setDistance(null);
      setDuration(null);
      setRouteError('');
      setRouteLoading(false);

      if (routeLine.current && mapRef.current) {
        mapRef.current.removeLayer(routeLine.current);
        routeLine.current = null;
      }

      return;
    }

    const controller = new AbortController();

    setRouteLoading(true);
    setRouteError('');

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.lon},${origin.lat};${destination.lon},${destination.lat}` +
      '?overview=full&geometries=geojson';

    fetch(url, { signal: controller.signal })
      .then(response => {
        if (!response.ok) {
          throw new Error('No se pudo consultar la ruta.');
        }

        return response.json();
      })
      .then(data => {
        const route = data.routes?.[0];

        if (!route) {
          throw new Error('No encontramos una ruta entre esos lugares.');
        }

        setDistance(route.distance / 1000);
        setDuration(route.duration / 60);

        if (routeLine.current && mapRef.current) {
          mapRef.current.removeLayer(routeLine.current);
        }

        routeLine.current = L.geoJSON(route.geometry, {
          style: {
            color: '#1685c2',
            weight: 5,
            opacity: 0.85
          }
        }).addTo(mapRef.current);
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          setRouteError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      });

    return () => controller.abort();
  }, [origin, destination]);

  // Calcular tarifa
  const total = useMemo(
    () => distance === null ? null : distance * RATE + base,
    [distance, base]
  );

  // Reiniciar cotización
  const reset = () => {
    setOrigin(null);
    setDestination(null);
    setDistance(null);
    setDuration(null);
    setRouteError('');

    if (routeLine.current && mapRef.current) {
      mapRef.current.removeLayer(routeLine.current);
      routeLine.current = null;
    }

    if (mapRef.current) {
      mapRef.current.setView([19.0414, -98.2063], 12);
    }
  };

  // Compartir cotización por WhatsApp
  const shareQuote = () => {
    if (total === null) return;

    const message = [
      '🚕 *COTIZACIÓN | MiTaxi 2000HR*',
      `Origen: ${origin.name}`,
      `Destino: ${destination.name}`,
      `Distancia: ${distance.toFixed(1)} km`,
      `Tarifa: $${RATE} MXN por km`,
      `Base: ${money(base)}`,
      `Unidad: ${vehicle}`,
      `*TOTAL ESTIMADO: ${money(total)}*`,
      `Tiempo estimado: ${Math.round(duration)} minutos`,
      '',
      'Tiempo estimado sin tráfico en tiempo real.'
    ].join('\n');

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">
          <CarFront size={25} />
        </div>

        <div className="brand-copy">
          <strong>
            MiTaxi <span>2000HR</span>
          </strong>
          <small>Movilidad segura, cotización clara</small>
        </div>

        <div className="top-tag">● Cotizador</div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">HERRAMIENTA DE OPERACIÓN</p>
          <h1>Cotiza tu próximo servicio</h1>
          <p className="intro-text">
            Escribe las direcciones de origen y destino para calcular tu tarifa.
          </p>
        </div>

        <div className="intro-icon">
          <Navigation size={27} />
        </div>
      </section>

      <div className="workspace">
        <section className="map-panel panel">
          <div className="panel-heading">
            <div>
              <h2>Ruta del servicio</h2>
              <p>
                La ruta aparecerá automáticamente al elegir ambas direcciones.
              </p>
            </div>

            <button className="secondary-button" onClick={reset}>
              <RotateCcw size={15} />
              Reiniciar
            </button>
          </div>

          <div className="map-wrap">
            <div ref={mapElement} className="map" />
          </div>

          <div className="map-legend">
            <span>🟢 Origen</span>
            <span>🔵 Destino</span>
          </div>
        </section>

        <aside className="quote-panel panel">
          <div className="panel-heading quote-heading">
            <div>
              <p className="eyebrow">RESUMEN</p>
              <h2>Datos de cotización</h2>
            </div>

            <div className="quote-icon">
              <Route size={20} />
            </div>
          </div>

          <AddressSearch
            label="Punto de origen"
            value={origin}
            onSelect={setOrigin}
            color="#15966a"
          />

          <AddressSearch
            label="Destino"
            value={destination}
            onSelect={setDestination}
            color="#147fbd"
          />

          <label className="field-label" htmlFor="vehicle">
            Unidad / vehículo
          </label>

          <input
            id="vehicle"
            className="text-input"
            value={vehicle}
            onChange={e => setVehicle(e.target.value)}
            placeholder="Ej. Unidad 12 · 4 pasajeros"
          />

          <div className="base-header">
            <label className="field-label" htmlFor="base">
              Tarifa base seleccionada
            </label>

            <strong>{money(base)}</strong>
          </div>

          <input
            id="base"
            className="range-input"
            type="range"
            min="20"
            max="40"
            step="1"
            value={base}
            onChange={e => setBase(Number(e.target.value))}
          />

          <div className="range-labels">
            <span>$20</span>
            <span>$30</span>
            <span>$40 MXN</span>
          </div>

          <p className="helper">
            La persona operadora selecciona la base entre $20 y $40 MXN.
          </p>

          <div className="metrics">
            <div className="metric">
              <Route size={17} />
              <span>Distancia</span>
              <b>
                {distance === null ? '—' : `${distance.toFixed(1)} km`}
              </b>
            </div>

            <div className="metric">
              <Clock3 size={17} />
              <span>Tiempo estimado</span>
              <b>
                {duration === null ? '—' : `${Math.round(duration)} min`}
              </b>
            </div>
          </div>

          {routeLoading && (
            <p className="notice">Calculando recorrido...</p>
          )}

          {routeError && (
            <p className="error-message">{routeError}</p>
          )}

          <div className="total-card">
            <div>
              <span>Total estimado</span>
              <small>$14 por km + tarifa base</small>
            </div>

            <strong>
              {total === null ? '$ —' : money(total)}
            </strong>
          </div>

          <button
            className="primary-button"
            disabled={total === null || routeLoading}
            onClick={shareQuote}
          >
            <Share2 size={17} />
            Compartir por WhatsApp
          </button>

          <div className="notice disclaimer">
            <Info size={16} />

            <span>
              El tiempo es una estimación de ruta, no incluye tráfico en tiempo real.
              Verifica las direcciones antes de confirmar.
            </span>
          </div>
        </aside>
      </div>

      <footer>
        MiTaxi 2000HR · Cotizador inicial · Mapa © OpenStreetMap contributors
      </footer>
    </main>
  );
}
