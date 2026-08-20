import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import ThenNowSlider from "./ThenNowSlider.jsx";
import {
  ArrowRight,
  Award,
  BookOpen,
  Camera,
  Clock,
  Info,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  RotateCcw,
  X,
} from "lucide-react";

const HERSHEY_CENTER = [40.2859, -76.6503];
const DEFAULT_ZOOM = 14;
const MAX_POINTS_PER_SITE = 1000;

// Derry Township, Dauphin County PA — the whole township is framed when the
// map is expanded. Bounds from OpenStreetMap's administrative boundary.
const DERRY_TOWNSHIP_BOUNDS = [
  [40.2286, -76.7372], // south-west
  [40.3396, -76.592], // north-east
];

/** Great-circle distance between two lat/lng pairs, in meters. */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 6371000 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const guessIcon = () =>
  L.divIcon({
    className: "hhh-guess",
    html: '<div style="background:#3c2415;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff8e7;box-shadow:0 3px 10px rgba(60,36,21,0.4);display:flex;align-items:center;justify-content:center"><div style="width:10px;height:10px;background:#d4a574;border-radius:50%;transform:rotate(45deg)"></div></div>',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

const actualIcon = () =>
  L.divIcon({
    className: "hhh-actual",
    html: '<div style="background:#d4a574;width:36px;height:36px;border-radius:50%;border:3px solid #3c2415;box-shadow:0 3px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-weight:900;color:#3c2415;font-size:16px;">★</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

function ratingFor(distanceMeters) {
  if (distanceMeters < 100) return "INCREDIBLE! CHOCOLATE HISTORIAN!";
  if (distanceMeters < 300) return "GREAT EYE! LOCAL EXPERT";
  if (distanceMeters < 600) return "CLOSE! GOOD SENSE OF TOWN";
  return "KEEP EXPLORING!";
}

function summaryFor(totalScore) {
  if (totalScore > 3000)
    return "Outstanding! You're a true Chocolate Town historian. Your knowledge would make Milton Hershey proud.";
  if (totalScore > 2000)
    return "Great work! You know your Hershey streets. Bring a volunteer friend and beat your score.";
  return "Nice start! Hershey's history hides in plain sight. Walk the town and you'll spot clues everywhere.";
}

const INTRO_STEPS = [
  { n: "1", t: "Study the Photo", d: "Note buildings, hills, and year." },
  { n: "2", t: "Drop Your Pin", d: "Click the map to place your guess." },
  { n: "3", t: "Learn the Story", d: "See Then & Now and the history." },
];

export default function App() {
  // "intro" -> "playing" -> "result" -> ... -> "finished"
  const [phase, setPhase] = useState("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [guess, setGuess] = useState(null);
  const [scores, setScores] = useState([]);
  const [distances, setDistances] = useState([]);
  const [lastDistance, setLastDistance] = useState(0);
  const [lastPoints, setLastPoints] = useState(0);
  const [landmarks, setLandmarks] = useState(null);
  const [loadError, setLoadError] = useState(null);
  // The clue photo starts fully historic; the reveal starts split down the middle.
  const [sliderValue, setSliderValue] = useState(50);
  const [clueSliderValue, setClueSliderValue] = useState(100);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isStoryExpanded, setIsStoryExpanded] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const guessMarkerRef = useRef(null);
  const actualMarkerRef = useRef(null);
  const errorLineRef = useRef(null);
  // Where the map was looking before it went fullscreen, so collapsing restores it.
  const collapsedViewRef = useRef(null);
  const wasMapExpandedRef = useRef(false);

  const site = landmarks && landmarks[roundIndex];
  const totalScore = scores.reduce((sum, points) => sum + points, 0);

  // Load the landmark data.
  useEffect(() => {
    let cancelled = false;
    fetch("./landmarks.json")
      .then((res) => {
        if (!res.ok) throw Error("Unable to load landmark data");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0)
          throw Error("Landmark data is empty");
        if (cancelled) return;
        setLandmarks(data);
        setLoadError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(
          "Unable to load landmark data. Serve this folder over HTTP and try again.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Build a fresh map for each round.
  useEffect(() => {
    if (!mapContainerRef.current || phase === "intro" || phase === "finished")
      return;

    // Tear down any previous map before replacing it. Cleanup deliberately
    // leaves the map alive, so the round-advance recenter can still reach it.
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: HERSHEY_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (event) => {
      if (phase !== "playing") return;
      setGuess({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 250);
  }, [phase, roundIndex]);

  // Keep the guess pin in sync with the last map click.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (guessMarkerRef.current) {
      map.removeLayer(guessMarkerRef.current);
      guessMarkerRef.current = null;
    }
    if (guess && phase === "playing") {
      guessMarkerRef.current = L.marker([guess.lat, guess.lng], {
        icon: guessIcon(),
      }).addTo(map);
    }
  }, [guess, phase]);

  // On reveal: drop the true location, draw the error line, frame both.
  useEffect(() => {
    if (phase !== "result" || !guess) return;
    const map = mapRef.current;
    if (!map) return;

    if (actualMarkerRef.current) map.removeLayer(actualMarkerRef.current);
    if (errorLineRef.current) map.removeLayer(errorLineRef.current);

    actualMarkerRef.current = L.marker([site.lat, site.lng], {
      icon: actualIcon(),
    }).addTo(map);

    errorLineRef.current = L.polyline(
      [
        [guess.lat, guess.lng],
        [site.lat, site.lng],
      ],
      { color: "#3c2415", weight: 3, dashArray: "8 8", opacity: 0.8 },
    ).addTo(map);

    const bounds = L.latLngBounds([
      [guess.lat, guess.lng],
      [site.lat, site.lng],
    ]).pad(0.3);
    map.fitBounds(bounds, { animate: true, maxZoom: 16 });
  }, [phase, guess, site]);

  // Re-measure Leaflet when the map card enters or leaves fullscreen. Expanding
  // frames all of Derry Township; collapsing returns to the previous view.
  useEffect(() => {
    const wasExpanded = wasMapExpandedRef.current;
    wasMapExpandedRef.current = isMapExpanded;

    const map = mapRef.current;
    if (!map || (!isMapExpanded && !wasExpanded)) return;

    // Let the new layout settle before Leaflet reads the container size.
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (isMapExpanded) {
        map.fitBounds(DERRY_TOWNSHIP_BOUNDS, { animate: false });
      } else if (collapsedViewRef.current) {
        const { center, zoom } = collapsedViewRef.current;
        map.setView(center, zoom, { animate: false });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [isMapExpanded]);

  // Never leave an overlay open across a round or phase change.
  useEffect(() => {
    setIsMapExpanded(false);
    setIsStoryExpanded(false);
  }, [phase, roundIndex]);

  // Escape closes whichever overlay is open.
  useEffect(() => {
    if (!isMapExpanded && !isStoryExpanded) return;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setIsMapExpanded(false);
      setIsStoryExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMapExpanded, isStoryExpanded]);

  // Stop the page scrolling behind a fullscreen overlay.
  useEffect(() => {
    if (!isMapExpanded && !isStoryExpanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMapExpanded, isStoryExpanded]);

  if (loadError || !landmarks) {
    return (
      <div className="min-h-screen bg-[#fff8e7] text-[#3c2415] flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-[#d4a574]/40 rounded-2xl p-8 text-center shadow-[0_20px_60px_rgba(60,36,21,0.12)]">
          <h1 className="font-black text-2xl">
            {loadError ? "Landmarks unavailable" : "Loading landmarks..."}
          </h1>
          {loadError && (
            <p className="mt-3 text-sm leading-relaxed text-[#3c2415]/70">
              {loadError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Only sites with both photos can offer a Then & Now comparison.
  const hasPairedPhotos = Boolean(site.thenImage && site.nowImage);

  // Long-form text is optional per landmark; blank lines separate paragraphs.
  const storyParagraphs = (site.fullHistory || site.history)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const startHunt = () => {
    setSliderValue(50);
    setClueSliderValue(100);
    setPhase("playing");
  };

  const toggleMapExpanded = () => {
    const map = mapRef.current;
    if (map && !isMapExpanded) {
      collapsedViewRef.current = {
        center: map.getCenter(),
        zoom: map.getZoom(),
      };
    }
    setIsMapExpanded((expanded) => !expanded);
  };

  const lockInGuess = () => {
    if (!guess) return;
    const distance = haversineMeters(guess.lat, guess.lng, site.lat, site.lng);
    const points = Math.max(0, Math.round(MAX_POINTS_PER_SITE - distance));
    setLastDistance(distance);
    setLastPoints(points);
    setDistances((prev) => [...prev, distance]);
    setScores((prev) => [...prev, points]);
    setSliderValue(50);
    setPhase("result");
  };

  // Shrink the map back down first, so the reveal frames both pins against the
  // inline map size rather than the fullscreen one.
  const lockInFromExpandedMap = () => {
    if (!guess) return;
    setIsMapExpanded(false);
    setTimeout(lockInGuess, 120);
  };

  const nextSite = () => {
    const map = mapRef.current;
    if (map) {
      for (const ref of [guessMarkerRef, actualMarkerRef, errorLineRef]) {
        if (ref.current) {
          map.removeLayer(ref.current);
          ref.current = null;
        }
      }
    }
    setGuess(null);
    setSliderValue(50);
    setClueSliderValue(100);

    if (roundIndex < landmarks.length - 1) {
      setRoundIndex((i) => i + 1);
      setPhase("playing");
      setTimeout(() => {
        if (!mapRef.current) return;
        mapRef.current.setView(HERSHEY_CENTER, DEFAULT_ZOOM);
        mapRef.current.invalidateSize();
      }, 100);
    } else {
      setPhase("finished");
    }
  };

  const restart = () => {
    setRoundIndex(0);
    setScores([]);
    setDistances([]);
    setGuess(null);
    setSliderValue(50);
    setClueSliderValue(100);
    setPhase("intro");
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-[#fff8e7] text-[#3c2415] selection:bg-[#d4a574]/40">
      {/* Paper-grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="relative z-10 bg-[#3c2415] text-[#fff8e7] border-b-[6px] border-[#d4a574] shadow-lg">
        <div className="hhh-header-inner mx-auto max-w-[1280px] px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#d4a574] flex items-center justify-center text-[#3c2415] font-black text-[18px] tracking-tight">
              H
            </div>
            <div>
              <h1 className="font-black tracking-[0.12em] text-[16px] md:text-[20px] leading-none">
                HERSHEY HISTORY HUNT
              </h1>
              <p className="text-[11px] md:text-[12px] tracking-[0.22em] text-[#d4a574] font-bold -mt-0.5">
                WHERE WAS THIS?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="bg-[#fff8e7]/10 border border-[#d4a574]/30 rounded-full px-3 md:px-4 py-1.5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#d4a574]" />
              <span className="text-[12px] md:text-[13px] font-bold tracking-widest">
                {phase === "intro" || phase === "finished"
                  ? "READY"
                  : `${roundIndex + 1} / ${landmarks.length}`}
              </span>
            </div>
            <div className="bg-[#d4a574] text-[#3c2415] rounded-full px-3 md:px-5 py-1.5 flex items-center gap-2 font-black">
              <Award className="w-4 h-4" />
              <span className="text-[13px] md:text-[15px]">
                {phase === "intro" ? 0 : totalScore} PTS
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="hhh-main relative z-10 mx-auto max-w-[1280px] px-4 md:px-6 py-6 md:py-8">
        {phase === "intro" && (
          <div className="hhh-intro max-w-[760px] mx-auto">
            <div className="bg-white rounded-[24px] border border-[#d4a574]/40 shadow-[0_20px_60px_rgba(60,36,21,0.12)] overflow-hidden">
              <div className="h-2 w-full bg-gradient-to-r from-[#3c2415] via-[#d4a574] to-[#3c2415]" />
              <div className="hhh-intro-content p-7 md:p-10">
                <div className="inline-flex items-center gap-2 bg-[#fff8e7] border border-[#d4a574]/40 rounded-full px-4 py-1.5 mb-5">
                  <Camera className="w-4 h-4 text-[#3c2415]" />
                  <span className="text-[11px] font-bold tracking-[0.18em]">
                    VOLUNTEER EDITION • HERSHEY HISTORY CENTER
                  </span>
                </div>

                <h2 className="hhh-intro-title text-[32px] md:text-[44px] font-black leading-[0.95] tracking-tight">
                  Step into <span className="text-[#8b5a2b]">1910</span>,
                  <br />
                  find it today.
                </h2>

                <p className="mt-5 text-[17px] md:text-[18px] leading-relaxed text-[#3c2415]/80 max-w-[58ch]">
                  Look at the historic photo, then click on the map where you
                  think it was taken. You'll see what it looks like today and
                  learn the story.
                </p>

                <div className="hhh-intro-steps mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {INTRO_STEPS.map((step) => (
                    <div
                      key={step.n}
                      className="bg-[#fff8e7] rounded-2xl p-4 border border-[#d4a574]/30"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#3c2415] text-[#fff8e7] flex items-center justify-center font-black text-[12px]">
                        {step.n}
                      </div>
                      <div className="mt-2 font-bold text-[14px] tracking-wide">
                        {step.t}
                      </div>
                      <div className="text-[13px] leading-snug text-[#3c2415]/70 mt-1">
                        {step.d}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hhh-intro-actions mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={startHunt}
                    className="inline-flex items-center gap-2 bg-[#3c2415] text-[#fff8e7] hover:bg-[#2a190e] transition rounded-full px-7 py-3.5 font-black tracking-widest text-[13px] shadow-[0_8px_20px_rgba(60,36,21,0.25)]"
                  >
                    START HUNT <ArrowRight className="w-4 h-4" />
                  </button>
                  <div className="inline-flex items-center gap-2 text-[12px] text-[#3c2415]/60 px-2">
                    <Info className="w-4 h-4" /> {landmarks.length} historic
                    sites • No login needed • Works for older volunteers
                  </div>
                </div>

                <div className="hhh-intro-sites mt-8 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {landmarks.map((landmark) => (
                    <div
                      key={landmark.id}
                      className="rounded-xl border border-dashed border-[#d4a574]/50 bg-[#fff8e7]/70 px-3 py-2"
                    >
                      <div className="text-[10px] font-bold tracking-widest text-[#8b5a2b]">
                        {landmark.year}
                      </div>
                      <div className="text-[12px] font-bold leading-tight">
                        {landmark.shortTitle}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="hhh-intro-attribution text-center mt-4 text-[11px] tracking-widest text-[#3c2415]/40 font-bold">
              MADE FOR HERSHEY HISTORY CENTER • CHOCOLATE TOWN, PA
            </div>
          </div>
        )}

        {(phase === "playing" || phase === "result") && (
          <>
            <div className="hhh-game-header flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 bg-[#3c2415] text-[#fff8e7] rounded-full px-3 py-1 text-[11px] font-black tracking-widest">
                  <span className="w-5 h-5 rounded-full bg-[#d4a574] text-[#3c2415] grid place-items-center text-[11px]">
                    {roundIndex + 1}
                  </span>
                  {site.year.toUpperCase()}
                </span>
                <h2 className="font-black text-[16px] md:text-[20px] tracking-tight leading-none">
                  {site.title}
                </h2>
              </div>
              <div className="hidden md:flex items-center gap-2 text-[11px] font-bold tracking-widest text-[#3c2415]/60">
                <Navigation className="w-4 h-4" /> CLICK MAP TO PLACE PIN
              </div>
            </div>

            <div
              className={
                phase === "result"
                  ? "hhh-game-layout hhh-result-layout grid grid-cols-1 gap-5 items-start"
                  : "hhh-game-layout grid grid-cols-1 gap-5 items-start"
              }
            >
              <div className="hhh-game-content space-y-4">
                {phase === "playing" && (
                  <div className="rounded-[20px] overflow-hidden border-[6px] border-white shadow-[0_12px_32px_rgba(60,36,21,0.15)] bg-[#efe0c6]">
                    {hasPairedPhotos ? (
                      <ThenNowSlider
                        site={site}
                        value={clueSliderValue}
                        onChange={setClueSliderValue}
                        hint="DRAG TO SEE TODAY"
                        label="Reveal today's view of this site"
                        className="w-full bg-gradient-to-br from-[#d4a574] via-[#b88a5a] to-[#8b5a2b]"
                        style={{ height: "clamp(240px, 40vh, 460px)" }}
                      />
                    ) : (
                      <div
                        className="relative w-full bg-gradient-to-br from-[#d4a574] via-[#b88a5a] to-[#8b5a2b]"
                        style={{ height: "clamp(240px, 40vh, 460px)" }}
                      >
                        {site.thenImage && (
                          <img
                            src={site.thenImage}
                            alt={`Historic image of ${site.historicLabel}`}
                            className="absolute inset-0 h-full w-full object-cover sepia"
                          />
                        )}
                        <div
                          className="absolute inset-0 opacity-20 mix-blend-multiply"
                          style={{
                            backgroundImage:
                              "radial-gradient(circle at 30% 20%, #fff8e7 0%, transparent 40%), radial-gradient(circle at 80% 80%, #3c2415 0%, transparent 30%)",
                          }}
                        />
                        <div
                          className="absolute inset-0 bg-[#fff8e7]/10"
                          style={{ filter: "sepia(0.7) contrast(1.1)" }}
                        />
                        <div className="pointer-events-none absolute inset-0 rounded-[14px] shadow-[inset_0_0_120px_rgba(60,36,21,0.5)]" />
                      </div>
                    )}

                    <div className="bg-[#fff8e7] p-5 md:p-6 text-center">
                      <div className="inline-block bg-[#3c2415] text-[#fff8e7] text-[10px] font-black tracking-[0.2em] px-3 py-1 rounded-full mb-3">
                        HISTORIC PHOTO • {site.year.toUpperCase()}
                      </div>
                      <h3 className="font-black text-[24px] leading-tight text-[#3c2415]">
                        {site.historicLabel}
                      </h3>
                      <p className="mt-2 text-[12px] font-bold tracking-widest text-[#3c2415]/70">
                        {site.title.toUpperCase()}
                      </p>
                      <p className="mt-4 text-[13px] leading-relaxed text-[#3c2415]/80 italic max-w-[58ch] mx-auto">
                        "Glass plate negative — Hershey History Center
                        collection. Note the smokestacks and trolley line."
                      </p>
                      <div className="mt-4 pt-3 border-t border-[#d4a574]/30 flex justify-between text-[10px] font-bold tracking-widest text-[#3c2415]/60">
                        <span>© HERSHEY ARCHIVES</span>
                        <span>PLATE #{String(site.id).padStart(3, "0")}</span>
                      </div>
                    </div>
                  </div>
                )}

                {phase === "result" && (
                  <div className="rounded-[20px] overflow-hidden border border-[#d4a574]/40 bg-white shadow-[0_12px_32px_rgba(60,36,21,0.12)]">
                    <ThenNowSlider
                      site={site}
                      value={sliderValue}
                      onChange={setSliderValue}
                      className="hhh-result-image bg-gradient-to-br from-[#a8c686] via-[#d4a574] to-[#fff8e7]"
                      style={{
                        height: "clamp(150px, calc(45vh - 200px), 280px)",
                      }}
                    />

                    <div className="hhh-comparison-captions grid grid-cols-2 border-t border-[#d4a574]/30">
                      <div className="hhh-result-caption bg-[#fff8e7] text-center flex flex-col items-center justify-center">
                        <div className="bg-[#3c2415] text-[#fff8e7] text-[8px] font-black tracking-[0.12em] px-2 py-0.5 rounded-full mb-1.5">
                          THEN • {site.year}
                        </div>
                        <div className="font-black text-[15px] leading-tight text-[#3c2415]">
                          {site.historicLabel}
                        </div>
                      </div>
                      <div className="hhh-result-caption bg-white border-l border-[#d4a574]/30 text-center flex flex-col items-center justify-center">
                        <div className="bg-[#d4a574] text-[#3c2415] text-[8px] font-black tracking-[0.12em] px-2 py-0.5 rounded-full mb-1.5">
                          NOW • TODAY
                        </div>
                        <div className="font-black text-[15px] leading-tight text-[#3c2415]">
                          {site.modernLabel}
                        </div>
                      </div>
                    </div>

                    <div className="hhh-result-footer bg-[#fff8e7] border-t border-[#d4a574]/30 flex items-center justify-between">
                      <div className="text-[11px] font-bold tracking-widest text-[#3c2415]/70">
                        THEN &amp; NOW COMPARISON
                      </div>
                      <div className="text-[11px] font-bold tracking-widest text-[#3c2415]/40">
                        VOLUNTEER CONTRIBUTION ENABLED
                      </div>
                    </div>
                  </div>
                )}

                {phase === "result" && (
                  <div className="hhh-result-story bg-white rounded-[18px] border border-[#d4a574]/30 shadow-sm">
                    <div className="hhh-result-score flex flex-wrap items-center gap-3">
                      <div className="bg-[#3c2415] text-[#fff8e7] rounded-full px-4 py-2 font-black text-[13px] flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-[#d4a574]" />{" "}
                        {Math.round(lastDistance)}m AWAY
                      </div>
                      <div className="bg-[#d4a574] text-[#3c2415] rounded-full px-4 py-2 font-black text-[13px] flex items-center gap-2">
                        <Award className="w-4 h-4" /> +{lastPoints} POINTS
                      </div>
                      <div className="ml-auto text-[11px] font-bold tracking-widest text-[#3c2415]/50">
                        {ratingFor(lastDistance)}
                      </div>
                    </div>

                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="font-black text-[15px] tracking-widest">
                        THE STORY
                      </h4>
                      <button
                        onClick={() => setIsStoryExpanded(true)}
                        aria-label={`Read the full story of ${site.title}`}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d4a574]/50 bg-[#fff8e7] px-3 py-1 text-[10px] font-black tracking-widest text-[#3c2415] transition hover:bg-[#f2e3c4]"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> READ FULL STORY
                      </button>
                    </div>
                    <p className="hhh-story-preview text-[15px] leading-relaxed text-[#3c2415]/80">
                      {site.history}
                    </p>

                    <div className="hhh-result-next flex">
                      <button
                        onClick={nextSite}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-[#3c2415] text-[#fff8e7] hover:bg-[#2a190e] transition rounded-full px-7 py-3.5 font-black tracking-widest text-[13px]"
                      >
                        {roundIndex < landmarks.length - 1
                          ? "NEXT SITE"
                          : "SEE FINAL SCORE"}{" "}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="hhh-game-sidebar lg:sticky lg:top-6 space-y-4">
                <div
                  className={`hhh-map-card rounded-[20px] overflow-hidden border-[6px] border-white shadow-[0_12px_32px_rgba(60,36,21,0.15)] bg-[#e9dfc8] ${
                    isMapExpanded ? "hhh-map-expanded" : ""
                  }`}
                >
                  <div className="bg-[#3c2415] text-[#fff8e7] px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em]">
                      <MapPin className="w-4 h-4 text-[#d4a574]" /> HERSHEY, PA •
                      INTERACTIVE MAP
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block text-[10px] tracking-widest text-[#d4a574] font-bold whitespace-nowrap">
                        {isMapExpanded
                          ? "DERRY TOWNSHIP • ESC TO CLOSE"
                          : "ZOOM 14 • CLICK TO GUESS"}
                      </div>
                      <button
                        onClick={toggleMapExpanded}
                        aria-pressed={isMapExpanded}
                        aria-label={
                          isMapExpanded
                            ? "Shrink map back into the page"
                            : "Expand map to fill the screen"
                        }
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#d4a574] px-3 py-1 text-[10px] font-black tracking-widest text-[#3c2415] transition hover:bg-[#e6c89a]"
                      >
                        {isMapExpanded ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5" /> CLOSE
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5" /> EXPAND
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div
                    ref={mapContainerRef}
                    className="hhh-map-canvas w-full bg-[#d8cfb3]"
                    style={{ height: "clamp(240px, 40vh, 500px)" }}
                  />

                  {/* Fullscreen hides the sidebar, so the guess can be locked
                      in from here rather than shrinking the map first. */}
                  {isMapExpanded && phase === "playing" && (
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t-2 border-[#d4a574] bg-[#3c2415] px-4 py-3">
                      <div className="flex items-center gap-2 text-[12px] font-bold text-[#fff8e7]">
                        {guess ? (
                          <>
                            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#d4a574]" />
                            Pin at {guess.lat.toFixed(4)}, {guess.lng.toFixed(4)}
                            <span className="hidden md:inline text-[#fff8e7]/50">
                              — click again to move it
                            </span>
                          </>
                        ) : (
                          <>
                            <Info className="h-4 w-4 shrink-0 text-[#d4a574]" />
                            Tap anywhere on the map to drop your pin
                          </>
                        )}
                      </div>
                      <button
                        onClick={lockInFromExpandedMap}
                        disabled={!guess}
                        className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-black tracking-widest transition ${
                          guess
                            ? "bg-[#d4a574] text-[#3c2415] hover:bg-[#e6c89a]"
                            : "cursor-not-allowed border border-[#fff8e7]/20 bg-[#fff8e7]/10 text-[#fff8e7]/30"
                        }`}
                      >
                        LOCK IN GUESS <MapPin className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-[16px] border border-[#d4a574]/30 p-4 shadow-sm">
                  {phase === "playing" ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[11px] font-black tracking-[0.18em] text-[#3c2415]/60">
                          YOUR GUESS
                        </div>
                        <div className="text-[11px] font-bold text-[#8b5a2b]">
                          {guess
                            ? `${guess.lat.toFixed(4)}, ${guess.lng.toFixed(4)}`
                            : "No pin placed yet"}
                        </div>
                      </div>

                      {guess ? (
                        <div className="flex items-center gap-2 text-[12px] bg-[#fff8e7] border border-[#d4a574]/30 rounded-full px-3 py-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-[#3c2415]" />{" "}
                          Pin placed — you can click again to move it
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[12px] bg-[#fff8e7]/70 border border-dashed border-[#d4a574]/50 rounded-full px-3 py-2 mb-3 text-[#3c2415]/60">
                          <Info className="w-4 h-4" /> Tap anywhere on the map to
                          drop your chocolate pin
                        </div>
                      )}

                      <button
                        onClick={lockInGuess}
                        disabled={!guess}
                        className={`w-full rounded-full py-3.5 font-black tracking-widest text-[13px] transition flex items-center justify-center gap-2 ${
                          guess
                            ? "bg-[#3c2415] text-[#fff8e7] hover:bg-[#2a190e] shadow-[0_8px_18px_rgba(60,36,21,0.25)]"
                            : "bg-[#efe0c6] text-[#3c2415]/30 cursor-not-allowed border border-[#d4a574]/20"
                        }`}
                      >
                        LOCK IN GUESS <MapPin className="w-4 h-4" />
                      </button>

                      <div className="mt-3 flex items-center gap-2 text-[10px] font-bold tracking-widest text-[#3c2415]/40 justify-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-[#3c2415] border-2 border-[#fff8e7] inline-block" />{" "}
                          Your Guess
                        </span>
                        <span className="opacity-40">•</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-[#d4a574] border-2 border-[#3c2415] inline-block" />{" "}
                          Actual Site
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[11px] font-black tracking-[0.18em] text-[#3c2415]/60 mb-2">
                        RESULT REVEAL
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-[#fff8e7] rounded-xl border border-[#d4a574]/30 p-3">
                          <div className="text-[10px] font-bold tracking-widest text-[#3c2415]/50">
                            YOUR PIN
                          </div>
                          <div className="font-mono text-[11px] font-bold mt-1">
                            {guess?.lat.toFixed(5)}, {guess?.lng.toFixed(5)}
                          </div>
                        </div>
                        <div className="bg-[#3c2415] text-[#fff8e7] rounded-xl p-3">
                          <div className="text-[10px] font-bold tracking-widest text-[#d4a574]">
                            ACTUAL
                          </div>
                          <div className="font-mono text-[11px] font-bold mt-1">
                            {site.lat.toFixed(5)}, {site.lng.toFixed(5)}
                          </div>
                        </div>
                      </div>
                      <div className="h-[2px] w-full bg-gradient-to-r from-[#3c2415] via-[#d4a574] to-[#3c2415] rounded-full mb-3" />
                      <div className="text-[12px] leading-snug text-[#3c2415]/70">
                        Gold star = true location. Dashed line = your error. Pan
                        &amp; zoom to explore Hershey around the site.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {phase === "finished" && (
          <div className="hhh-finished max-w-[720px] mx-auto">
            <div className="bg-white rounded-[24px] border border-[#d4a574]/40 shadow-[0_20px_60px_rgba(60,36,21,0.14)] overflow-hidden">
              <div className="h-2 w-full bg-gradient-to-r from-[#3c2415] via-[#d4a574] to-[#3c2415]" />
              <div className="hhh-finished-content p-7 md:p-10 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-[#d4a574] text-[#3c2415] grid place-items-center mb-4">
                  <Award className="w-7 h-7" />
                </div>
                <h2 className="text-[28px] md:text-[36px] font-black tracking-tight leading-none">
                  Hunt Complete!
                </h2>
                <p className="mt-2 text-[13px] font-bold tracking-[0.18em] text-[#8b5a2b]">
                  YOU EXPLORED {landmarks.length} HISTORIC SITES
                </p>

                <div className="hhh-finished-score mt-7 bg-[#fff8e7] rounded-2xl border border-[#d4a574]/30 p-5">
                  <div className="text-[48px] font-black leading-none tracking-tight">
                    {totalScore}
                  </div>
                  <div className="text-[12px] font-black tracking-[0.2em] text-[#3c2415]/60 mt-1">
                    TOTAL POINTS / {landmarks.length * MAX_POINTS_PER_SITE} MAX
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2 text-left">
                    {landmarks.map((landmark, i) => (
                      <div
                        key={landmark.id}
                        className="bg-white rounded-xl border border-[#d4a574]/30 p-3"
                      >
                        <div className="text-[10px] font-bold tracking-widest text-[#8b5a2b]">
                          {landmark.year} • SITE {i + 1}
                        </div>
                        <div className="text-[12px] font-bold leading-tight mt-1 line-clamp-2">
                          {landmark.shortTitle}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold bg-[#3c2415] text-[#fff8e7] rounded-full px-2 py-0.5">
                            {Math.round(distances[i] || 0)}m
                          </span>
                          <span className="text-[11px] font-black text-[#8b5a2b]">
                            +{scores[i] || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hhh-finished-summary mt-6 text-[14px] leading-relaxed text-[#3c2415]/70 max-w-[52ch] mx-auto">
                  {summaryFor(totalScore)}
                </div>

                <div className="hhh-finished-actions mt-7 flex flex-col md:flex-row gap-3 justify-center">
                  <button
                    onClick={restart}
                    className="inline-flex items-center justify-center gap-2 bg-[#3c2415] text-[#fff8e7] rounded-full px-7 py-3.5 font-black tracking-widest text-[13px] hover:bg-[#2a190e] transition"
                  >
                    <RotateCcw className="w-4 h-4" /> PLAY AGAIN
                  </button>
                  <div className="inline-flex items-center justify-center gap-2 bg-[#fff8e7] border border-[#d4a574]/40 rounded-full px-5 py-3 text-[11px] font-bold tracking-widest text-[#3c2415]/60">
                    <Camera className="w-4 h-4" /> ASK VOLUNTEERS TO ADD TODAY
                    PHOTOS NEXT
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {isStoryExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Full story: ${site.title}`}
          onClick={() => setIsStoryExpanded(false)}
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#3c2415]/70 p-4 md:p-8"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="relative flex max-h-full w-full max-w-[820px] flex-col overflow-hidden rounded-[24px] bg-[#fff8e7] shadow-[0_30px_80px_rgba(60,36,21,0.45)]"
          >
            <div className="h-2 w-full shrink-0 bg-gradient-to-r from-[#3c2415] via-[#d4a574] to-[#3c2415]" />

            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#d4a574]/30 px-6 py-4 md:px-9 md:py-5">
              <div>
                <div className="text-[11px] font-black tracking-[0.2em] text-[#8b5a2b]">
                  {site.year.toUpperCase()} • THE STORY
                </div>
                <h3 className="mt-1 text-[22px] md:text-[28px] font-black leading-tight tracking-tight">
                  {site.title}
                </h3>
              </div>
              <button
                onClick={() => setIsStoryExpanded(false)}
                aria-label="Close the full story"
                className="shrink-0 rounded-full bg-[#3c2415] p-2 text-[#fff8e7] transition hover:bg-[#2a190e]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6 md:px-9 md:py-8">
              {storyParagraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className="mb-4 text-[16px] md:text-[17px] leading-relaxed text-[#3c2415]/85 last:mb-0"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#d4a574]/30 bg-white px-6 py-3 md:px-9 text-[11px] font-bold tracking-widest text-[#3c2415]/50">
              <span>HERSHEY HISTORY CENTER</span>
              <span className="hidden sm:inline">ESC TO CLOSE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
