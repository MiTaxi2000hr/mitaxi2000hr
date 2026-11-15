import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

const PUEBLA = [19.0414, -98.2063];
const RATE = 14;
const icon = (color) => L.divIcon({
  className: "pin-wrap",
  html: `<div style="background:${color};width:20px;height:20px;border:3px solid white;border-radius:50%;box-shadow:0 1px 7px #0007"></div>`,
  iconSize: [20,20], iconAnchor: [10,10]
});

function MapClick({ onPick, mode }) {
  useMapEvents({ click(e) { onPick([e.latlng.lat, e.latlng.lng], mode); } });
  return null;
}
function FitRoute({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 2) map.fitBounds(points, { padding: [35,35] });
  }, [points, map]);
  return null;
}

export default function App() {
  const [role, setRole] = useState("operator");
  const [pickMode, setPickMode] = useState("origin");
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [base, setBase] = useState(30);
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [vehicle, setVehicle] = useState("Sin asignar");
  const [history, setHistory] = useState([]);

  const points = useMemo(() => [origin, destination].filter(Boolean), [origin, destination]);
  const km = route ? route.distance / 1000 : null;
  const fare = km === null ? null : km * RATE + Number(base);
  const duration = route ? Math.round(route.duration / 60) : null;

  function setPoint(point, mode) {
    if (mode === "origin") setOrigin(point);
    else setDestination(point);
    setRoute(null);
    setError("");
  }

  async function calculate() {
    if (!origin || !destination) {
      setError("Selecciona primero el origen y el destino en el mapa.");
      return;
    }
    setBusy(true); setError(""); setRoute(null);
    try {
      const coords = `${origin[1]},${origin[0]};${destination[1]},${destination[0]}`;
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("El servicio de rutas no respondió.");
      const data = await response.json();
      if (data.code !== "Ok" || !data.routes?.length) throw new Error("No se encontró una ruta para esos puntos.");
      setRoute(data.routes[0]);
    } catch (e) {
      setError(`${e.message} Intenta nuevamente.`);
    } finally { setBusy(false); }
  }

  function saveQuote() {
    if (fare === null) return;
    const item = {
      id: `MT-${Date.now().toString().slice(-8)}`,
      date: new Date().toLocaleString("es-MX"),
      km: km.toFixed(2), base, fare: fare.toFixed(2),
      duration, role, vehicle
    };
    setHistory(h => [item, ...h].slice(0, 30));
    return item;
  }

  function shareQuote() {
    const item = saveQuote();
    if (!item) return;
    const msg = `🚕 *MiTaxi 2000HR | Cotización*%0A` +
      `Folio: ${item.id}%0A` +
      `Distancia: ${item.km} km%0A` +
      `Tarifa: $${RATE.toFixed(2)} MXN/km%0A` +
      `Base: $${item.base.toFixed(2)} MXN%0A` +
      `Tiempo estimado de ruta: ${item.duration} min (sin garantía)%0A` +
      `*Total estimado: $${item.fare} MXN*%0A` +
      `Precio sujeto a confirmación del operador.`;
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">🚕</div><div><strong>MiTaxi 2000HR</strong><small>Cotizador de viajes</small></div></div>
      <div className="role-switch"><span>Perfil de demostración</span>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="operator">Operador</option><option value="admin">Administrador</option>
        </select>
      </div>
    </header>

    <main className="layout">
      <section className="map-panel">
        <div className="map-heading"><div><h1>Mapa de Puebla</h1><p>Selecciona los puntos directamente en el mapa.</p></div><span className="live-dot">Mapa en línea</span></div>
        <div className="map-tools">
          <button className={pickMode === "origin" ? "active" : ""} onClick={() => setPickMode("origin")}>＋ Elegir origen</button>
          <button className={pickMode === "destination" ? "active" : ""} onClick={() => setPickMode("destination")}>＋ Elegir destino</button>
          <button className="ghost" onClick={() => {setOrigin(null);setDestination(null);setRoute(null);}}>Limpiar</button>
        </div>
        <div className="map-frame">
          <MapContainer center={PUEBLA} zoom={13} scrollWheelZoom>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClick onPick={setPoint} mode={pickMode} />
            {origin && <Marker position={origin} icon={icon("#159568")} />}
            {destination && <Marker position={destination} icon={icon("#d94b4b")} />}
            {route && <Polyline positions={route.geometry.coordinates.map(([lng,lat]) => [lat,lng])} pathOptions={{color:"#147b5b",weight:5,opacity:.85}} />}
            <FitRoute points={points} />
          </MapContainer>
        </div>
        <p className="map-note">Haz clic en el mapa para colocar el punto seleccionado. El mapa usa OpenStreetMap.</p>
      </section>

      <aside className="side-panel">
        <div className="section-title"><span className="eyebrow">NUEVA COTIZACIÓN</span><h2>Detalles del viaje</h2></div>
        <div className="point-card"><span className="point-dot green"></span><div><small>ORIGEN</small><strong>{origin ? `${origin[0].toFixed(5)}, ${origin[1].toFixed(5)}` : "Selecciona en el mapa"}</strong></div></div>
        <div className="point-card"><span className="point-dot red"></span><div><small>DESTINO</small><strong>{destination ? `${destination[0].toFixed(5)}, ${destination[1].toFixed(5)}` : "Selecciona en el mapa"}</strong></div></div>
        <button className="primary full" onClick={calculate} disabled={busy || !origin || !destination}>{busy ? "Calculando ruta…" : "Calcular ruta y distancia"}</button>
        {error && <div className="error">{error}</div>}
        <div className="divider"></div>
        <label className="field-label">Unidad (referencia)</label>
        <input value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder="Ej. Unidad 024" />
        <div className="field-row"><label className="field-label">Tarifa base del operador</label><strong>${base} MXN</strong></div>
        <input type="range" min="20" max="40" step="1" value={base} onChange={e=>setBase(Number(e.target.value))} />
        <div className="range-labels"><span>$20 mínimo</span><span>$40 máximo</span></div>
        <div className="rate-line"><span>Tarifa fija por kilómetro</span><strong>$14.00 MXN</strong></div>
        <div className="metrics">
          <div><small>DISTANCIA</small><strong>{km === null ? "—" : `${km.toFixed(2)} km`}</strong></div>
          <div><small>TIEMPO DE RUTA</small><strong>{duration === null ? "—" : `≈ ${duration} min`}</strong></div>
        </div>
        <div className="total-card"><small>TOTAL ESTIMADO</small><div>{fare === null ? "$—" : fare.toLocaleString("es-MX",{style:"currency",currency:"MXN"})}</div><p>{fare === null ? "Calcula una ruta para obtener el precio." : `${km.toFixed(2)} km × $14 + $${base} de base`}</p></div>
        <button className="primary full" onClick={shareQuote} disabled={fare === null}>Compartir cotización por WhatsApp</button>
        <p className="disclaimer">Cotización estimada. El tiempo mostrado es una estimación de ruta y no incluye datos de tráfico en vivo. Confirma el servicio y el precio con el operador.</p>
      </aside>
    </main>

    <section className="history">
      <div className="history-head"><div><span className="eyebrow">REGISTRO LOCAL DE ESTA SESIÓN</span><h2>Últimas cotizaciones</h2></div><span className="muted">No se sincroniza entre dispositivos</span></div>
      {history.length === 0 ? <p className="empty">Todavía no hay cotizaciones guardadas.</p> : <div className="table-wrap"><table><thead><tr><th>Folio</th><th>Fecha</th><th>Distancia</th><th>Base</th><th>Total</th><th>Perfil</th></tr></thead><tbody>{history.map(x=><tr key={x.id}><td>{x.id}</td><td>{x.date}</td><td>{x.km} km</td><td>${x.base}</td><td><b>${x.fare}</b></td><td>{x.role === "admin" ? "Administrador (demo)" : "Operador (demo)"}</td></tr>)}</tbody></table></div>}
    </section>
    <footer>MiTaxi 2000HR · Prototipo inicial · No usar aún como sistema de cobro definitivo</footer>
  </div>;
}
