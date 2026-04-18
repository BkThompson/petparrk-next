#!/usr/bin/env python3
"""
PetParrk - California Vet Scraper
Scrapes Google Places API for vet clinics across NorCal and SoCal
and inserts clean, deduplicated records into Supabase pending_vets table.
"""

import requests
import time
import json
import re
import sys

# ── CONFIG ────────────────────────────────────────────────────────────────────
GOOGLE_API_KEY  = "AIzaSyBOhz7dVKLKUA_Xjcc9iNkn2Sb52-gRG4Q"
SUPABASE_URL    = "https://zkpnaaqmketspxcyvejd.supabase.co"
SUPABASE_KEY    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcG5hYXFta2V0c3B4Y3l2ZWpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTc5MTUwOSwiZXhwIjoyMDg3MzY3NTA5fQ.ZQaN5aT65Nwh7kleFCVBs6m1HTmVulfLSo3xNvSrkbw"

PLACES_URL      = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS_URL     = "https://maps.googleapis.com/maps/api/place/details/json"

# ── SEARCH TERMS ──────────────────────────────────────────────────────────────
SEARCH_QUERIES = [
    "veterinary clinic",
    "animal hospital",
    "vet clinic",
    "veterinarian",
]

# ── ALL CA CITIES TO SEARCH ───────────────────────────────────────────────────
CITIES = [
    # NorCal - Bay Area
    "Oakland CA", "San Francisco CA", "San Jose CA", "Berkeley CA",
    "Fremont CA", "Hayward CA", "Richmond CA", "Concord CA",
    "Walnut Creek CA", "Pleasanton CA", "Livermore CA", "Dublin CA",
    "San Ramon CA", "Danville CA", "Antioch CA", "Pittsburg CA",
    "Brentwood CA", "Oakley CA", "Martinez CA", "Pleasant Hill CA",
    "Alamo CA", "Lafayette CA", "Orinda CA", "Moraga CA",
    "San Leandro CA", "San Lorenzo CA", "Castro Valley CA", "Union City CA",
    "Newark CA", "Milpitas CA", "Santa Clara CA", "Sunnyvale CA",
    "Mountain View CA", "Palo Alto CA", "Menlo Park CA", "Redwood City CA",
    "San Mateo CA", "Foster City CA", "Burlingame CA", "San Bruno CA",
    "South San Francisco CA", "Daly City CA", "Pacifica CA",
    "Half Moon Bay CA", "Los Altos CA", "Los Gatos CA", "Campbell CA",
    "Saratoga CA", "Cupertino CA", "Gilroy CA", "Morgan Hill CA",

    # NorCal - North Bay
    "San Rafael CA", "Novato CA", "Mill Valley CA", "Sausalito CA",
    "Tiburon CA", "Corte Madera CA", "Larkspur CA", "Greenbrae CA",
    "San Anselmo CA", "Fairfax CA", "Petaluma CA", "Santa Rosa CA",
    "Rohnert Park CA", "Cotati CA", "Sebastopol CA", "Healdsburg CA",
    "Windsor CA", "Cloverdale CA", "Sonoma CA", "Napa CA",
    "American Canyon CA", "St Helena CA", "Calistoga CA",
    "Vallejo CA", "Benicia CA", "Fairfield CA", "Vacaville CA",
    "Dixon CA", "Suisun City CA",

    # NorCal - Sacramento Region
    "Sacramento CA", "Elk Grove CA", "Roseville CA", "Folsom CA",
    "Rancho Cordova CA", "Citrus Heights CA", "Antelope CA",
    "Rocklin CA", "Lincoln CA", "Auburn CA", "Grass Valley CA",
    "Davis CA", "Woodland CA", "Winters CA", "West Sacramento CA",

    # NorCal - Central Valley
    "Stockton CA", "Modesto CA", "Turlock CA", "Merced CA",
    "Fresno CA", "Clovis CA", "Visalia CA", "Tulare CA",
    "Bakersfield CA", "Hanford CA", "Porterville CA",

    # NorCal - North
    "Chico CA", "Redding CA", "Red Bluff CA", "Yuba City CA",
    "Marysville CA",

    # SoCal - Los Angeles County
    "Los Angeles CA", "Long Beach CA", "Glendale CA", "Pasadena CA",
    "Torrance CA", "Burbank CA", "Inglewood CA", "Compton CA",
    "Carson CA", "El Monte CA", "Downey CA", "West Covina CA",
    "Pomona CA", "Norwalk CA", "Palmdale CA", "Lancaster CA",
    "Santa Clarita CA", "Thousand Oaks CA", "Simi Valley CA",
    "Santa Monica CA", "Venice CA", "Culver City CA", "Beverly Hills CA",
    "West Hollywood CA", "Studio City CA", "Sherman Oaks CA",
    "Van Nuys CA", "Chatsworth CA", "Encino CA", "Reseda CA",
    "North Hollywood CA", "Canoga Park CA", "Woodland Hills CA",
    "Tarzana CA", "Calabasas CA", "Malibu CA", "Manhattan Beach CA",
    "Redondo Beach CA", "Hermosa Beach CA", "El Segundo CA",
    "Hawthorne CA", "Gardena CA", "Lomita CA", "San Pedro CA",
    "Whittier CA", "La Mirada CA", "Cerritos CA", "Lakewood CA",
    "Signal Hill CA", "Bellflower CA", "Paramount CA", "Lynwood CA",
    "South Gate CA", "Huntington Park CA", "Maywood CA",
    "Bell CA", "Bell Gardens CA", "Commerce CA", "Montebello CA",
    "Pico Rivera CA", "La Puente CA", "Industry CA", "Azusa CA",
    "Covina CA", "Glendora CA", "San Dimas CA", "La Verne CA",
    "Claremont CA", "Upland CA", "Monrovia CA", "Arcadia CA",
    "Temple City CA", "San Gabriel CA", "Rosemead CA", "Alhambra CA",
    "Monterey Park CA", "Montebello CA", "East Los Angeles CA",
    "Boyle Heights CA", "Eagle Rock CA", "Highland Park CA",

    # SoCal - Orange County
    "Anaheim CA", "Santa Ana CA", "Irvine CA", "Garden Grove CA",
    "Huntington Beach CA", "Fullerton CA", "Orange CA", "Costa Mesa CA",
    "Mission Viejo CA", "Westminster CA", "Newport Beach CA",
    "Buena Park CA", "Lake Forest CA", "Tustin CA", "Yorba Linda CA",
    "San Clemente CA", "Laguna Niguel CA", "Laguna Beach CA",
    "Dana Point CA", "San Juan Capistrano CA", "Aliso Viejo CA",
    "Rancho Santa Margarita CA", "Coto de Caza CA", "Brea CA",
    "Placentia CA", "La Habra CA", "Cypress CA", "Los Alamitos CA",
    "Seal Beach CA", "Fountain Valley CA", "Stanton CA",

    # SoCal - San Diego County
    "San Diego CA", "Chula Vista CA", "Oceanside CA", "Escondido CA",
    "Carlsbad CA", "El Cajon CA", "Vista CA", "San Marcos CA",
    "Encinitas CA", "National City CA", "La Mesa CA", "Santee CA",
    "Spring Valley CA", "Poway CA", "Lemon Grove CA", "Coronado CA",
    "Del Mar CA", "Solana Beach CA", "Rancho Santa Fe CA",
    "La Jolla CA", "Pacific Beach CA", "Mission Beach CA",
    "Ocean Beach CA", "Point Loma CA", "Mission Hills CA",
    "North Park CA", "Hillcrest CA", "Normal Heights CA",
    "Kensington CA", "Allied Gardens CA", "San Carlos CA",
    "Tierrasanta CA", "Scripps Ranch CA", "Mira Mesa CA",
    "Rancho Bernardo CA", "Rancho Penasquitos CA", "Carmel Valley CA",

    # SoCal - Inland Empire
    "San Bernardino CA", "Riverside CA", "Fontana CA", "Moreno Valley CA",
    "Ontario CA", "Rancho Cucamonga CA", "Corona CA", "Victorville CA",
    "Rialto CA", "Murrieta CA", "Temecula CA", "Hesperia CA",
    "Chino CA", "Chino Hills CA", "Redlands CA", "Highland CA",
    "Colton CA", "Loma Linda CA", "Yucaipa CA", "Perris CA",
    "Hemet CA", "Lake Elsinore CA", "Menifee CA", "Wildomar CA",
    "Norco CA", "Eastvale CA", "Jurupa Valley CA",

    # SoCal - Other
    "Oxnard CA", "Ventura CA", "Camarillo CA", "Santa Barbara CA",
    "Goleta CA", "Lompoc CA", "Santa Maria CA", "San Luis Obispo CA",
    "Paso Robles CA", "Atascadero CA", "Arroyo Grande CA",
    "Palmdale CA", "Lancaster CA", "Victorville CA", "Apple Valley CA",
    "Barstow CA", "Palm Springs CA", "Palm Desert CA",
    "Cathedral City CA", "Indio CA", "Coachella CA",
]

# Remove duplicates from city list
CITIES = list(dict.fromkeys(CITIES))

# ── KEYWORDS THAT INDICATE NOT A VET CLINIC ───────────────────────────────────
EXCLUDE_KEYWORDS = [
    'pet store', 'pet food', 'petco', 'petsmart', 'pet supply',
    'grooming', 'boarding', 'kennel', 'pet hotel', 'doggy daycare',
    'dog park', 'pet resort', 'training', 'obedience',
    'pet sitting', 'dog walking', 'aquarium', 'zoo',
    'taxidermy', 'feed store', 'farm supply',
]

# ── HELPERS ───────────────────────────────────────────────────────────────────
def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

def load_existing_phones():
    """Load all existing phone numbers from pending_vets to avoid duplicates."""
    print("Loading existing vets from Supabase...")
    url = f"{SUPABASE_URL}/rest/v1/pending_vets?select=phone,name&limit=10000"
    r = requests.get(url, headers=get_supabase_headers())
    if r.status_code == 200:
        data = r.json()
        phones = set()
        names = set()
        for row in data:
            if row.get('phone'):
                phones.add(clean_phone(row['phone']))
            if row.get('name'):
                names.add(row['name'].lower().strip())
        print(f"Found {len(phones)} existing phone numbers, {len(names)} existing names")
        return phones, names
    else:
        print(f"Warning: Could not load existing vets: {r.status_code}")
        return set(), set()

def clean_phone(phone):
    """Normalize phone number to digits only for comparison."""
    if not phone:
        return ''
    return re.sub(r'\D', '', str(phone))

def is_excluded(name, types):
    """Check if a place should be excluded."""
    name_lower = name.lower()
    for keyword in EXCLUDE_KEYWORDS:
        if keyword in name_lower:
            return True
    # Must have vet-related type or name
    vet_types = {'veterinary_care', 'animal_hospital'}
    vet_words = ['vet', 'animal', 'pet hospital', 'spay', 'neuter', 'canine', 'feline', 'equine', 'humane']
    has_vet_type = bool(vet_types.intersection(set(types or [])))
    has_vet_word = any(w in name_lower for w in vet_words)
    if not has_vet_type and not has_vet_word:
        return True
    return False

def format_hours(periods):
    """Format opening hours from Places API."""
    if not periods:
        return None
    days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    result = []
    for period in periods:
        open_day = period.get('open', {}).get('day', 0)
        open_time = period.get('open', {}).get('time', '0000')
        close_time = period.get('close', {}).get('time', '0000') if period.get('close') else None

        day_name = days[open_day % 7]
        if close_time is None:
            result.append(f"{day_name}: Open 24 hours")
        else:
            def fmt(t):
                h, m = int(t[:2]), int(t[2:])
                period_str = 'AM' if h < 12 else 'PM'
                h = h % 12 or 12
                return f"{h}:{m:02d} {period_str}"
            result.append(f"{day_name}: {fmt(open_time)} – {fmt(close_time)}")
    return '\n'.join(result)

def get_place_details(place_id):
    """Get detailed info for a place."""
    params = {
        'place_id': place_id,
        'fields': 'name,formatted_phone_number,formatted_address,opening_hours,website,types,address_components',
        'key': GOOGLE_API_KEY,
    }
    r = requests.get(DETAILS_URL, params=params)
    if r.status_code == 200:
        return r.json().get('result', {})
    return {}

def extract_city_from_components(components):
    """Extract city from address components."""
    for comp in components:
        if 'locality' in comp.get('types', []):
            return comp['long_name']
    for comp in components:
        if 'sublocality' in comp.get('types', []):
            return comp['long_name']
    return None

def extract_zip_from_components(components):
    """Extract zip code from address components."""
    for comp in components:
        if 'postal_code' in comp.get('types', []):
            return comp['long_name']
    return None

def extract_state_from_components(components):
    """Extract state from address components."""
    for comp in components:
        if 'administrative_area_level_1' in comp.get('types', []):
            return comp['short_name']
    return None

def insert_vet(vet_data):
    """Insert a vet into Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/pending_vets"
    r = requests.post(url, headers=get_supabase_headers(), json=vet_data)
    return r.status_code in [200, 201]

def search_places(query, city):
    """Search Google Places for vets in a city."""
    results = []
    params = {
        'query': f"{query} in {city}",
        'key': GOOGLE_API_KEY,
        'type': 'veterinary_care',
    }

    while True:
        r = requests.get(PLACES_URL, params=params)
        if r.status_code != 200:
            break
        data = r.json()
        results.extend(data.get('results', []))

        next_token = data.get('next_page_token')
        if not next_token:
            break
        # Must wait before using next page token
        time.sleep(2)
        params = {'pagetoken': next_token, 'key': GOOGLE_API_KEY}

    return results

# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("PetParrk California Vet Scraper")
    print("=" * 60)

    existing_phones, existing_names = load_existing_phones()

    total_inserted = 0
    total_skipped  = 0
    total_excluded = 0
    seen_place_ids = set()

    for city in CITIES:
        city_inserted = 0
        print(f"\n📍 Searching: {city}")

        for query in SEARCH_QUERIES:
            places = search_places(query, city)

            for place in places:
                place_id = place.get('place_id')
                if not place_id or place_id in seen_place_ids:
                    continue
                seen_place_ids.add(place_id)

                name  = place.get('name', '')
                types = place.get('types', [])

                # Exclude non-vet businesses
                if is_excluded(name, types):
                    total_excluded += 1
                    continue

                # Get full details
                details = get_place_details(place_id)
                time.sleep(0.1)

                phone = details.get('formatted_phone_number', '')
                components = details.get('address_components', [])
                actual_city = extract_city_from_components(components)
                zip_code    = extract_zip_from_components(components)
                state       = extract_state_from_components(components)

                # Only CA vets
                if state and state != 'CA':
                    total_excluded += 1
                    continue

                # Dedup by phone
                clean_ph = clean_phone(phone)
                if clean_ph and clean_ph in existing_phones:
                    total_skipped += 1
                    continue

                # Dedup by name
                name_lower = name.lower().strip()
                if name_lower in existing_names:
                    total_skipped += 1
                    continue

                # Format hours
                opening_hours = details.get('opening_hours', {})
                hours_str = format_hours(opening_hours.get('periods', []))
                if not hours_str and opening_hours.get('weekday_text'):
                    hours_str = '\n'.join(opening_hours['weekday_text'])

                address = details.get('formatted_address', '')
                # Strip city, state, zip, country from address for cleaner storage
                address_clean = re.sub(r',\s*[^,]+,\s*CA\s*\d{5}.*$', '', address).strip()

                vet_data = {
                    'name':      name,
                    'phone':     phone or None,
                    'address':   address_clean or None,
                    'city':      actual_city or city.replace(' CA', ''),
                    'zip_code':  zip_code or None,
                    'state':     'CA',
                    'website':   details.get('website') or None,
                    'hours':     hours_str or None,
                    'vet_type':  'General Practice',
                    'source':    'Google Places',
                    'status':    'pending',
                    'notes':     None,
                    'neighborhood': None,
                }

                if insert_vet(vet_data):
                    existing_phones.add(clean_ph)
                    existing_names.add(name_lower)
                    total_inserted += 1
                    city_inserted  += 1
                    print(f"  ✅ {name} — {actual_city}")
                else:
                    total_skipped += 1

            time.sleep(0.5)

        print(f"  → {city_inserted} new vets added")

    print("\n" + "=" * 60)
    print(f"COMPLETE")
    print(f"  Inserted:  {total_inserted}")
    print(f"  Skipped (duplicates): {total_skipped}")
    print(f"  Excluded (non-vets): {total_excluded}")
    print("=" * 60)

if __name__ == '__main__':
    main()
