document.addEventListener("DOMContentLoaded", () => {
    const map = L.map("map").setView([51.505, -0.09], 13);

    // Load OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    let userLocation;
    let markers = [];
    let routeLayer;

    // Get User Location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = [position.coords.latitude, position.coords.longitude];
                map.setView(userLocation, 14);

                // Add Marker for User Location
                L.marker(userLocation).addTo(map)
                    .bindPopup("📍 You are here")
                    .openPopup();
            },
            () => alert("❌ Location access denied! Enable location to see nearby places.")
        );
    } else {
        alert("❌ Geolocation is not supported by this browser.");
    }

    // Function to send emergency message via WhatsApp
    function sendWhatsAppLocation() {
        if (!userLocation) {
            alert("❌ Location not available! Enable location services.");
            return;
        }

        let lat = userLocation[0];
        let lon = userLocation[1];
        let locationLink = `https://maps.google.com/?q=${lat},${lon}`;

        let emergencyMessage = `🚨 EMERGENCY ALERT! 🚨\nI need immediate assistance. My live location:\n${locationLink}`;

        let policeNumber = "+919500420634";   // Updated Police number
        let ambulanceNumber = "+917671952358"; // Ambulance number

        // Send WhatsApp message with location
        sendWhatsAppMessage(policeNumber, emergencyMessage);
        sendWhatsAppMessage(ambulanceNumber, emergencyMessage);

        alert("🚨 SOS Activated! Live location sent to Police & Ambulance via WhatsApp.");
    }

    // Function to send WhatsApp message
    function sendWhatsAppMessage(phoneNumber, message) {
        let whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappLink, "_blank");
    }

    // Function to fetch and display nearby hospitals/police stations
    function fetchNearbyPlaces(type, emoji) {
        if (!userLocation) {
            alert("❌ Location not available! Please enable location services.");
            return;
        }

        let query = `
            [out:json];
            node["amenity"="${type}"](around:25000, ${userLocation[0]}, ${userLocation[1]});
            out;
        `;
        let url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                clearMarkers(); // Clear previous markers

                if (data.elements.length === 0) {
                    alert(`❌ No nearby ${type}s found within 25 km.`);
                    return;
                }

                let locationOptions = "";

                data.elements.forEach((element) => {
                    let lat = element.lat;
                    let lon = element.lon;
                    let name = element.tags.name || `${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
                    
                    let marker = L.marker([lat, lon])
                        .addTo(map)
                        .bindPopup(`${emoji} ${name}`);
                    markers.push(marker);

                    locationOptions += `<option value="${lat},${lon}">${name}</option>`;
                });

                showLocationSelector(locationOptions, type);
            })
            .catch(() => alert("❌ Error fetching nearby locations. Try again later."));
    }

    // Function to show location selector with direct call options
    function showLocationSelector(options, type) {
        const selectorDiv = document.createElement("div");
        selectorDiv.innerHTML = `
            <label for="locationSelect">Select a ${type} to navigate:</label>
            <select id="locationSelect">${options}</select>
            <button id="navigateButton">🚗 Navigate</button>
        `;
        selectorDiv.style.position = "fixed";
        selectorDiv.style.bottom = "20px";
        selectorDiv.style.left = "50%";
        selectorDiv.style.transform = "translateX(-50%)";
        selectorDiv.style.padding = "10px";
        selectorDiv.style.backgroundColor = "black";
        selectorDiv.style.color = "white";
        selectorDiv.style.border = "1px solid white";
        selectorDiv.style.borderRadius = "10px";
        document.body.appendChild(selectorDiv);

        document.getElementById("navigateButton").addEventListener("click", () => {
            const selectedData = document.getElementById("locationSelect").value.split(",");
            const destLat = parseFloat(selectedData[0]);
            const destLon = parseFloat(selectedData[1]);
            calculateShortestRoute(destLat, destLon);
            document.body.removeChild(selectorDiv);
        });
    }

    // Function to clear previous markers
    function clearMarkers() {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        if (routeLayer) {
            map.removeLayer(routeLayer);
        }
    }

    // Function to calculate shortest route
    function calculateShortestRoute(destLat, destLon) {
        if (!userLocation) {
            alert("❌ Cannot calculate route without location access.");
            return;
        }

        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${destLon},${destLat}?overview=full&geometries=geojson`;

        fetch(routeUrl)
            .then(response => response.json())
            .then(data => {
                if (data.routes.length === 0) {
                    alert("❌ No available route found.");
                    return;
                }

                if (routeLayer) {
                    map.removeLayer(routeLayer);
                }

                const route = data.routes[0].geometry;
                routeLayer = L.geoJSON(route, {
                    style: { color: "blue", weight: 4 }
                }).addTo(map);

                map.fitBounds(L.geoJSON(route).getBounds());
                alert("🚗 Route displayed! Follow the blue line to reach your destination.");
            })
            .catch(() => alert("❌ Error calculating the route. Try again later."));
    }

    // Emergency Button Actions
    document.getElementById("sosButton").addEventListener("click", () => {
        sendWhatsAppLocation();
    });

    document.getElementById("medicalButton").addEventListener("click", () => {
        fetchNearbyPlaces("hospital", "🏥");
    });

    document.getElementById("policeButton").addEventListener("click", () => {
        fetchNearbyPlaces("police", "🚔");
    });
});