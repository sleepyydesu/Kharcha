import topupIcon from "../assets/topupIcon.svg";
import internetIcon from "../assets/internetIcon.svg";
import landlineIcon from "../assets/landlineIcon.svg";
import waterIcon from "../assets/waterIcon.svg";
import electricityIcon from "../assets/electricityIcon.svg";
import educationIcon from "../assets/educationIcon.svg";

export const SERVICE_UI = {
  topup: {
    label: "Mobile Topup",
    shortLabel: "Topup",
    description: "Recharge Ncell or NTC",
    icon: topupIcon,
    color: "#16a34a",
    orgTypeId: 2,
    providerNames: ["Ncell", "NTC"],
  },
  internet: {
    label: "Internet Bill",
    shortLabel: "Internet",
    description: "Pay your ISP bill",
    icon: internetIcon,
    color: "#2563eb",
    orgTypeId: 6,
  },
  landline: {
    label: "Landline Bill",
    shortLabel: "Landline",
    description: "Nepal Telecom bills",
    icon: landlineIcon,
    color: "#7c3aed",
    orgTypeId: 2,
    providerNames: ["NTC"],
  },
  water: {
    label: "Water Bill",
    shortLabel: "Water",
    description: "KUKL and water utilities",
    icon: waterIcon,
    color: "#0284c7",
    orgTypeId: 3,
  },
  electricity: {
    label: "Electricity Bill",
    shortLabel: "Electricity",
    description: "Pay NEA instantly",
    icon: electricityIcon,
    color: "#d97706",
    orgTypeId: 4,
  },
  education: {
    label: "School / College Fee",
    shortLabel: "Education",
    description: "Tuition and college fees",
    icon: educationIcon,
    color: "#0f766e",
    orgTypeId: 5,
  },
};
