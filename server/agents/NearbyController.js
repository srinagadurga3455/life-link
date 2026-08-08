// ── NearbyController — Live nearby services via Places API (New) ─────────────

const GOOGLE_KEY = () => process.env.GOOGLE_MAPS_KEY;

// ── Places API (New) base URL ────────────────────────────────────────────────
const PLACES_BASE = 'https://places.googleapis.com/v1/places';

// ── Category → Places type / query ──────────────────────────────────────────
const CATEGORY_QUERY = {
  hospitals:  'hospital',
  police:     'police station',
  pharmacies: 'pharmacy',
  others:     'fire station OR ambulance OR blood bank OR disaster management',
};

// ── Specialty → refined query ────────────────────────────────────────────────
const SPECIALTY_QUERY = {
  'Cardiology':    'cardiology heart hospital',
  'Orthopedic':    'orthopedic bone hospital',
  'Neurology':     'neurology brain hospital',
  'Burn & Trauma': 'burn trauma emergency hospital',
  'Pulmonology':   'pulmonology chest hospital',
  'Maternity':     'maternity gynaecology hospital',
  'Paediatric':    'children paediatric hospital',
  'Ophthalmology': 'eye hospital ophthalmology',
  'Toxicology':    'poison antivenom emergency hospital',
  'Trauma':        'trauma emergency hospital',
  'General':       'general hospital emergency',
};

// ── Haversine distance ───────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Core search — Places API (New) Text Search ───────────────────────────────
async function placesSearch(query, lat, lng, radius = 8000) {
  const key = GOOGLE_KEY();
  const res = await fetch(`${PLACES_BASE}:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.regularOpeningHours.openNow',
        'places.internationalPhoneNumber',
        'places.types',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radius,
        },
      },
      maxResultCount: 8,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    throw new Error(`Places API (New) error: ${res.status} — ${msg}`);
  }
  return data.places || [];
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function getNearby(req, res) {
  const key = GOOGLE_KEY();
  if (!key) {
    return res.status(503).json({ error: 'GOOGLE_MAPS_KEY not configured', places: [] });
  }

  const {
    lat      = 13.0827,
    lng      = 80.2707,
    category = 'hospitals',
    specialty = null,
  } = req.query;

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  try {
    // Build the search query
    let query;
    if (category === 'hospitals' && specialty && specialty !== 'All') {
      query = SPECIALTY_QUERY[specialty] || `${specialty} hospital`;
    } else if (category === 'others') {
      query = 'fire station OR ambulance OR blood bank OR disaster management';
    } else {
      query = CATEGORY_QUERY[category] || category;
    }

    const raw = await placesSearch(query, userLat, userLng);

    // New API returns all fields inline — no extra details fetch needed
    const places = raw.map((p, i) => {
      const pLat = p.location?.latitude;
      const pLng = p.location?.longitude;
      const km   = haversine(userLat, userLng, pLat, pLng);
      const name = p.displayName?.text || 'Unknown';

      return {
        id:         p.id,
        name,
        address:    p.formattedAddress || '',
        phone:      p.internationalPhoneNumber || '112',   // fallback emergency
        latitude:   pLat,
        longitude:  pLng,
        distKm:     km,
        distance:   `${km.toFixed(1)} km`,
        rating:     p.rating || null,
        open:       p.regularOpeningHours?.openNow ?? null,
        type:       category.charAt(0).toUpperCase() + category.slice(1, -1),
        // For hospitals: use specialty as the specialty label
        specialties: category === 'hospitals'
          ? (specialty && specialty !== 'All'
              ? [specialty, 'General']
              : inferSpecialties(name, p.types || []))
          : undefined,
        recommended: i < 2 && !!specialty && specialty !== 'All',
        source: 'google',
      };
    });

    // Sort by distance
    places.sort((a, b) => a.distKm - b.distKm);

    console.log(`📍 [Nearby] ${category}${specialty ? ` (${specialty})` : ''} @ ${userLat},${userLng} → ${places.length} results`);
    res.json({ places });
  } catch (err) {
    console.error('getNearby error:', err.message);
    res.status(500).json({ error: err.message, places: [] });
  }
}

// ── Infer hospital specialties from place name keywords ─────────────────────
function inferSpecialties(name, _types) {
  const n = name.toLowerCase();
  const out = [];
  if (/cardio|heart/.test(n))           out.push('Cardiology');
  if (/neuro|brain/.test(n))            out.push('Neurology');
  if (/ortho|bone|spine/.test(n))       out.push('Orthopedic');
  if (/child|paed|pediatr/.test(n))     out.push('Paediatric');
  if (/eye|ophthalmo/.test(n))          out.push('Ophthalmology');
  if (/maternity|gynae|gynecol/.test(n))out.push('Maternity');
  if (/cancer|oncol/.test(n))           out.push('Oncology');
  if (/trauma|emergency/.test(n))       out.push('Trauma');
  if (out.length === 0)                  out.push('General');
  return out;
}
