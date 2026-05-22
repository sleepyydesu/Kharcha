// Receiver mapping for all service providers
// Maps service providers to their organization account_ids from the DB

export const RECEIVERS = {
  TOPUP: {
    Ncell: "fbaf59a1-9820-4e94-99aa-a0eb835522b3",
    NTC: "ae60a54e-15f0-467b-a687-6e2347694ffb",
    DEFAULT: "fbaf59a1-9820-4e94-99aa-a0eb835522b3", // Ncell as default
  },

  ELECTRICITY: {
    Kathmandu: "bd51f769-9fbf-491a-8562-3d471f0cc74b",
    Lalitpur: "bd51f769-9fbf-491a-8562-3d471f0cc74b",
    Bhaktapur: "bd51f769-9fbf-491a-8562-3d471f0cc74b",
    Pokhara: "bd51f769-9fbf-491a-8562-3d471f0cc74b",
    Chitwan: "bd51f769-9fbf-491a-8562-3d471f0cc74b",
    Biratnagar: "bd51f769-9fbf-491a-8562-3d471f0cc74b",
    Butwal: "bd51f769-9fbf-491a-8562-3d471f0cc74b",
    DEFAULT: "bd51f769-9fbf-491a-8562-3d471f0cc74b",
  },

  INTERNET: {
    WorldLink: "ba485101-5e72-4760-8894-677033857d5c",
    Vianet: "89891310-72d4-49a0-8a72-4c74389d6043",
    Subisu: "11cd7cad-eb73-4b32-ad27-35606ab0b067",
    "Classic Tech": "ba485101-5e72-4760-8894-677033857d5c", // Worldlink fallback
    "Dish Home": "4ee5018c-e285-49d6-b66e-589d150efd22",
    "CG Net": "ba485101-5e72-4760-8894-677033857d5c", // Worldlink fallback
    DEFAULT: "ba485101-5e72-4760-8894-677033857d5c",
  },

  LANDLINE: {
    "Nepal Telecom": "ae60a54e-15f0-467b-a687-6e2347694ffb",
    "Smart Telecom": "ae60a54e-15f0-467b-a687-6e2347694ffb", // NTC fallback
    DEFAULT: "ae60a54e-15f0-467b-a687-6e2347694ffb",
  },

  WATER: {
    KUKL: "07e169b5-1be4-4805-bf88-c093e69942d0",
    "NWSC Kathmandu": "f0aa47c1-f58a-4065-852b-27383b4ac5ed",
    "NWSC Pokhara": "f0aa47c1-f58a-4065-852b-27383b4ac5ed",
    "Municipality Water": "f0aa47c1-f58a-4065-852b-27383b4ac5ed",
    DEFAULT: "f0aa47c1-f58a-4065-852b-27383b4ac5ed",
  },

  EDUCATION: {
    "Herald College": "63432678-5833-44df-af34-00dbb7a91ca3",
    "Herald College Kathmandu": "63432678-5833-44df-af34-00dbb7a91ca3",
    "Islington College": "d625e35d-b247-40ae-a66b-b82b1de5db31",
    "Kavya College": "1ccb974d-31d8-44f8-91c9-b705e8d6a240",
    "Apex College": "710aec45-c6aa-450d-a826-adc4c6944d85",
    DEFAULT: "63432678-5833-44df-af34-00dbb7a91ca3", // Herald as default
  },
};

export function getReceiver(category, provider) {
  const categoryMap = RECEIVERS[category];
  if (!categoryMap) return null;
  return categoryMap[provider] || categoryMap.DEFAULT || null;
}
