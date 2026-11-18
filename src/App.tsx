import { useState } from 'react'
import './App.css'

function App() {
  const [contador, setContador] = useState(0)

  return (
<>
<header className="header">
    <div className="logo">COMPILERS</div>  
   <h1>simulador de redes </h1>
   </header>
<body>
<section className="contenedorPrincipal">
   <div className="tarjeta"> prim  </div>
    <div className="tarjeta"> kruskal </div>
      <div className="tarjeta"> dijkstra </div>
</section>

<section className="contenedorSecundario">

<iframe
            className="mapaIframe"
            title="Mapa de red"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-103.3500%2C20.6400%2C-103.3000%2C20.6750&layer=mapnik"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
</section>

</body>
</>

)
}

export default App