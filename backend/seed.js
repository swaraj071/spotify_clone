import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { getDb, initDb } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to download a file, following redirects recursively
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    // If file already exists, skip download
    if (fs.existsSync(dest)) {
      console.log(`File already exists: ${path.basename(dest)}, skipping download.`);
      resolve(dest);
      return;
    }

    console.log(`Downloading: ${url} ...`);
    
    const request = (targetUrl) => {
      https.get(targetUrl, (response) => {
        // Handle Redirects (301, 302, 307, 308)
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Download complete: ${path.basename(dest)}`);
          resolve(dest);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

const sampleSongs = [
  {
    id: 'sng_seed1',
    title: 'Perfect',
    artist: 'Ed Sheeran',
    album: 'Divide (÷)',
    duration: 263,
    genre: 'Pop / Acoustic',
    audioUrl: 'https://archive.org/download/fave2/Ed%20Sheeran%20-%20Perfect.mp3',
    coverUrl: 'https://picsum.photos/id/10/300/300',
    lyrics: [
      { time: 0, text: '🎵 (Acoustic Intro)', translation: '🎵 (Acoustic Intro)' },
      { time: 3, text: 'I found a love for me', translation: 'Encontré un amor para mí' },
      { time: 9, text: 'Darling, just dive right in and follow my lead', translation: 'Cariño, solo sumérgete y sígueme' },
      { time: 17, text: 'Well, I found a girl, beautiful and sweet', translation: 'Bueno, encontré una chica, bella y dulce' },
      { time: 24, text: 'Oh, I never knew you were the someone waiting for me', translation: 'Oh, nunca supe que eras tú quien me estaba esperando' },
      { time: 32, text: 'Cause we were just kids when we fell in love', translation: 'Porque éramos solo niños cuando nos enamoramos' },
      { time: 38, text: 'Not knowing what it was', translation: 'Sin saber lo que era' },
      { time: 43, text: 'I will not give you up this time', translation: 'No te dejaré ir esta vez' },
      { time: 50, text: 'But darling, just kiss me slow', translation: 'Pero cariño, solo bésame lento' },
      { time: 54, text: 'Your heart is all I own', translation: 'Tu corazón es todo lo que poseo' },
      { time: 58, text: 'And in your eyes, you\'re holding mine', translation: 'Y en tus ojos, sostienes los míos' },
      { time: 64, text: 'Baby, I\'m dancing in the dark', translation: 'Nena, estoy bailando en la oscuridad' },
      { time: 69, text: 'With you between my arms', translation: 'Contigo entre mis brazos' },
      { time: 74, text: 'Barefoot on the grass', translation: 'Descalzo sobre la hierba' },
      { time: 79, text: 'Listening to our favourite song', translation: 'Escuchando nuestra canción favorita' },
      { time: 84, text: 'When you said you looked a mess', translation: 'Cuando dijiste que te veías un desastre' },
      { time: 88, text: 'I whispered underneath my breath', translation: 'Susurré por lo bajo' },
      { time: 91, text: 'But you heard it, darling, you look perfect tonight', translation: 'Pero lo escuchaste, cariño, te ves perfecta esta noche' },
      { time: 98, text: '🎵 (Guitar Solo / Interlude)', translation: '🎵 (Solo de guitarra)' },
      { time: 113, text: 'Well, I found a woman, stronger than anyone I know', translation: 'Bueno, encontré una mujer, más fuerte que cualquiera que conozca' },
      { time: 121, text: 'She shares my dreams, I hope that someday I\'ll share her home', translation: 'Ella comparte mis sueños, espero que algún día comparta su hogar' },
      { time: 129, text: 'I found a love to carry more than just my secrets', translation: 'Encontré un amor para llevar más que mis secretos' },
      { time: 136, text: 'To carry love, to carry children of our own', translation: 'Para llevar amor, para criar hijos propios' },
      { time: 144, text: 'We are still kids but we\'re so in love', translation: 'Todavía somos niños pero estamos tan enamorados' },
      { time: 150, text: 'Fighting against all odds', translation: 'Luchando contra todas las adversidades' },
      { time: 155, text: 'I know we\'ll be alright this time', translation: 'Sé que estaremos bien esta vez' },
      { time: 162, text: 'Darling, just hold my hand', translation: 'Cariño, solo toma mi mano' },
      { time: 166, text: 'Be my girl, I\'ll be your man', translation: 'Sé mi chica, yo seré tu hombre' },
      { time: 170, text: 'I see my future in your eyes', translation: 'Veo mi futuro en tus ojos' },
      { time: 176, text: 'Baby, I\'m dancing in the dark', translation: 'Nena, estoy bailando en la oscuridad' },
      { time: 181, text: 'With you between my arms', translation: 'Contigo entre mis brazos' },
      { time: 186, text: 'Barefoot on the grass', translation: 'Descalzo sobre la hierba' },
      { time: 191, text: 'Listening to our favourite song', translation: 'Escuchando nuestra canción favorita' },
      { time: 196, text: 'When I saw you in that dress, looking so beautiful', translation: 'Cuando te vi con ese vestido, viéndote tan hermosa' },
      { time: 203, text: 'I don\'t deserve this, darling, you look perfect tonight', translation: 'No me lo merezco, cariño, te ves perfecta esta noche' }
    ]
  },
  {
    id: 'sng_seed2',
    title: 'Komorebi (Sunlight Filtering)',
    artist: 'Haruto Sato',
    album: 'Tokyo Ambient Sessions',
    duration: 425,
    genre: 'Ambient / Chillout',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    coverUrl: 'https://picsum.photos/id/20/300/300',
    lyrics: [
      { time: 0, text: '🎵 (Zen Ambient Soundscape)', translation: '🎵 (Zen Ambient Soundscape)' },
      { time: 12, text: '木漏れ日が揺れる静かな朝 (Komorebi ga yureru shizukana asa)', translation: 'A quiet morning with filtering sunlight dancing' },
      { time: 24, text: '君の手のぬくもりを思い出す (Kimi no te no nukumori wo omoidasu)', translation: 'I remember the warmth of your hand' },
      { time: 36, text: '風がささやく古い記憶 (Kaze ga sasayaku furui kioku)', translation: 'The wind whispers old memories' },
      { time: 48, text: '時の流れに身を任せて (Toki no nagare ni mi wo makasete)', translation: 'Surrendering myself to the flow of time' },
      { time: 60, text: '🎵 (Piano Interlude)', translation: '🎵 (Piano Interlude)' },
      { time: 80, text: '目を閉じれば広がる空 (Me wo tojireba hirogaru sora)', translation: 'Closing my eyes, the sky expands' }
    ]
  },
  {
    id: 'sng_seed3',
    title: 'Neon Horizon',
    artist: 'Cyberwave Synth',
    album: 'Retro Future 1988',
    duration: 302,
    genre: 'Synthwave / Retro',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    coverUrl: 'https://picsum.photos/id/30/300/300',
    lyrics: [
      { time: 0, text: '⚡ (Electronic Synth Intro)', translation: '⚡ (Electronic Synth Intro)' },
      { time: 10, text: 'We drive into the neon haze', translation: 'Nos adentramos en la bruma de neón' },
      { time: 18, text: 'Chasing the ghost of yesterday\'s phrase', translation: 'Persiguiendo el fantasma de la frase de ayer' },
      { time: 26, text: 'Synthesizers cry in the night', translation: 'Los sintetizadores lloran en la noche' },
      { time: 34, text: 'Guided only by the laser light', translation: 'Guiados únicamente por la luz láser' },
      { time: 42, text: 'Speeding up, we leave it all behind', translation: 'Acelerando, lo dejamos todo atrás' },
      { time: 50, text: 'No search for what we couldn\'t find', translation: 'Sin buscar lo que no pudimos encontrar' }
    ]
  },
  {
    id: 'sng_seed4',
    title: 'Kabira',
    artist: 'Arijit Singh / Harshdeep Kaur',
    album: 'Yeh Jawaani Hai Deewani',
    duration: 223,
    genre: 'Hindi / Bollywood Pop',
    audioUrl: 'https://archive.org/download/TeriMeriKahaaniGabbarIsBack320KbpsSongspk.name_201605/songs.pk08-Kabira-YehJawaaniHaiDeewani.mp3',
    coverUrl: 'https://picsum.photos/id/40/300/300',
    lyrics: [
      { time: 0, text: '🎵 (Flute Intro)', translation: '🎵 (Flute Intro)' },
      { time: 8, text: 'Kaisi teri khudgarzi', translation: 'What kind of selfishness is this of yours' },
      { time: 15, text: 'Na dhoop chune na chaanv', translation: 'You choose neither the sun nor the shade' },
      { time: 22, text: 'Kaisi teri khudgarzi', translation: 'What kind of selfishness is this of yours' },
      { time: 29, text: 'Kisi thaur tike na paanv', translation: 'Your feet do not rest at any place' },
      { time: 36, text: 'Re Kabira maan jaa', translation: 'Oh Kabira, please understand/agree' },
      { time: 43, text: 'Re Faqeera maan jaa', translation: 'Oh hermit, please understand/agree' },
      { time: 50, text: 'Aaja tujhko pukaarein teri parchhaaiyan', translation: 'Come back, your own shadows are calling you' },
      { time: 58, text: 'Re Kabira maan jaa', translation: 'Oh Kabira, please understand/agree' },
      { time: 65, text: 'Aaja tujhko pukaarein teri parchhaaiyan', translation: 'Come back, your own shadows are calling you' },
      { time: 72, text: '🎵 (Flute Interlude)', translation: '🎵 (Flute Interlude)' },
      { time: 86, text: 'Ban liya apna paigambar', translation: 'You became your own prophet' },
      { time: 90, text: 'Tar liya tu saat samandar', translation: 'And crossed the seven seas' },
      { time: 93, text: 'Phir bhi sookha andar hi andar', translation: 'Yet you remain dry from within' },
      { time: 97, text: 'Kyun reh gaya?', translation: 'Why did you remain so?' },
      { time: 100, text: 'Re Kabira maan jaa', translation: 'Oh Kabira, please understand/agree' },
      { time: 107, text: 'Re Faqeera maan jaa', translation: 'Oh hermit, please understand/agree' },
      { time: 114, text: 'Aaja tujhko pukaarein teri parchhaaiyan', translation: 'Come back, your own shadows are calling you' }
    ]
  },
  {
    id: 'sng_seed5',
    title: 'Dil Diyan Gallan',
    artist: 'Atif Aslam',
    album: 'Tiger Zinda Hai',
    duration: 260,
    genre: 'Hindi / Romantic Acoustic',
    audioUrl: 'https://archive.org/download/lywod/Dil%20Diyan%20Gallan.mp3',
    coverUrl: 'https://picsum.photos/id/50/300/300',
    lyrics: [
      { time: 0, text: '🎵 (Acoustic Guitar Intro)', translation: '🎵 (Acoustic Guitar Intro)' },
      { time: 8, text: 'Kacchi doriyon, doriyon, doriyon se', translation: 'With fragile, delicate threads of love' },
      { time: 16, text: 'Mainu tu baandh le', translation: 'Tie me to yourself' },
      { time: 24, text: 'Pakki yaariyon, yaariyon, yaariyon mein', translation: 'In firm and deep friendships' },
      { time: 32, text: 'Mainu tu baandh le', translation: 'Tie me to yourself' },
      { time: 40, text: 'Dil diyan gallan', translation: 'The secrets of the heart' },
      { time: 48, text: 'Karange naal naal beh ke', translation: 'We will share sitting close together' },
      { time: 56, text: 'Akh naale akh nu mila ke', translation: 'By matching eye to eye' },
      { time: 64, text: 'Dil diyan gallan haaye...', translation: 'The talks of the heart, oh...' },
      { time: 72, text: 'Karange naal naal beh ke', translation: 'We will share sitting close together' },
      { time: 80, text: 'Akh naale akh nu mila ke', translation: 'By matching eye to eye' },
      { time: 88, text: 'Tenu lakhan ton chhupa ke rakhan', translation: 'I will keep you hidden from millions' },
      { time: 92, text: 'Akkhaan te sajaa ke rakhan', translation: 'I will decorate you in my eyes' },
      { time: 96, text: 'Tu hai meri wafa', translation: 'You are my loyalty/love' },
      { time: 100, text: 'Rakh apna bana ke mainu', translation: 'Keep me as your own' },
      { time: 104, text: 'Tere bin nahi jeena', translation: 'I cannot live without you' },
      { time: 108, text: 'Tu hai mera khuda', translation: 'You are my God' }
    ]
  }
];

async function seed() {
  // Initialize Database tables first
  await initDb();

  const db = await getDb();
  console.log('Seeding database with sample songs...');

  // Download default covers/placeholder images
  try {
    await downloadFile('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80', path.join(uploadsDir, 'default-cover.jpg'));
    await downloadFile('https://images.unsplash.com/photo-1487180142328-054b783fc471?w=300&q=80', path.join(uploadsDir, 'default-playlist.jpg'));
  } catch (err) {
    console.warn('Could not download default covers. Creating empty files as fallback.', err.message);
    fs.writeFileSync(path.join(uploadsDir, 'default-cover.jpg'), '');
    fs.writeFileSync(path.join(uploadsDir, 'default-playlist.jpg'), '');
  }

  for (const songData of sampleSongs) {
    const localAudioPath = path.join(uploadsDir, `${songData.id}.mp3`);
    const localCoverPath = path.join(uploadsDir, `${songData.id}.jpg`);

    let finalAudioPath = songData.audioUrl;
    let finalCoverPath = songData.coverUrl;

    // Try to download audio file
    try {
      await downloadFile(songData.audioUrl, localAudioPath);
      finalAudioPath = localAudioPath;
    } catch (err) {
      console.warn(`Could not download audio for ${songData.title}. Using remote URL stream:`, err.message);
    }

    // Try to download cover file
    try {
      await downloadFile(songData.coverUrl, localCoverPath);
      finalCoverPath = localCoverPath;
    } catch (err) {
      console.warn(`Could not download cover for ${songData.title}. Using remote URL:`, err.message);
    }

    // Insert song
    await db.run(`
      INSERT OR REPLACE INTO songs (id, title, artist, album, duration, file_path, cover_path, genre, lyrics, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'system')
    `, [
      songData.id,
      songData.title,
      songData.artist,
      songData.album,
      songData.duration,
      finalAudioPath,
      finalCoverPath,
      songData.genre,
      JSON.stringify(songData.lyrics),
    ]);

    console.log(`Seeded: ${songData.title}`);
  }

  // Create a default playlist
  const playlistId = 'ply_seed1';
  await db.run(`
    INSERT OR REPLACE INTO playlists (id, name, description, cover_path, created_by, is_collaborative)
    VALUES (?, ?, ?, ?, 'system', 1)
  `, [
    playlistId,
    'Chill Coding Vibe',
    'A premium collection of seeded songs to write code to.',
    path.join(uploadsDir, 'default-playlist.jpg')
  ]);

  // Link songs to default playlist
  await db.run('DELETE FROM playlist_songs WHERE playlist_id = ?', [playlistId]);
  for (let i = 0; i < sampleSongs.length; i++) {
    await db.run(`
      INSERT OR REPLACE INTO playlist_songs (playlist_id, song_id, position)
      VALUES (?, ?, ?)
    `, [playlistId, sampleSongs[i].id, i + 1]);
  }

  console.log('Seeded default playlist: Chill Coding Vibe');
  await db.close();
  console.log('Database seeding finished successfully!');
}

seed().catch(err => {
  console.error('Error seeding database:', err);
});
