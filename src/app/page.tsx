"use client";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-date-range";
import { motion } from "framer-motion";
import { addDays, format } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Flight = {
  minPrice: any;
  iataCode: string;
  logoUrl: string | undefined;
  name: any;
  id: string;
  airline: string;
  logo: string; // ✅ Logo URL
  price: number;
};

type FlightRoute = {
  from: string;
  to: string;
};
export default function Home() {
  const [locations, setLocations] = useState<string[]>([""]);
  const [dateRanges, setDateRanges] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 3),
      key: "selection",
    },
  ]);
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightDestination, setFlightDestination] = useState<FlightRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itineraryRef = useRef<HTMLDivElement | null>(null);
  const flightsRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const scrollByAmount = 200; // how much to scroll on button click

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -scrollByAmount, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: scrollByAmount, behavior: "smooth" });
    }
  };

  // Auto-scroll effect
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollBy({ left: 1, behavior: "smooth" });
      }
    }, 30); // adjust for slower scroll
    return () => clearInterval(interval);
  }, [isHovered]);
  const useAutoScroll = (
    ref: React.RefObject<HTMLDivElement>,
    scrollAmount = 320,
    delay = 3500
  ) => {
    useEffect(() => {
      if (!ref.current) return;
      const element = ref.current;

      const intervalId = setInterval(() => {
        if (element.scrollLeft + element.clientWidth >= element.scrollWidth) {
          element.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          element.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
      }, delay);

      return () => clearInterval(intervalId);
    }, [ref, scrollAmount, delay]);
  };

  useAutoScroll(itineraryRef);
  useAutoScroll(flightsRef);

  const handleAddLocation = () => {
    setLocations([...locations, ""]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setItinerary(null);
    setFlights([]);

    try {
      const locationsAndDates = locations?.map((loc) => ({
        location: loc,
        from: format(dateRanges[0].startDate!, "yyyy-MM-dd"),
        to: format(dateRanges[0].endDate!, "yyyy-MM-dd"),
      }));

      const response = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: locationsAndDates }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error("Failed to generate itinerary. Please try again.");
      }

      const itineraryDetails = data.itinerary
        ?.map((day: string) => day.replace(/[*_`]/g, "").trim())
        .join("\n\n");

      setItinerary(itineraryDetails);
      if (Array.isArray(data.flightData)) {
        setFlightDestination(data?.flightData);
        setFlights(data.flightData[0]?.airlines);
        console.log("data", data);
        console.log("dataFLight", data?.flightData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled =
    loading || locations.every((loc) => loc.trim() === "");

  return (
    <div className="h-screen px-4 py-6 sm:py-6 bg-gradient-to-br from-[#c9d6ff] to-[#e2e2e2] overflow-hidden">
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 font-sans h-full">
        {/* Left: Form Input */}
        <div className="bg-white/30 backdrop-blur-lg p-6 sm:p-8 rounded-3xl shadow-2xl w-full h-[calc(100vh-4rem)] overflow-y-auto">
          <h1 className="text-3xl font-bold text-blue-700 text-center sm:text-left">
            Itinerary Generator
          </h1>
          <p className="text-sm text-gray-700 text-center sm:text-left">
            Enter your locations and date range to generate a personalized
            itinerary.
          </p>
          <div className="mt-6 space-y-3">
            <p className="text-sm text-gray-600 italic mb-2">
              Tip: You can drag and drop to reorder your locations.
            </p>
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination) return;
                const reordered = Array.from(locations);
                const [removed] = reordered.splice(result.source.index, 1);
                reordered.splice(result.destination.index, 0, removed);
                setLocations(reordered);
              }}
            >
              <Droppable droppableId="locations">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {locations?.map((loc, index) => (
                      <Draggable
                        key={index}
                        draggableId={`location-${index}`}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2"
                          >
                            <input
                              type="text"
                              className="p-2 border border-gray-300 rounded-lg w-full text-black focus:ring-2 focus:ring-blue-400 focus:outline-none"
                              placeholder={`Location ${index + 1}`}
                              value={loc}
                              onChange={(e) => {
                                const updated = [...locations];
                                updated[index] = e.target.value;
                                setLocations(updated);
                              }}
                            />
                            {locations.length > 1 && (
                              <button
                                onClick={() => {
                                  const updated = locations.filter(
                                    (_, i) => i !== index
                                  );
                                  setLocations(updated);
                                }}
                                className="text-red-500 hover:text-red-700 text-lg font-bold px-2"
                                title="Remove Location"
                              >
                                ❌
                              </button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <button
              onClick={handleAddLocation}
              className="text-sm mt-2 sm:text-base bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg px-4 py-2 transition"
            >
              + Add Another Location
            </button>
          </div>
          <div className="mt-6 w-full">
            <label className="block font-medium text-gray-700 mb-2">
              Select Date Range
            </label>
            <DateRange
              editableDateInputs={true}
              onChange={(item) => setDateRanges([item.selection])}
              moveRangeOnFirstSelection={false}
              ranges={dateRanges}
              className="rounded shadow"
            />
          </div>
          <button
            onClick={handleSubmit}
            className={`mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-all
              ${
                isButtonDisabled
                  ? "opacity-50 cursor-not-allowed hover:bg-green-600"
                  : ""
              }
            `}
            disabled={isButtonDisabled}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                Generating{" "}
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1,
                    ease: "linear",
                  }}
                  className="inline-block"
                >
                  🧊
                </motion.span>
              </span>
            ) : (
              "Generate Itinerary"
            )}
          </button>
          {error && (
            <div className="mt-4 text-red-600">
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Right: Generated Itinerary & Flights */}
        <div className="bg-white/20 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-2xl w-full border border-white/30 h-[calc(100vh-4rem)] overflow-y-auto">
          {itinerary ? (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <h2 className="text-2xl font-semibold italic mb-6 text-blue-700">
                Your Generated Itinerary:
              </h2>

              <div ref={itineraryRef}>
                {itinerary.split(/\n(?=Day \d+)/)?.map((dayBlock, index) => {
                  const [headingLine, ...detailsLines] = dayBlock.split("\n");
                  return (
                    <div key={index} className="mb-8">
                      <h3 className="text-lg font-semibold italic text-blue-800 mb-2">
                        {headingLine.trim()}
                      </h3>
                      <ul className="list-disc list-inside text-gray-800 space-y-1">
                        {detailsLines
                          ?.filter((line) => line.trim() !== "")
                          ?.map((line, idx) => (
                            <li key={idx}>{line.trim()}</li>
                          ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div
                className="relative mt-10"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <h3 className="text-xl font-semibold text-blue-800 mb-4">
                  Suggested Flights
                </h3>

                {/* Scroll buttons */}
                {isHovered && (
                  <>
                    <button
                      onClick={scrollLeft}
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow p-1 rounded-full"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={scrollRight}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow p-1 rounded-full"
                    >
                      <ChevronRight className="h-5 w-5 " />
                    </button>
                  </>
                )}

                <div className="overflow-hidden">
                  <div
                    ref={scrollRef}
                    className="flex space-x-4 overflow-x-auto pb-2 hide-scrollbar scroll-smooth"
                  >
                    {flights?.map((flight) => (
                      <div
                        key={flight.id}
                        className="min-w-[300px] bg-gray-300 rounded-xl shadow-md p-4 border border-gray-200"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <img
                            src={flight?.logoUrl}
                            alt={`${flight?.name} logo`}
                            className="h-8 w-auto object-contain"
                          />
                          <span className="text-blue-700 font-semibold">
                            {flight?.name} ({flight?.iataCode})
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">
                          {flight.from} → {flight.to}
                        </p>
                        <p className="mt-2 text-green-700 font-bold">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 2,
                          }).format(
                            flight?.minPrice.units +
                              flight?.minPrice.nanos / 1_000_000_000
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="text-gray-600 text-center italic mt-10">
              Your generated itinerary will appear here after submission.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
