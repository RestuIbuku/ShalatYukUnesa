// Variabel untuk menyimpan data lokasi dan jadwal salat
let userLocation = {
    latitude: -7.6498,  // Default ke koordinat Magetan
    longitude: 111.3322,
    city: "Mendeteksi lokasi..."
};

let prayerTimes = {};
let nextPrayer = {};

// Fungsi untuk mengambil lokasi pengguna
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation.latitude = position.coords.latitude;
                userLocation.longitude = position.coords.longitude;
                document.getElementById('coordinates').textContent = `Koordinat: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`;
                
                // Mengambil nama kota berdasarkan koordinat (reverse geocoding)
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.latitude}&lon=${userLocation.longitude}&zoom=10`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.address) {
                            userLocation.city = data.address.city || data.address.town || data.address.village || data.address.county || "Lokasi Tidak Diketahui";
                            document.getElementById('current-location').textContent = userLocation.city;
                        }
                    })
                    .catch(error => {
                        console.error("Error getting location name:", error);
                        document.getElementById('current-location').textContent = "Lokasi terdeteksi (nama tidak tersedia)";
                    });
                
                fetchPrayerTimes();
                initMap();
            },
            (error) => {
                console.error("Error getting location:", error);
                document.getElementById('current-location').textContent = "Magetan, Jawa Timur (default)";
                document.getElementById('coordinates').textContent = `Koordinat: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`;
                fetchPrayerTimes();
                initMap();
            }
        );
    } else {
        document.getElementById('current-location').textContent = "Geolokasi tidak didukung oleh browser Anda";
        fetchPrayerTimes();
    }
}

// Fungsi untuk mengambil jadwal salat dari API
function fetchPrayerTimes() {
    const today = new Date();
    const date = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    
    fetch(`https://api.aladhan.com/v1/timings/${date}-${month}-${year}?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&method=11`)
        .then(response => response.json())
        .then(data => {
            if (data.data && data.data.timings) {
                prayerTimes = data.data.timings;
                
                // Memperbarui jadwal salat di UI
                document.getElementById('fajr-time').textContent = prayerTimes.Fajr;
                document.getElementById('dhuhr-time').textContent = prayerTimes.Dhuhr;
                document.getElementById('asr-time').textContent = prayerTimes.Asr;
                document.getElementById('maghrib-time').textContent = prayerTimes.Maghrib;
                document.getElementById('isha-time').textContent = prayerTimes.Isha;
                document.getElementById('sunrise-time').textContent = prayerTimes.Sunrise;
                
                updateNextPrayer();
                setInterval(updateNextPrayer, 1000);
            }
        })
        .catch(error => {
            console.error("Error fetching prayer times:", error);
        });
}

// Fungsi untuk mengupdate hitung mundur ke waktu salat berikutnya
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
    
    // Konversi waktu salat hari ini ke objek Date
    prayers.forEach(prayer => {
        if (prayer.time) {
            const [hour, minute] = prayer.time.split(':').map(Number);
            const prayerTime = new Date();
            prayerTime.setHours(hour, minute, 0, 0);
            prayer.date = prayerTime;
        }
    });
    
    // Cari waktu salat berikutnya
    let nextPrayer = null;
    for (const prayer of prayers) {
        if (prayer.date && prayer.date > now) {
            nextPrayer = prayer;
            break;
        }
    }
    
    // Jika tidak ada waktu salat yang tersisa hari ini, ambil waktu subuh besok
    if (!nextPrayer && prayers[0].date) {
        nextPrayer = prayers[0];
        nextPrayer.date = new Date(prayers[0].date);
        nextPrayer.date.setDate(nextPrayer.date.getDate() + 1);
    }
    
    // Update UI dengan waktu salat berikutnya
    if (nextPrayer) {
        const diff = nextPrayer.date - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('prayer-countdown').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('next-prayer-name').textContent = `${nextPrayer.name}: ${nextPrayer.time}`;
    }
}

// Fungsi untuk menampilkan kalender Hijriah
function displayHijriCalendar() {
    // Dapatkan tanggal Hijriah hari ini
    const today = moment();
    const hijriToday = today.clone().iHijri();
    const hijriMonth = hijriToday.iMonth();
    const hijriYear = hijriToday.iYear();
    const hijriDay = hijriToday.iDate();
    
    // Tampilkan tanggal Gregorian dan Hijriah
    const gregorianFormatted = today.format('dddd, D MMMM YYYY');
    const hijriMonthName = hijriToday.format('iMMMM');
    const hijriFormatted = `${hijriDay} ${hijriMonthName} ${hijriYear} H`;
    
    document.getElementById('gregorian-date').textContent = gregorianFormatted;
    document.getElementById('hijri-date').textContent = hijriFormatted;
    
    // Buat kalender Hijriah untuk bulan ini
    const firstDayOfMonth = moment().iHijri().startOf('iMonth');
    const daysInMonth = moment().iHijri().daysInMonth();
    
    // Mendapatkan hari pertama dalam minggu (0 = Minggu, 1 = Senin, dst)
    const firstDayOfWeek = firstDayOfMonth.day();
    
    let calendarHTML = '';
    let dayCount = 1;
    let weekCount = 0;
    
    // Buat baris-baris kalender
    while (dayCount <= daysInMonth) {
        calendarHTML += '<tr>';
        
        // Isi sel-sel dalam minggu
        for (let i = 0; i < 7; i++) {
            if ((weekCount === 0 && i < firstDayOfWeek) || dayCount > daysInMonth) {
                calendarHTML += '<td></td>';
            } else {
                // Tandai hari ini
                const isToday = dayCount === hijriDay;
                calendarHTML += `<td class="${isToday ? 'bg-success text-white' : ''}">${dayCount}</td>`;
                dayCount++;
            }
        }
        
        calendarHTML += '</tr>';
        weekCount++;
        
        // Jika sudah mencapai akhir bulan, hentikan loop
        if (dayCount > daysInMonth) {
            break;
        }
    }
    
    document.getElementById('hijri-calendar-body').innerHTML = calendarHTML;
}

// Fungsi untuk menginisialisasi peta
function initMap() {
    // Buat elemen peta sederhana dengan OpenStreetMap
    const mapElement = document.getElementById('map');
    mapElement.innerHTML = `
        <div style="width:100%;height:100%;position:relative;">
            <iframe 
                width="100%" 
                height="100%" 
                frameborder="0" 
                scrolling="no" 
                marginheight="0" 
                marginwidth="0"
                src="https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.longitude - 0.01}%2C${userLocation.latitude - 0.01}%2C${userLocation.longitude + 0.01}%2C${userLocation.latitude + 0.01}&amp;layer=mapnik&amp;marker=${userLocation.latitude}%2C${userLocation.longitude}"
                style="border:0;border-radius:10px;">
            </iframe>
        </div>
    `;
}

// Tombol untuk memperbarui lokasi
document.getElementById('change-location').addEventListener('click', getUserLocation);

// Inisialisasi ketika halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    getUserLocation();
    displayHijriCalendar();
});
