import type { Matter } from "../types";
import { formatFullAddress } from "./pdfFormatters";

function fullName(first: string, last: string) {
  return [first, last].map((part) => part.trim()).filter(Boolean).join(" ");
}

function listLines(items: string[]) {
  return items.filter(Boolean).join("\n");
}

function assetTotal(matter: Matter) {
  return matter.assets.reduce((sum, asset) => sum + (Number(asset.estimatedValue) || 0), 0);
}

function personLine(person: Matter["people"][number]) {
  return `${person.name || "Unnamed"} (${person.role})${person.address ? ` - ${person.address}` : ""}${person.email ? ` - ${person.email}` : ""}`;
}

function personNamesByRole(matter: Matter, roles: Matter["people"][number]["role"][]) {
  return listLines(matter.people.filter((person) => roles.includes(person.role)).map((person) => person.name || "Unnamed"));
}

function personLinesByRole(matter: Matter, roles: Matter["people"][number]["role"][]) {
  return listLines(matter.people.filter((person) => roles.includes(person.role)).map(personLine));
}

function assetLine(asset: Matter["assets"][number]) {
  const value = Number(asset.estimatedValue) || 0;
  return `${asset.assetType}: ${asset.description || "description missing"}${value ? ` - $${value.toLocaleString()}` : ""} - ownership: ${asset.ownership} - probate: ${asset.probateAsset}`;
}

function locatePersonsReview(matter: Matter) {
  const items = [
    ...matter.people.filter((person) => person.role === "unknown heir").map((person) => `${person.name || "Unnamed unknown heir"} requires unknown-heir review.`),
    ...matter.people.filter((person) => !person.address.trim()).map((person) => `${person.name || "Unnamed"} (${person.role}) has no address entered.`),
  ];
  return listLines(items);
}

export function resolveMatterPath(matter: Matter, path: string): string | number | boolean | null {
  const computed: Record<string, string | number | boolean | null> = {
    "matter.id": matter.id,
    "matter.assignedParalegal": matter.assignedParalegal,
    "matter.probateCourt": matter.probateCourt,
    "matter.estateType": matter.estateType,
    "matter.originalWillAvailable": matter.originalWillAvailable,
    "matter.willDate": matter.willDate,
    "matter.codicils": matter.codicils,
    "matter.namedExecutor": matter.namedExecutor,
    "matter.bondWaived": matter.bondWaived,
    "matter.decedent.fullName": fullName(matter.decedentFirstName, matter.decedentLastName),
    "matter.decedent.dateOfDeath": matter.dateOfDeath,
    "matter.decedent.dateOfBirth": matter.dateOfBirth,
    "matter.decedent.address.full": formatFullAddress([matter.decedentAddress, matter.decedentCity, matter.decedentState, matter.decedentZip]),
    "matter.decedent.address.street": matter.decedentAddress,
    "matter.decedent.address.city": matter.decedentCity,
    "matter.decedent.address.state": matter.decedentState,
    "matter.decedent.address.zip": matter.decedentZip,
    "matter.fiduciary.name": matter.fiduciaryName,
    "matter.fiduciary.relationship": matter.fiduciaryRelationship,
    "matter.fiduciary.address.full": matter.fiduciaryAddress,
    "matter.fiduciary.nameAndAddress": formatFullAddress([matter.fiduciaryName, matter.fiduciaryAddress]),
    "matter.fiduciary.phone": matter.fiduciaryPhone,
    "matter.fiduciary.email": matter.fiduciaryEmail,
    "matter.fiduciary.appointed": matter.fiduciaryAppointed,
    "matter.fiduciary.appointmentDate": matter.appointmentDate,
    "matter.people.heirsList": listLines(matter.people.filter((person) => ["heir", "child", "spouse", "unknown heir"].includes(person.role)).map(personLine)),
    "matter.people.beneficiariesList": listLines(matter.people.filter((person) => ["beneficiary", "child", "spouse"].includes(person.role)).map(personLine)),
    "matter.people.interestedPartiesList": listLines(matter.people.map(personLine)),
    "matter.people.spouseList": personLinesByRole(matter, ["spouse"]),
    "matter.people.childrenList": personLinesByRole(matter, ["child"]),
    "matter.people.childrenNames": personNamesByRole(matter, ["child"]),
    "matter.people.beneficiaryNames": personNamesByRole(matter, ["beneficiary"]),
    "matter.people.beneficiariesUnderWill": personLinesByRole(matter, ["beneficiary"]),
    "matter.people.unknownHeirsList": personLinesByRole(matter, ["unknown heir"]),
    "matter.people.missingAddressList": listLines(matter.people.filter((person) => !person.address.trim()).map((person) => `${person.name || "Unnamed"} (${person.role})`)),
    "matter.people.locatePersonsReview": locatePersonsReview(matter),
    "matter.assets.summary": listLines(matter.assets.map(assetLine)),
    "matter.assets.probateAssetSummary": listLines(matter.assets.filter((asset) => asset.probateAsset === "yes" || asset.probateAsset === "review").map(assetLine)),
    "matter.assets.estimatedTotalValue": assetTotal(matter),
    today: new Date().toISOString().slice(0, 10),
  };

  if (path in computed) return computed[path];
  const rawPath = path.startsWith("matter.") ? path.slice("matter.".length) : path;
  return rawPath.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) return (current as Record<string, unknown>)[key];
    return null;
  }, matter) as string | number | boolean | null;
}
