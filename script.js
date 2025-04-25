let userLocation = {
    latitude: -7.6498,
    longitude: 111.3322,
    city: "Mendeteksi lokasi..."
};

let prayerTimes = {};

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation.latitude = position.coords.latitude;
                userLocation.longitude = position.coords.longitude;
                document.getElementById('coordinates').textContent =
                    `Koordinat: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`;

                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.latitude}&lon=${userLocation.longitude}&zoom=10`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.address) {
                            userLocation.city = data.address.city || data.address.town || data.address.village || data.address.county || "Lokasi Tidak Diketahui";
                            document.getElementById('current-location').textContent = userLocation.city;
                        }
                    }).catch(() => {
                        document.getElementById('current-location').textContent = "Lokasi terdeteksi (nama tidak tersedia)";
                    });

                fetchPrayerTimes();
            },
            () => {
                fallbackLocation();
            }
        );
    } else {
        fallbackLocation();
    }
}

function fallbackLocation() {
    document.getElementById('current-location').textContent = "Magetan, Jawa Timur (default)";
    document.getElementById('coordinates').textContent = `Koordinat: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`;
    fetchPrayerTimes();
}

function fetchPrayerTimes() {
    const now = new Date();
    const date = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    fetch(`https://api.aladhan.com/v1/timings/${date}-${month}-${year}?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&method=11`)
        .then(res => res.json())
        .then(data => {
            prayerTimes = data.data.timings;
            document.getElementById('fajr-time').textContent = prayerTimes.Fajr;
            document.getElementById('dhuhr-time').textContent = prayerTimes.Dhuhr;
            document.getElementById('asr-time').textContent = prayerTimes.Asr;
            document.getElementById('maghrib-time').textContent = prayerTimes.Maghrib;
            document.getElementById('isha-time').textContent = prayerTimes.Isha;
            document.getElementById('sunrise-time').textContent = prayerTimes.Sunrise;

            updateNextPrayer();
            setInterval(updateNextPrayer, 1000);
        })
        .catch(err => console.error("Gagal memuat jadwal salat:", err));
}

function updateNextPrayer() {
    const now = new Date();
    const prayers = [
        { name: "Subuh", time: prayerTimes.Fajr },
        { name: "Terbit", time: prayerTimes.Sunrise },
        { name: "Dzuhur", time: prayerTimes.Dhuhr },
        { name: "Ashar", time: prayerTimes.Asr },
        { name: "Maghrib", time: prayerTimes.Maghrib },
        { name: "Isya", time: prayerTimes.Isha }
    ];

    for (let prayer of prayers) {
        if (prayer.time) {
            const [h, m] = prayer.time.split(':').map(Number);
            const prayerDate = new Date();
            prayerDate.setHours(h, m, 0, 0);
            if (prayerDate > now) {
                const diff = prayerDate - now;
                const hours = Math.floor(diff / 1000 / 60 / 60);
                const minutes = Math.floor((diff / 1000 / 60) % 60);
                const seconds = Math.floor((diff / 1000) % 60);
                document.getElementById('prayer-countdown').textContent =
                    `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
                document.getElementById('next-prayer-name').textContent = `Menuju ${prayer.name}`;
                break;
            }
        }
    }
}

function pad(n) {
    return n.toString().padStart(2, '0');
}

document.getElementById("change-location").addEventListener("click", () => {
    getUserLocation();
});

window.onload = () => {
    getUserLocation();
};
