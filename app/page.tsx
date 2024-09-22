import NavBar from "./components/navBar"
import AutoCarrousel from "../app/components/auto_carrousel"


export default function Home() {


  return (
    <div className="flex flex-col min-h-screen">
      
      <NavBar/>
      <main className="flex-grow container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-6">Bienvenido a Mi Sitio</h1>
        <p className="text-lg mb-4">
          Este es un ejemplo de una página de inicio con una estructura básica que incluye header, body y footer.
        </p>
        <AutoCarrousel/>
      </main>

      <footer className="bg-muted py-4 mt-8">
        <div className="container mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} Mi Sitio. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
