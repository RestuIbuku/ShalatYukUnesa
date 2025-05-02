document.addEventListener('DOMContentLoaded', function() {
    // Inisialisasi tanggal dan kalender
    const today = new Date();
    updateCurrentDate(today);
    initHijriCalendar(today);
    
    // Event listener untuk tombol lokasi
    document.getElementById('location-btn').addEventListener('click', getUserLocation);
    
    // Event listener untuk navigasi bulan kalender Hijriah
    document.getElementById('prev-month').addEventListener('click', () => changeHijriMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeHijriMonth(1));
    
    // Coba dapatkan lokasi secara otomatis saat pertama kali load
    getUserLocation();
});

let currentHijriDate = {};
let currentMonth = 0;
let currentYear = 0;

// Fungsi untuk mengupdate tanggal saat ini
function updateCurrentDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('id-ID', options);
    document.getElementById('current-date').textContent = formattedDate;
}

// Fungsi untuk mendapatkan lokasi pengguna
function getUserLocation() {
    const locationInfo = document.getElementById('location-info');
    const locationBtn = document.getElementById('location-btn');
    
    locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mendeteksi lokasi...';
    locationBtn.disabled = true;
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                getCityName(latitude, longitude)
                    .then(city => {
                        locationInfo.textContent = `Lokasi: ${city}`;
                        getPrayerTimes(latitude, longitude);
                    })
                    .catch(error => {
                        locationInfo.textContent = 'Tidak dapat menentukan nama kota';
                        console.error('Error getting city name:', error);
                        getPrayerTimes(latitude, longitude);
                    });
            },
            error => {
                console.error('Error getting location:', error);
                locationInfo.textContent = 'Izin lokasi ditolak. Menggunakan lokasi default (Surabaya).';
                getPrayerTimes(-7.2575, 112.7521); // Koordinat Surabaya
            }
        );
    } else {
        locationInfo.textContent = 'Geolokasi tidak didukung browser. Menggunakan lokasi default (Surabaya).';
        getPrayerTimes(-7.2575, 112.7521); // Koordinat Surabaya
    }
    
    locationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Gunakan Lokasi Saya';
    locationBtn.disabled = false;
}

// Fungsi untuk mendapatkan nama kota dari koordinat
async function getCityName(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        return data.address.city || data.address.town || data.address.village || data.address.county || 'Lokasi Anda';
    } catch (error) {
        throw error;
    }
}

// Fungsi untuk mendapatkan jadwal salat
async function getPrayerTimes(lat, lng) {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    try {
        const response = await fetch(`https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=2`);
        const data = await response.json();
        
        if (data.code === 200) {
            const timings = data.data.timings;
            
            // Update waktu salat
            document.getElementById('fajr').textContent = timings.Fajr;
            document.getElementById('dhuhr').textContent = timings.Dhuhr;
            document.getElementById('asr').textContent = timings.Asr;
            document.getElementById('maghrib').textContent = timings.Maghrib;
            document.getElementById('isha').textContent = timings.Isha;
            
            // Hitung salat berikutnya
            calculateNextPrayer(timings);
        }
    } catch (error) {
        console.error('Error fetching prayer times:', error);
        document.getElementById('location-info').textContent += ' (Gagal mengambil jadwal salat)';
    }
}

// Fungsi untuk menghitung salat berikutnya
function calculateNextPrayer(timings) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const prayerTimes = [
        { name: 'Subuh', time: timings.Fajr },
        { name: 'Dzuhur', time: timings.Dhuhr },
        { name: 'Ashar', time: timings.Asr },
        { name: 'Maghrib', time: timings.Maghrib },
        { name: 'Isya', time: timings.Isha }
    ];
    
    // Konversi waktu salat ke menit sejak midnight
    const prayersInMinutes = prayerTimes.map(prayer => {
        const [hours, minutes] = prayer.time.split(':').map(Number);
        return {
            name: prayer.name,
            time: prayer.time,
            totalMinutes: hours * 60 + minutes
        };
    });
    
    // Temukan salat berikutnya
    let nextPrayer = null;
    for (const prayer of prayersInMinutes) {
        if (prayer.totalMinutes > currentTime) {
            nextPrayer = prayer;
            break;
        }
    }
    
    // Jika tidak ada salat berikutnya hari ini, gunakan Subuh besok
    if (!nextPrayer) {
        nextPrayer = {
            name: 'Subuh',
            time: 'besok',
            totalMinutes: 24 * 60 + prayersInMinutes[0].totalMinutes
        };
    }
    
    // Hitung waktu tersisa
    const timeLeft = nextPrayer.totalMinutes - currentTime;
    const hoursLeft = Math.floor(timeLeft / 60);
    const minutesLeft = timeLeft % 60;
    
    // Update UI
    const nextPrayerElement = document.getElementById('next-prayer');
    if (timeLeft > 0) {
        nextPrayerElement.innerHTML = `
            Salat ${nextPrayer.name} berikutnya pukul <strong>${nextPrayer.time}</strong>
            <br>(${hoursLeft > 0 ? hoursLeft + ' jam ' : ''}${minutesLeft} menit lagi)
        `;
    } else {
        nextPrayerElement.textContent = `Salat ${nextPrayer.name} sudah dimulai pukul ${nextPrayer.time}`;
    }
}

// Fungsi untuk inisialisasi kalender Hijriah
async function initHijriCalendar(date) {
    try {
        // Dapatkan tanggal Hijriah hari ini
        const response = await fetch(`https://api.aladhan.com/v1/gToH?date=${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`);
        const data = await response.json();
        
        if (data.code === 200) {
            currentHijriDate = data.data.hijri;
            currentMonth = parseInt(currentHijriDate.month.number);
            currentYear = parseInt(currentHijriDate.year);
            
            // Update tampilan tanggal Hijriah
            updateHijriDateDisplay(currentHijriDate);
            
            // Generate kalender
            generateHijriCalendar(currentMonth, currentYear);
        }
    } catch (error) {
        console.error('Error fetching Hijri date:', error);
    }
}

// Fungsi untuk generate kalender Hijriah
async function generateHijriCalendar(month, year) {
    try {
        // Dapatkan jumlah hari dalam bulan Hijriah
        const daysResponse = await fetch(`https://api.aladhan.com/v1/gToHCalendar/${month}/${year}`);
        const daysData = await daysResponse.json();
        
        if (daysData.code === 200) {
            const calendarData = daysData.data;
            const calendarElement = document.getElementById('hijri-calendar');
            const monthTitleElement = document.getElementById('current-month');
            
            // Daftar nama bulan Hijriah dalam bahasa Indonesia
            const hijriMonths = {
                1: 'Muharram',
                2: 'Shafar',
                3: 'Rabiul Awal',
                4: 'Rabiul Akhir',
                5: 'Jumadil Awal',
                6: 'Jumadil Akhir',
                7: 'Rajab',
                8: 'Sya\'ban',
                9: 'Ramadhan',
                10: 'Syawal',
                11: 'Dzulqaidah',
                12: 'Dzulhijjah'
            };
            
            // Set judul bulan
            monthTitleElement.textContent = `${hijriMonths[month]} ${year} H`;
            
            // Kosongkan kalender
            calendarElement.innerHTML = '';
            
            // Tambahkan header hari
            const daysOfWeek = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            daysOfWeek.forEach(day => {
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day calendar-day-header';
                dayElement.textContent = day;
                calendarElement.appendChild(dayElement);
            });
            
            // Temukan hari pertama bulan ini
            const firstDay = new Date(calendarData[0].gregorian.date);
            let startingDay = firstDay.getDay(); // 0 = Minggu, 1 = Senin, dst
            
            // Tambahkan sel kosong untuk hari sebelum bulan dimulai
            for (let i = 0; i < startingDay; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.className = 'calendar-day other-month-day';
                calendarElement.appendChild(emptyDay);
            }
            
            // Tambahkan hari-hari dalam bulan
            calendarData.forEach(day => {
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day';
                
                // Cek apakah hari ini
                const today = new Date();
                const currentGregorian = new Date(day.gregorian.date);
                if (today.getDate() === currentGregorian.getDate() && 
                    today.getMonth() === currentGregorian.getMonth() && 
                    today.getFullYear() === currentGregorian.getFullYear()) {
                    dayElement.classList.add('current-day');
                }
                
                dayElement.innerHTML = `
                    <div>${day.hijri.day}</div>
                    <small class="text-muted">${day.gregorian.day}</small>
                `;
                
                calendarElement.appendChild(dayElement);
            });
        }
    } catch (error) {
        console.error('Error generating Hijri calendar:', error);
    }
}
