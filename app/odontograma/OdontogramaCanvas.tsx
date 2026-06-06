"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    Engine: any;
  }
}

type OdontogramItem = {
  tooth: number;
  damage: number | string;
  diagnostic?: string;
  surface: string;
  note?: string;
};

function normalizeSurface(tooth: number | string, surface: string) {
  if (!surface || surface === "0") return "0";

  const prefix = `${tooth}_`;

  if (surface.indexOf(prefix) === 0) {
    return surface.substring(prefix.length);
  }

  return surface;
}

export default function OdontogramaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<any>(null);
  const searchParams = useSearchParams();

  function getOdontogramStateForSaving() {
    const data = engineRef.current.getData();

    return data.filter((item: any) => {
      const isOnlyNote =
        item.damage === "" && item.surface === "0" && item.note !== "";

      if (!isOnlyNote) return true;

      return !data.some((candidate: any) => {
        return (
          candidate !== item &&
          candidate.tooth === item.tooth &&
          candidate.note === item.note &&
          (candidate.damage !== "" || candidate.surface !== "0")
        );
      });
    });
  }

  async function saveOdontogramOnDB() {
    const payload = {
      patientData: engineRef.current.treatmentData,
      odontogramData: JSON.stringify(getOdontogramStateForSaving()),
    };
    //Obtener el query param id de la URL actual
    const id = searchParams.get("id") || "0";
    await fetch(`/api/odontogramas/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("Guardado:", payload);
  }

  async function getOdontogramFromDB() {
    console.log("Cargando odontograma desde DB...");
    const id = searchParams.get("id") || "0";
    const response = await fetch(`/api/odontogramas/${id}`);
    const dbPayload = await response.json();
    console.log("Datos recibidos:", dbPayload);
    let odontogramData = dbPayload.data?.odontogramData ?? "[]";

    if (typeof odontogramData === "string") {
      odontogramData = JSON.parse(odontogramData || "[]");
    }

    engineRef.current.reset();

    odontogramData.forEach((item: OdontogramItem) => {
      engineRef.current.load(
        Number(item.tooth),
        Number(item.damage || 0),
        normalizeSurface(item.tooth, item.surface),
        item.note || ""
      );
    });

    engineRef.current.update();
  }

  function initEngine() {
    if (!canvasRef.current || !window.Engine || engineRef.current) return;

    const engine = new window.Engine();
    engineRef.current = engine;

    engine.setCanvas(canvasRef.current);
    engine.init();

    canvasRef.current.addEventListener("mousedown", engine.onMouseClick.bind(engine));
    canvasRef.current.addEventListener("mousemove", engine.onMouseMove.bind(engine));
    window.addEventListener("keydown", engine.onButtonClick.bind(engine));

    engine.loadPatientData(
      "New York",
      "Bardur Thomsen",
      "1002",
      "hc 001",
      "26/02/2018",
      "dentist one",
      "Test observations",
      "Test specifications"
    );

    setTimeout(() => {
      getOdontogramFromDB();
    }, 1600);
  }

  useEffect(() => {
    // Si Engine ya existe, inicializar inmediatamente
    if (window.Engine && !engineRef.current) {
      initEngine();
      return;
    }

    // Si Engine no existe, esperar a que se cargue
    const checkEngine = setInterval(() => {
      if (window.Engine && !engineRef.current) {
        initEngine();
        clearInterval(checkEngine);
      }
    }, 100);

    return () => {
      clearInterval(checkEngine);
      if (engineRef.current && canvasRef.current) {
        canvasRef.current.removeEventListener("mousedown", engineRef.current.onMouseClick);
        canvasRef.current.removeEventListener("mousemove", engineRef.current.onMouseMove);
        window.removeEventListener("keydown", engineRef.current.onButtonClick);
        engineRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <Script
        src="/odontograma/js/constants.js"
        strategy="afterInteractive"
      />
      <Script
        src="/odontograma/js/settings.js"
        strategy="afterInteractive"
      />
      <Script
        src="/odontograma/js/rect.js"
        strategy="afterInteractive"
      />
      <Script
        src="/odontograma/js/damage.js"
        strategy="afterInteractive"
      />
      <Script
        src="/odontograma/js/textBox.js"
        strategy="afterInteractive"
      />
      <Script
        src="/odontograma/js/tooth.js"
        strategy="afterInteractive"
      />
      <Script
        src="/odontograma/js/menuItem.js"
        strategy="afterInteractive"
      />
      <Script
        src="/odontograma/js/renderer.js"
        strategy="afterInteractive"
      />
      <Script
        src="/odontograma/js/odontogramaGenerator.js"
        strategy="afterInteractive"
      />
      <Script
        src="/odontograma/js/collisionHandler.js"
        strategy="afterInteractive"
      />
      <Script
        src="/odontograma/js/engine.js"
        strategy="afterInteractive"
      />

      <div className="flex flex-col items-start md:items-center gap-4 w-full">

        <canvas
          ref={canvasRef}
          width={648}
          height={620}
          onContextMenu={(event) => event.preventDefault()}
        />

        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" type="button" onClick={saveOdontogramOnDB}>
          Guardar
        </button>
      </div>
    </>
  );
}