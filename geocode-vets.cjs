const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://zkpnaaqmketspxcyvejd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcG5hYXFta2V0c3B4Y3l2ZWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTE1MDksImV4cCI6MjA4NzM2NzUwOX0.HDix4iR5A9qYB892E2tw98rAR7PXt6nCGmzwmznhyOI"
);

async function geocodeVets() {
  const { data: vets } = await supabase
    .from("vets")
    .select("id, name, address, city, state, zip_code")
    .eq("status", "active");

  for (const vet of vets) {
    const address = `${vet.address}, ${vet.city}, ${vet.state} ${vet.zip_code}`;
    const encoded = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;

    const res = await fetch(url, {
      headers: { "User-Agent": "PetParrk/1.0" },
    });
    const data = await res.json();

    if (data[0]) {
      const { lat, lon } = data[0];
      await supabase
        .from("vets")
        .update({ latitude: parseFloat(lat), longitude: parseFloat(lon) })
        .eq("id", vet.id);
      console.log(`✅ ${vet.name}: ${lat}, ${lon}`);
    } else {
      console.log(`❌ Not found: ${vet.name}`);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }
}

geocodeVets();
