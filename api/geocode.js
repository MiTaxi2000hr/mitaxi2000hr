
export default async function handler(req, res) {
  const q = req.query.q;

  if (!q || typeof q !== "string") {
    return res.status(400).json({
      message: "Falta la dirección que deseas buscar"
    });
  }

  try {
    const url = new URL("https://photon.komoot.io/api/");

    url.searchParams.set("q", q);
    url.searchParams.set("limit", "5");
    url.searchParams.set("lat", "19.0414");
    url.searchParams.set("lon", "-98.2063");

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Error al consultar Photon"
      });
    }

    const data = await response.json();

    res.setHeader("Cache-Control", "s-maxage=60");
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      message: "No se pudo consultar el buscador",
      error: error.message
    });
  }
}
