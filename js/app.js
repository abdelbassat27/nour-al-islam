/* ===== نور الإسلام - التطبيق الرئيسي ===== */

// ---------- Utilities ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function storage(key, value) {
    if (value === undefined) {
        try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
    }
    localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Theme ----------
const themeToggle = $('#themeToggle');
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    storage('theme', theme);
}
themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
});
applyTheme(storage('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

// ---------- Mobile Nav ----------
$('#menuToggle')?.addEventListener('click', () => {
    $('#mainNav').classList.toggle('open');
});
$$('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        $$('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        $('#mainNav').classList.remove('open');
    });
});

// Feature cards navigation
$$('.feature-card').forEach(card => {
    card.addEventListener('click', () => {
        const target = card.dataset.target;
        if (target) document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
    });
});

// ---------- Daily Ayah ----------
async function loadDailyAyah() {
    try {
        const randomAyah = Math.floor(Math.random() * 6236) + 1;
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah}/ar.alafasy`);
        const data = await res.json();
        if (data.code === 200) {
            const a = data.data;
            $('#dailyAyahText').textContent = a.text;
            $('#dailyAyahMeta').textContent = `${a.surah.name} • آية ${a.numberInSurah} • جزء ${a.juz}`;
        }
    } catch (e) {
        $('#dailyAyahText').textContent = 'إِنَّ مَعَ الْعُسْرِ يُسْرًا';
        $('#dailyAyahMeta').textContent = 'سورة الشرح • آية 6';
    }
}
$('#newAyahBtn')?.addEventListener('click', loadDailyAyah);
loadDailyAyah();

// ---------- Quran ----------
let surahsList = [];
let currentAudio = null;

async function loadSurahsList() {
    try {
        const res = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await res.json();
        if (data.code === 200) {
            surahsList = data.data;
            const select = $('#surahSelect');
            select.innerHTML = surahsList.map(s => 
                `<option value="${s.number}">${s.number}. ${s.name} (${s.englishName}) - ${s.numberOfAyahs} آية</option>`
            ).join('');
        }
    } catch (e) {
        console.error('Surahs load error', e);
    }
}

async function loadSurah() {
    const surahNum = $('#surahSelect').value;
    const edition = $('#editionSelect').value;
    const translation = $('#translationSelect').value;
    const content = $('#quranContent');
    content.innerHTML = '<div class="placeholder">جاري التحميل...</div>';

    try {
        let url = `https://api.alquran.cloud/v1/surah/${surahNum}/${edition}`;
        if (translation !== 'none') {
            url = `https://api.alquran.cloud/v1/surah/${surahNum}/${edition},${translation}`;
        }
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === 200) {
            let surahData, translationData;
            if (Array.isArray(data.data)) {
                surahData = data.data[0];
                translationData = data.data[1];
            } else {
                surahData = data.data;
            }

            let html = `
                <div class="surah-header">
                    <h3>${surahData.name}</h3>
                    <p>${surahData.englishName} • ${surahData.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} • ${surahData.numberOfAyahs} آية</p>
                </div>
            `;

            surahData.ayahs.forEach((ayah, i) => {
                const transText = translationData ? translationData.ayahs[i].text : '';
                html += `
                    <div class="ayah-item" data-ayah="${ayah.number}">
                        <span class="ayah-number">${ayah.numberInSurah}</span>
                        <button class="ayah-play" data-ref="${ayah.number}" title="تشغيل">🔊</button>
                        <div class="ayah-arabic">${ayah.text}</div>
                        ${transText ? `<div class="ayah-translation">${transText}</div>` : ''}
                    </div>
                `;
            });
            content.innerHTML = html;

            // Per-ayah play
            $$('.ayah-play').forEach(btn => {
                btn.addEventListener('click', () => playAyah(btn.dataset.ref));
            });
        }
    } catch (e) {
        content.innerHTML = '<div class="placeholder">حدث خطأ في التحميل. تحقق من الاتصال.</div>';
    }
}

async function playAyah(ayahNumber) {
    const reciter = $('#reciterSelect').value;
    const audio = $('#quranAudio');
    const player = $('#audioPlayer');
    try {
        // CDN for ayah audio
        const url = `https://cdn.islamic.network/quran/audio/128/${reciter}/${ayahNumber}.mp3`;
        audio.src = url;
        player.classList.remove('hidden');
        $('#audioInfo').textContent = `آية رقم ${ayahNumber}`;
        await audio.play();
    } catch (e) {
        alert('تعذر تشغيل الصوت');
    }
}

async function playFullSurah() {
    const surahNum = $('#surahSelect').value;
    const reciter = $('#reciterSelect').value;
    const audio = $('#quranAudio');
    const player = $('#audioPlayer');
    try {
        // Surah full audio from CDN
        const url = `https://cdn.islamic.network/quran/audio-surah/128/${reciter}/${surahNum}.mp3`;
        audio.src = url;
        player.classList.remove('hidden');
        const surah = surahsList.find(s => s.number == surahNum);
        $('#audioInfo').textContent = `تلاوة كاملة: ${surah ? surah.name : 'السورة ' + surahNum}`;
        await audio.play();
    } catch (e) {
        // Fallback: play first ayah
        alert('التلاوة الكاملة غير متاحة لهذا القارئ، جرب قارئاً آخر أو شغّل آية بآية');
    }
}

$('#loadSurahBtn')?.addEventListener('click', loadSurah);
$('#playSurahBtn')?.addEventListener('click', playFullSurah);
$('#stopAudioBtn')?.addEventListener('click', () => {
    const audio = $('#quranAudio');
    audio.pause();
    audio.currentTime = 0;
});

// Search
$('#searchBtn')?.addEventListener('click', async () => {
    const q = $('#quranSearch').value.trim();
    if (!q) return;
    const content = $('#quranContent');
    content.innerHTML = '<div class="placeholder">جاري البحث...</div>';
    try {
        const res = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(q)}/all/quran-uthmani`);
        const data = await res.json();
        if (data.code === 200 && data.data.matches?.length) {
            let html = `<div class="surah-header"><h3>نتائج البحث عن: ${q}</h3><p>${data.data.matches.length} نتيجة</p></div>`;
            data.data.matches.slice(0, 30).forEach(m => {
                html += `
                    <div class="ayah-item">
                        <span class="ayah-number">${m.numberInSurah}</span>
                        <div class="ayah-arabic">${m.text}</div>
                        <div class="ayah-translation">${m.surah.name} • آية ${m.numberInSurah}</div>
                    </div>
                `;
            });
            content.innerHTML = html;
        } else {
            content.innerHTML = '<div class="placeholder">لا توجد نتائج</div>';
        }
    } catch {
        content.innerHTML = '<div class="placeholder">خطأ في البحث</div>';
    }
});

loadSurahsList();

// ---------- Prayer Times ----------
let prayerTimesData = null;
let countdownInterval = null;

const prayerNamesAr = {
    Fajr: 'الفجر',
    Sunrise: 'الشروق',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء'
};

async function getPrayerTimes(city, country, method = 4) {
    try {
        const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`);
        const data = await res.json();
        if (data.code === 200) {
            prayerTimesData = data.data;
            renderPrayerTimes(data.data);
            startCountdown(data.data.timings);
            return true;
        }
    } catch (e) {
        console.error(e);
    }
    return false;
}

function renderPrayerTimes(data) {
    const timings = data.timings;
    const grid = $('#prayerTimes');
    const order = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const now = new Date();
    let nextKey = null;

    // Find next prayer
    for (const key of order) {
        if (key === 'Sunrise') continue;
        const [h, m] = timings[key].split(':').map(Number);
        const t = new Date();
        t.setHours(h, m, 0, 0);
        if (t > now) {
            nextKey = key;
            break;
        }
    }
    if (!nextKey) nextKey = 'Fajr';

    grid.innerHTML = order.map(key => `
        <div class="prayer-card ${key === nextKey ? 'next' : ''}">
            <div class="name">${prayerNamesAr[key] || key}</div>
            <div class="time">${timings[key]}</div>
        </div>
    `).join('');

    $('#nextPrayerName').textContent = prayerNamesAr[nextKey] || nextKey;
}

function startCountdown(timings) {
    if (countdownInterval) clearInterval(countdownInterval);
    const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    function update() {
        const now = new Date();
        let nextTime = null;
        let nextName = '';

        for (const key of order) {
            const [h, m] = timings[key].split(':').map(Number);
            const t = new Date();
            t.setHours(h, m, 0, 0);
            if (t > now) {
                nextTime = t;
                nextName = prayerNamesAr[key];
                break;
            }
        }
        // If all passed, next is Fajr tomorrow
        if (!nextTime) {
            const [h, m] = timings.Fajr.split(':').map(Number);
            nextTime = new Date();
            nextTime.setDate(nextTime.getDate() + 1);
            nextTime.setHours(h, m, 0, 0);
            nextName = 'الفجر';
        }

        $('#nextPrayerName').textContent = nextName;
        const diff = nextTime - now;
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        $('#nextPrayerCountdown').textContent = 
            `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    }
    update();
    countdownInterval = setInterval(update, 1000);
}

$('#getPrayerBtn')?.addEventListener('click', () => {
    const city = $('#cityInput').value.trim() || 'مكة';
    const country = $('#countryInput').value.trim() || 'السعودية';
    const method = $('#methodSelect').value;
    getPrayerTimes(city, country, method);
});

$('#useLocationBtn')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('المتصفح لا يدعم تحديد الموقع');
        return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
            const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=${$('#methodSelect').value}`);
            const data = await res.json();
            if (data.code === 200) {
                prayerTimesData = data.data;
                renderPrayerTimes(data.data);
                startCountdown(data.data.timings);
                $('#cityInput').value = 'موقعي الحالي';
                $('#countryInput').value = '';
            }
        } catch {
            alert('تعذر جلب المواقيت');
        }
    }, () => alert('لم يتم السماح بالوصول للموقع'));
});

// Adhan players
$$('.adhan-play').forEach(btn => {
    btn.addEventListener('click', () => {
        const audio = $('#adhanAudio');
        audio.src = btn.dataset.src;
        audio.play().catch(() => alert('تعذر تشغيل الأذان'));
    });
});
$('#stopAdhanBtn')?.addEventListener('click', () => {
    const audio = $('#adhanAudio');
    audio.pause();
    audio.currentTime = 0;
});

// Default prayer times on load
getPrayerTimes('مكة', 'السعودية', 4);

// ---------- Tasbih ----------
let count = 0;
let target = 33;
let dailyStats = storage('tasbihStats') || { total: 0, rounds: 0, byDhikr: {} };

function updateTasbihUI() {
    $('#countDisplay').textContent = count;
    $('#targetDisplay').textContent = target;
    $('#currentDhikr').textContent = $('#dhikrSelect').value;
    
    const progress = Math.min(count / target, 1);
    const circle = $('#progressCircle');
    const circumference = 2 * Math.PI * 54;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference * (1 - progress);

    $('#totalToday').textContent = dailyStats.total;
    $('#roundsToday').textContent = dailyStats.rounds;

    const topList = $('#topDhikrList');
    const sorted = Object.entries(dailyStats.byDhikr || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    topList.innerHTML = sorted.map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join('') || '<li>لا توجد بيانات بعد</li>';
}

$('#countBtn')?.addEventListener('click', () => {
    count++;
    dailyStats.total++;
    const dhikr = $('#dhikrSelect').value;
    dailyStats.byDhikr[dhikr] = (dailyStats.byDhikr[dhikr] || 0) + 1;

    if (count >= target) {
        dailyStats.rounds++;
        if (navigator.vibrate && $('#vibrateToggle').checked) {
            navigator.vibrate([100, 50, 100]);
        }
        // Optional: reset or keep going
    } else if (navigator.vibrate && $('#vibrateToggle').checked) {
        navigator.vibrate(30);
    }

    storage('tasbihStats', dailyStats);
    updateTasbihUI();
});

$('#resetCountBtn')?.addEventListener('click', () => {
    count = 0;
    updateTasbihUI();
});

$('#setTargetBtn')?.addEventListener('click', () => {
    const val = prompt('أدخل الهدف الجديد:', target);
    if (val && !isNaN(val) && val > 0) {
        target = parseInt(val);
        count = 0;
        updateTasbihUI();
    }
});

$('#dhikrSelect')?.addEventListener('change', () => {
    count = 0;
    updateTasbihUI();
});

$('#clearStatsBtn')?.addEventListener('click', () => {
    if (confirm('هل تريد مسح إحصائيات اليوم؟')) {
        dailyStats = { total: 0, rounds: 0, byDhikr: {} };
        storage('tasbihStats', dailyStats);
        updateTasbihUI();
    }
});

updateTasbihUI();

// ---------- Duas ----------
const duas = [
    { title: 'دعاء الاستفتاح', ar: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَهَ غَيْرُكَ', source: 'أبو داود والترمذي' },
    { title: 'دعاء دخول المسجد', ar: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', source: 'مسلم' },
    { title: 'دعاء الخروج من المسجد', ar: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ', source: 'مسلم' },
    { title: 'دعاء النوم', ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', source: 'البخاري' },
    { title: 'دعاء الاستيقاظ', ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', source: 'البخاري' },
    { title: 'دعاء الركوب', ar: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ', source: 'مسلم' },
    { title: 'دعاء السفر', ar: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى', source: 'الترمذي' },
    { title: 'دعاء الكرب', ar: 'لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ', source: 'البخاري ومسلم' },
    { title: 'دعاء الهم والحزن', ar: 'اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ...', source: 'أحمد' },
    { title: 'سيد الاستغفار', ar: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ...', source: 'البخاري' },
    { title: 'دعاء بعد الأذان', ar: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ', source: 'البخاري' },
    { title: 'دعاء الطعام', ar: 'بِسْمِ اللَّهِ', source: 'أبو داود' },
];

function renderDuas() {
    const grid = $('#duasGrid');
    if (!grid) return;
    grid.innerHTML = duas.map(d => `
        <div class="dua-card">
            <h4>${d.title}</h4>
            <div class="dua-arabic">${d.ar}</div>
            <div class="dua-source">المصدر: ${d.source}</div>
        </div>
    `).join('');
}
renderDuas();

// ---------- Asma ul Husna ----------
const asma = [
    { ar: 'الرَّحْمَنُ', en: 'Ar-Rahman', meaning: 'الرحمن - ذو الرحمة الواسعة' },
    { ar: 'الرَّحِيمُ', en: 'Ar-Rahim', meaning: 'الرحيم - ذو الرحمة بالمؤمنين' },
    { ar: 'الْمَلِكُ', en: 'Al-Malik', meaning: 'الملك - الملك الحق' },
    { ar: 'الْقُدُّوسُ', en: 'Al-Quddus', meaning: 'القدوس - المنزه عن كل نقص' },
    { ar: 'السَّلَامُ', en: 'As-Salam', meaning: 'السلام - السليم من كل عيب' },
    { ar: 'الْمُؤْمِنُ', en: 'Al-Mu\'min', meaning: 'المؤمن - الذي يصدق عباده' },
    { ar: 'الْمُهَيْمِنُ', en: 'Al-Muhaymin', meaning: 'المهيمن - الرقيب الحافظ' },
    { ar: 'الْعَزِيزُ', en: 'Al-Aziz', meaning: 'العزيز - الغالب القوي' },
    { ar: 'الْجَبَّارُ', en: 'Al-Jabbar', meaning: 'الجبار - الذي يجبر الكسر' },
    { ar: 'الْمُتَكَبِّرُ', en: 'Al-Mutakabbir', meaning: 'المتكبر - المستحق للكبرياء' },
    { ar: 'الْخَالِقُ', en: 'Al-Khaliq', meaning: 'الخالق - الموجد من العدم' },
    { ar: 'الْبَارِئُ', en: 'Al-Bari\'', meaning: 'البارئ - المصور المبدع' },
    { ar: 'الْمُصَوِّرُ', en: 'Al-Musawwir', meaning: 'المصور - الذي صور الخلق' },
    { ar: 'الْغَفَّارُ', en: 'Al-Ghaffar', meaning: 'الغفار - كثير المغفرة' },
    { ar: 'الْقَهَّارُ', en: 'Al-Qahhar', meaning: 'القهار - الغالب على كل شيء' },
    { ar: 'الْوَهَّابُ', en: 'Al-Wahhab', meaning: 'الوهاب - كثير الهبة والعطاء' },
    { ar: 'الرَّزَّاقُ', en: 'Ar-Razzaq', meaning: 'الرزاق - المتكفل بالرزق' },
    { ar: 'الْفَتَّاحُ', en: 'Al-Fattah', meaning: 'الفتاح - الذي يفتح أبواب الرحمة' },
    { ar: 'الْعَلِيمُ', en: 'Al-Alim', meaning: 'العليم - المحيط بكل شيء علماً' },
    { ar: 'الْقَابِضُ', en: 'Al-Qabid', meaning: 'القابض - الذي يقبض الرزق' },
    { ar: 'الْبَاسِطُ', en: 'Al-Basit', meaning: 'الباسط - الذي يبسط الرزق' },
    { ar: 'الْخَافِضُ', en: 'Al-Khafid', meaning: 'الخافض - الذي يخفض الجبابرة' },
    { ar: 'الرَّافِعُ', en: 'Ar-Rafi\'', meaning: 'الرافع - الذي يرفع أولياءه' },
    { ar: 'الْمُعِزُّ', en: 'Al-Mu\'izz', meaning: 'المعز - الذي يعز من يشاء' },
    { ar: 'الْمُذِلُّ', en: 'Al-Mudhill', meaning: 'المذل - الذي يذل من يشاء' },
    { ar: 'السَّمِيعُ', en: 'As-Sami\'', meaning: 'السميع - الذي يسمع كل شيء' },
    { ar: 'الْبَصِيرُ', en: 'Al-Basir', meaning: 'البصير - الذي يرى كل شيء' },
    { ar: 'الْحَكَمُ', en: 'Al-Hakam', meaning: 'الحكم - الحاكم العدل' },
    { ar: 'الْعَدْلُ', en: 'Al-Adl', meaning: 'العدل - الكامل في عدله' },
    { ar: 'اللَّطِيفُ', en: 'Al-Latif', meaning: 'اللطيف - البر الرفيق بعباده' },
    { ar: 'الْخَبِيرُ', en: 'Al-Khabir', meaning: 'الخبير - العليم بدقائق الأمور' },
    { ar: 'الْحَلِيمُ', en: 'Al-Halim', meaning: 'الحليم - الذي لا يعجل بالعقوبة' },
    { ar: 'الْعَظِيمُ', en: 'Al-Azim', meaning: 'العظيم - ذو العظمة والكبرياء' },
    { ar: 'الْغَفُورُ', en: 'Al-Ghafur', meaning: 'الغفور - واسع المغفرة' },
    { ar: 'الشَّكُورُ', en: 'Ash-Shakur', meaning: 'الشكور - الذي يجازي على القليل' },
    { ar: 'الْعَلِيُّ', en: 'Al-Aliyy', meaning: 'العلي - الرفيع الأعلى' },
    { ar: 'الْكَبِيرُ', en: 'Al-Kabir', meaning: 'الكبير - العظيم الجليل' },
    { ar: 'الْحَفِيظُ', en: 'Al-Hafiz', meaning: 'الحفيظ - الحافظ لكل شيء' },
    { ar: 'الْمُقِيتُ', en: 'Al-Muqit', meaning: 'المقيت - المتكفل بأقوات الخلق' },
    { ar: 'الْحَسِيبُ', en: 'Al-Hasib', meaning: 'الحسيب - الكافي المحاسب' },
    { ar: 'الْجَلِيلُ', en: 'Al-Jalil', meaning: 'الجليل - ذو الجلال والعظمة' },
    { ar: 'الْكَرِيمُ', en: 'Al-Karim', meaning: 'الكريم - الجواد المعطي' },
    { ar: 'الرَّقِيبُ', en: 'Ar-Raqib', meaning: 'الرقيب - المطلع على كل شيء' },
    { ar: 'الْمُجِيبُ', en: 'Al-Mujib', meaning: 'المجيب - الذي يجيب الدعاء' },
    { ar: 'الْوَاسِعُ', en: 'Al-Wasi\'', meaning: 'الواسع - ذو السعة المطلقة' },
    { ar: 'الْحَكِيمُ', en: 'Al-Hakim', meaning: 'الحكيم - ذو الحكمة البالغة' },
    { ar: 'الْوَدُودُ', en: 'Al-Wadud', meaning: 'الودود - المحب لأوليائه' },
    { ar: 'الْمَجِيدُ', en: 'Al-Majid', meaning: 'المجيد - ذو المجد والكرامة' },
    { ar: 'الْبَاعِثُ', en: 'Al-Ba\'ith', meaning: 'الباعث - الذي يبعث الخلق' },
    { ar: 'الشَّهِيدُ', en: 'Ash-Shahid', meaning: 'الشهيد - الحاضر المطلع' },
    { ar: 'الْحَقُّ', en: 'Al-Haqq', meaning: 'الحق - الموجود حقاً' },
    { ar: 'الْوَكِيلُ', en: 'Al-Wakil', meaning: 'الوكيل - الكفيل بالخلق' },
    { ar: 'الْقَوِيُّ', en: 'Al-Qawiyy', meaning: 'القوي - ذو القوة المطلقة' },
    { ar: 'الْمَتِينُ', en: 'Al-Matin', meaning: 'المتين - الشديد القوة' },
    { ar: 'الْوَلِيُّ', en: 'Al-Waliyy', meaning: 'الولي - الناصر والمعين' },
    { ar: 'الْحَمِيدُ', en: 'Al-Hamid', meaning: 'الحميد - المستحق للحمد' },
    { ar: 'الْمُحْصِي', en: 'Al-Muhsi', meaning: 'المحصي - الذي أحصى كل شيء' },
    { ar: 'الْمُبْدِئُ', en: 'Al-Mubdi\'', meaning: 'المبدئ - الذي بدأ الخلق' },
    { ar: 'الْمُعِيدُ', en: 'Al-Mu\'id', meaning: 'المعيد - الذي يعيد الخلق' },
    { ar: 'الْمُحْيِي', en: 'Al-Muhyi', meaning: 'المحيي - الذي يحيي الموتى' },
    { ar: 'الْمُمِيتُ', en: 'Al-Mumit', meaning: 'المميت - الذي يميت الأحياء' },
    { ar: 'الْحَيُّ', en: 'Al-Hayy', meaning: 'الحي - الدائم الحياة' },
    { ar: 'الْقَيُّومُ', en: 'Al-Qayyum', meaning: 'القيوم - القائم بنفسه' },
    { ar: 'الْوَاجِدُ', en: 'Al-Wajid', meaning: 'الواجد - الغني الذي لا يفتقر' },
    { ar: 'الْمَاجِدُ', en: 'Al-Majid', meaning: 'الماجد - الشريف الكريم' },
    { ar: 'الْوَاحِدُ', en: 'Al-Wahid', meaning: 'الواحد - الأحد الفرد' },
    { ar: 'الصَّمَدُ', en: 'As-Samad', meaning: 'الصمد - المقصود في الحوائج' },
    { ar: 'الْقَادِرُ', en: 'Al-Qadir', meaning: 'القادر - ذو القدرة التامة' },
    { ar: 'الْمُقْتَدِرُ', en: 'Al-Muqtadir', meaning: 'المقتدر - البالغ القدرة' },
    { ar: 'الْمُقَدِّمُ', en: 'Al-Muqaddim', meaning: 'المقدم - الذي يقدم من يشاء' },
    { ar: 'الْمُؤَخِّرُ', en: 'Al-Mu\'akhkhir', meaning: 'المؤخر - الذي يؤخر من يشاء' },
    { ar: 'الْأَوَّلُ', en: 'Al-Awwal', meaning: 'الأول - الذي ليس قبله شيء' },
    { ar: 'الْآخِرُ', en: 'Al-Akhir', meaning: 'الآخر - الذي ليس بعده شيء' },
    { ar: 'الظَّاهِرُ', en: 'Az-Zahir', meaning: 'الظاهر - الظاهر فوق كل شيء' },
    { ar: 'الْبَاطِنُ', en: 'Al-Batin', meaning: 'الباطن - الخفي عن الأبصار' },
    { ar: 'الْوَالِي', en: 'Al-Wali', meaning: 'الوالي - المالك المتصرف' },
    { ar: 'الْمُتَعَالِي', en: 'Al-Muta\'ali', meaning: 'المتعالي - المتنزه عن النقائص' },
    { ar: 'الْبَرُّ', en: 'Al-Barr', meaning: 'البر - المحسن إلى خلقه' },
    { ar: 'التَّوَّابُ', en: 'At-Tawwab', meaning: 'التواب - الذي يقبل التوبة' },
    { ar: 'الْمُنْتَقِمُ', en: 'Al-Muntaqim', meaning: 'المنتقم - الذي ينتقم من العصاة' },
    { ar: 'الْعَفُوُّ', en: 'Al-Afuww', meaning: 'العفو - الذي يمحو السيئات' },
    { ar: 'الرَّءُوفُ', en: 'Ar-Ra\'uf', meaning: 'الرؤوف - شديد الرحمة' },
    { ar: 'مَالِكُ الْمُلْكِ', en: 'Malik-ul-Mulk', meaning: 'مالك الملك - صاحب الملك المطلق' },
    { ar: 'ذُو الْجَلَالِ وَالْإِكْرَامِ', en: 'Dhul-Jalali wal-Ikram', meaning: 'ذو الجلال والإكرام' },
    { ar: 'الْمُقْسِطُ', en: 'Al-Muqsit', meaning: 'المقسط - العادل في حكمه' },
    { ar: 'الْجَامِعُ', en: 'Al-Jami\'', meaning: 'الجامع - الذي يجمع الخلق' },
    { ar: 'الْغَنِيُّ', en: 'Al-Ghaniyy', meaning: 'الغني - المستغني عن الخلق' },
    { ar: 'الْمُغْنِي', en: 'Al-Mughni', meaning: 'المغني - الذي يغني من يشاء' },
    { ar: 'الْمَانِعُ', en: 'Al-Mani\'', meaning: 'المانع - الذي يمنع ما يشاء' },
    { ar: 'الضَّارُّ', en: 'Ad-Darr', meaning: 'الضار - الذي يضر من يشاء بحكمته' },
    { ar: 'النَّافِعُ', en: 'An-Nafi\'', meaning: 'النافع - الذي ينفع من يشاء' },
    { ar: 'النُّورُ', en: 'An-Nur', meaning: 'النور - نور السموات والأرض' },
    { ar: 'الْهَادِي', en: 'Al-Hadi', meaning: 'الهادي - الذي يهدي من يشاء' },
    { ar: 'الْبَدِيعُ', en: 'Al-Badi\'', meaning: 'البديع - المبدع بلا مثال' },
    { ar: 'الْبَاقِي', en: 'Al-Baqi', meaning: 'الباقي - الدائم الذي لا يفنى' },
    { ar: 'الْوَارِثُ', en: 'Al-Warith', meaning: 'الوارث - الباقي بعد فناء الخلق' },
    { ar: 'الرَّشِيدُ', en: 'Ar-Rashid', meaning: 'الرشيد - الذي يرشد خلقه' },
    { ar: 'الصَّبُورُ', en: 'As-Sabur', meaning: 'الصبور - الذي لا يعجل بالعقوبة' },
];

function renderAsma() {
    const grid = $('#asmaGrid');
    if (!grid) return;
    grid.innerHTML = asma.map((a, i) => `
        <div class="asma-card">
            <div class="name-ar">${i + 1}. ${a.ar}</div>
            <div class="name-en">${a.en}</div>
            <div class="meaning">${a.meaning}</div>
        </div>
    `).join('');
}
renderAsma();

// ---------- Qibla ----------
// Kaaba coordinates
const KAABA = { lat: 21.4225, lng: 39.8262 };

function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }

function calculateQibla(lat, lng) {
    const φ1 = toRad(lat);
    const φ2 = toRad(KAABA.lat);
    const Δλ = toRad(KAABA.lng - lng);
    const y = Math.sin(Δλ);
    const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
    let bearing = toDeg(Math.atan2(y, x));
    return (bearing + 360) % 360;
}

function distanceToKaaba(lat, lng) {
    const R = 6371;
    const dLat = toRad(KAABA.lat - lat);
    const dLng = toRad(KAABA.lng - lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat)) * Math.cos(toRad(KAABA.lat)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

$('#getQiblaBtn')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('المتصفح لا يدعم تحديد الموقع');
        return;
    }
    $('#qiblaStatus').textContent = 'جاري تحديد الموقع...';
    navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        const qibla = calculateQibla(latitude, longitude);
        const dist = distanceToKaaba(latitude, longitude);
        $('#qiblaDegree').textContent = `${qibla.toFixed(1)}°`;
        $('#distanceToKaaba').textContent = `المسافة إلى الكعبة: ${dist.toFixed(0)} كم تقريباً`;
        $('#qiblaStatus').textContent = 'اتجاه القبلة من موقعك الحالي';
        $('#needle').style.transform = `translate(-50%, -100%) rotate(${qibla}deg)`;

        // Device orientation for live compass if available
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => {
                if (e.alpha !== null) {
                    const heading = e.alpha; // 0-360
                    const relative = (qibla - heading + 360) % 360;
                    $('#needle').style.transform = `translate(-50%, -100%) rotate(${relative}deg)`;
                }
            }, true);
        }
    }, () => {
        $('#qiblaStatus').textContent = 'لم يتم السماح بالوصول للموقع';
    });
});

// ---------- Calendar / Hijri ----------
async function loadTodayDates() {
    try {
        const res = await fetch('https://api.aladhan.com/v1/gToH');
        const data = await res.json();
        if (data.code === 200) {
            const g = data.data.gregorian;
            const h = data.data.hijri;
            $('#todayGregorian').textContent = `${g.weekday.ar || g.weekday.en} ${g.day} ${g.month.en} ${g.year}`;
            $('#todayHijri').textContent = `${h.weekday.ar} ${h.day} ${h.month.ar} ${h.year} هـ`;
        }
    } catch {
        const now = new Date();
        $('#todayGregorian').textContent = now.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
}

$('#toHijriBtn')?.addEventListener('click', async () => {
    const date = $('#gregDate').value;
    if (!date) return;
    const [y, m, d] = date.split('-');
    try {
        const res = await fetch(`https://api.aladhan.com/v1/gToH/${d}-${m}-${y}`);
        const data = await res.json();
        if (data.code === 200) {
            const h = data.data.hijri;
            $('#hijriResult').textContent = `${h.day} ${h.month.ar} ${h.year} هـ`;
        }
    } catch {
        $('#hijriResult').textContent = 'خطأ في التحويل';
    }
});

$('#toGregBtn')?.addEventListener('click', async () => {
    const d = $('#hijriDay').value;
    const m = $('#hijriMonth').value;
    const y = $('#hijriYear').value;
    if (!d || !m || !y) return;
    try {
        const res = await fetch(`https://api.aladhan.com/v1/hToG/${d}-${m}-${y}`);
        const data = await res.json();
        if (data.code === 200) {
            const g = data.data.gregorian;
            $('#gregResult').textContent = `${g.day} ${g.month.en} ${g.year}`;
        }
    } catch {
        $('#gregResult').textContent = 'خطأ في التحويل';
    }
});

loadTodayDates();

// =====================================================
// 1) PWA - تسجيل Service Worker
// =====================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((reg) => console.log('[PWA] Service Worker مسجّل', reg.scope))
            .catch((err) => console.log('[PWA] فشل التسجيل', err));
    });
}

// =====================================================
// 2) نظام الحفظ (Bookmarks) - حفظ موضع القراءة
// =====================================================
/**
 * يحفظ رقم السورة ورقم الآية في localStorage
 * يستدعى عند الضغط على زر "حفظ الموضع"
 * نحفظ أيضاً اسم السورة للعرض
 */
function saveReadingPosition(surahNumber, ayahNumberInSurah, surahName = '') {
    const bookmark = {
        surah: parseInt(surahNumber),
        ayah: parseInt(ayahNumberInSurah),
        surahName: surahName || `سورة ${surahNumber}`,
        savedAt: new Date().toISOString()
    };
    storage('quranBookmark', bookmark);
    alert(`تم حفظ الموضع: ${bookmark.surahName} - آية ${bookmark.ayah}`);
}

/**
 * يسترجع آخر موضع محفوظ وينتقل إليه
 */
function goToLastReading() {
    const bookmark = storage('quranBookmark');
    if (!bookmark) {
        alert('لا يوجد موضع محفوظ بعد. اقرأ سورة ثم اضغط "حفظ الموضع".');
        return;
    }

    // نضع السورة في الـ select ونحمّلها
    const select = $('#surahSelect');
    if (select) {
        select.value = bookmark.surah;
        // نحمّل السورة ثم ننتقل للآية
        loadSurah().then(() => {
            // بعد التحميل نبحث عن الآية ونبرزها
            setTimeout(() => {
                const ayahEl = document.querySelector(`.ayah-item .ayah-number`);
                // نبحث عن العنصر الذي يحمل رقم الآية
                const items = document.querySelectorAll('.ayah-item');
                items.forEach((item) => {
                    const num = item.querySelector('.ayah-number');
                    if (num && parseInt(num.textContent) === bookmark.ayah) {
                        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        item.style.background = 'rgba(13, 115, 119, 0.15)';
                        item.style.borderRadius = '12px';
                        setTimeout(() => { item.style.background = ''; }, 3000);
                    }
                });
            }, 600);
        });
    }
}

// أزرار الحفظ
$('#saveBookmarkBtn')?.addEventListener('click', () => {
    const surahNum = $('#surahSelect')?.value;
    if (!surahNum) {
        alert('اختر سورة أولاً واعرضها');
        return;
    }
    // نحفظ أول آية ظاهرة حالياً أو الآية 1 كافتراضي
    // يمكن تحسينه لاحقاً بحفظ آخر آية مرئية
    const firstVisible = document.querySelector('.ayah-item .ayah-number');
    const ayahNum = firstVisible ? parseInt(firstVisible.textContent) : 1;
    const surah = surahsList.find(s => s.number == surahNum);
    saveReadingPosition(surahNum, ayahNum, surah ? surah.name : '');
});

$('#goToBookmarkBtn')?.addEventListener('click', goToLastReading);

// =====================================================
// 3) إشعارات الأذان التلقائية
// =====================================================
let notificationTimers = [];

/**
 * يطلب إذن الإشعارات من المستخدم
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('المتصفح لا يدعم الإشعارات');
        return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
        alert('تم رفض الإشعارات سابقاً. غيّر الإعدادات من المتصفح.');
        return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
}

/**
 * يحسب الوقت المتبقي بالمللي ثانية حتى وقت صلاة معين (HH:MM)
 */
function msUntilTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now) {
        // إذا فات الوقت اليوم، نضعه غداً
        target.setDate(target.getDate() + 1);
    }
    return target - now;
}

/**
 * يرتب مؤقتات الإشعارات لكل الصلوات القادمة
 * يستدعى بعد جلب المواقيت بنجاح
 */
function schedulePrayerNotifications(timings) {
    // نمسح المؤقتات القديمة
    notificationTimers.forEach(clearTimeout);
    notificationTimers = [];

    if (Notification.permission !== 'granted') return;

    const prayers = [
        { key: 'Fajr', name: 'الفجر' },
        { key: 'Dhuhr', name: 'الظهر' },
        { key: 'Asr', name: 'العصر' },
        { key: 'Maghrib', name: 'المغرب' },
        { key: 'Isha', name: 'العشاء' }
    ];

    prayers.forEach((p) => {
        const time = timings[p.key];
        if (!time) return;
        const delay = msUntilTime(time);

        // لا نجدول أوقاتاً بعيدة جداً (أكثر من 24 ساعة)
        if (delay > 24 * 60 * 60 * 1000) return;

        const timerId = setTimeout(() => {
            new Notification('حان وقت الصلاة 🕌', {
                body: `حان الآن وقت صلاة ${p.name}`,
                icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>☪</text></svg>",
                tag: 'prayer-' + p.key, // يمنع تكرار الإشعار
                requireInteraction: true
            });

            // تشغيل صوت الأذان إن أمكن (قد يمنعه المتصفح بدون تفاعل)
            try {
                const audio = $('#adhanAudio');
                if (audio) {
                    audio.src = 'https://cdn.aladhan.com/audio/adhan/1.mp3';
                    audio.play().catch(() => {});
                }
            } catch (e) {}
        }, delay);

        notificationTimers.push(timerId);
    });

    const statusEl = $('#notificationStatus');
    if (statusEl) {
        statusEl.textContent = '✅ تم تفعيل الإشعارات. ستصلك تنبيهات عند دخول أوقات الصلاة.';
    }
}

// زر تفعيل الإشعارات
$('#enableNotificationsBtn')?.addEventListener('click', async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
        // إذا كانت المواقيت موجودة نجدول فوراً
        if (prayerTimesData && prayerTimesData.timings) {
            schedulePrayerNotifications(prayerTimesData.timings);
        } else {
            $('#notificationStatus').textContent = 'تم منح الإذن. احسب المواقيت أولاً ليتم جدولة الإشعارات.';
        }
    }
});

// نربط الجدولة تلقائياً بعد جلب المواقيت (تعديل بسيط على الدالة الموجودة)
const originalRenderPrayerTimes = renderPrayerTimes;
renderPrayerTimes = function(data) {
    originalRenderPrayerTimes(data);
    if (Notification.permission === 'granted' && data.timings) {
        schedulePrayerNotifications(data.timings);
    }
};

// =====================================================
// 4) أذكار الصباح والمساء
// =====================================================
const morningAdhkar = [
    { text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ...', count: 1 },
    { text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ', count: 1 },
    { text: 'أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ', count: 1 },
    { text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 100 },
    { text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', count: 10 },
    { text: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', count: 100 },
    { text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', count: 10 },
    { text: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ', count: 7 },
    { text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', count: 3 },
    { text: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا', count: 3 }
];

const eveningAdhkar = [
    { text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ...', count: 1 },
    { text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ', count: 1 },
    { text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 100 },
    { text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', count: 10 },
    { text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', count: 3 },
    { text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', count: 3 },
    { text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', count: 10 },
    { text: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ', count: 7 }
];

let currentAdhkarType = 'morning';

function renderAdhkar(type = 'morning') {
    currentAdhkarType = type;
    const list = type === 'morning' ? morningAdhkar : eveningAdhkar;
    const container = $('#adhkarList');
    if (!container) return;

    // نأخذ نسخة عميقة حتى نعدل العداد دون التأثير على الأصل
    const items = list.map(item => ({ ...item, remaining: item.count }));

    container.innerHTML = items.map((item, index) => `
        <div class="dua-card adhkar-item" data-index="${index}">
            <div class="dua-arabic" style="margin-bottom:1rem;">${item.text}</div>
            <button class="btn btn-primary adhkar-count-btn" data-index="${index}">
                ${item.remaining}
            </button>
        </div>
    `).join('');

    // ربط الأحداث
    container.querySelectorAll('.adhkar-count-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index);
            const card = this.closest('.adhkar-item');
            items[idx].remaining--;

            if (items[idx].remaining <= 0) {
                // اختفاء الذكر مع تأثير
                card.style.transition = 'opacity 0.4s, transform 0.4s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => card.remove(), 400);
            } else {
                this.textContent = items[idx].remaining;
                // اهتزاز خفيف إن توفر
                if (navigator.vibrate) navigator.vibrate(20);
            }
        });
    });
}

// تبديل التبويبات
$$('.adhkar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        $$('.adhkar-tab').forEach(t => {
            t.classList.remove('active', 'btn-primary');
            t.classList.add('btn-outline');
        });
        tab.classList.add('active', 'btn-primary');
        tab.classList.remove('btn-outline');
        renderAdhkar(tab.dataset.type);
    });
});

// عرض أذكار الصباح عند التحميل
renderAdhkar('morning');

// ---------- Init ----------
console.log('نور الإسلام جاهز ✓ + PWA + Bookmarks + Notifications + Adhkar');
