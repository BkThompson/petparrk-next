import { supabase } from "../../../lib/supabase";

export async function generateMetadata({ params }) {
  const { petId } = params;

  const { data: pet } = await supabase
    .from("pets")
    .select("name, species, breed")
    .eq("id", petId)
    .single();

  if (!pet) {
    return {
      title: "Pet Medical Card | PetParrk",
      description: "View this pet's medical card on PetParrk.",
    };
  }

  const speciesEmoji =
    pet.species === "Dog"
      ? "🐶"
      : pet.species === "Cat"
      ? "🐱"
      : pet.species === "Bird"
      ? "🐦"
      : "🐾";
  const title = `${pet.name}'s Medical Card ${speciesEmoji}`;
  const description = `${pet.name} is a ${
    pet.breed || pet.species
  }. View their medical info, allergies, medications, and owner contact.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "PetParrk",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function PetCardLayout({ children }) {
  return children;
}
