import { deadlineRuleConfig } from "../data/constants";
import type { Matter, RiskFlag } from "../types";
import { daysSince, isOverdue } from "./date";
import { matterHasCtRealEstate } from "./deadlineEngine";

function flag(label: string, description: string, severity: RiskFlag["severity"] = "medium"): RiskFlag {
  return {
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    description,
    severity,
    recommendedAction: "Attorney/paralegal review recommended",
  };
}

export function generateRiskFlags(matter: Matter): RiskFlag[] {
  const totalAssets = matter.assets.reduce((sum, asset) => sum + (Number(asset.estimatedValue) || 0), 0);
  const flags: RiskFlag[] = [];

  if (matter.attorneyReviewRequired || matter.status === "Attorney review") flags.push(flag("Attorney review required", "The matter has been marked for legal team review.", "high"));
  if (!matter.appointmentDate) flags.push(flag("No appointment date entered", "Fiduciary appointment timing is not yet tracked.", "medium"));
  if (matterHasCtRealEstate(matter)) flags.push(flag("Connecticut real estate present", "A Connecticut real estate asset is listed.", "high"));
  if (matter.assets.some((asset) => asset.probateAsset === "review" || asset.ctTaxableReportable === "review")) flags.push(flag("Asset probate/reportable review", "One or more assets require probate or Connecticut reportable status review.", "medium"));
  if (matter.originalWillAvailable !== "yes") flags.push(flag("Missing original will", "Original will status is not confirmed as available.", "high"));
  if (matter.bondWaived === "unknown") flags.push(flag("Bond status unknown", "Bond waiver status has not been confirmed.", "medium"));
  if (matter.people.some((person) => person.role === "minor beneficiary" || person.role === "unknown heir")) flags.push(flag("Minor beneficiary or unknown heir issue", "Interested party list includes a minor beneficiary or unknown heir.", "high"));
  if (totalAssets > deadlineRuleConfig.highValueTaxReviewThreshold) flags.push(flag("Tax threshold review", "Estimated assets exceed the configured tax review threshold.", "high"));
  if (matter.tasks.some((task) => isOverdue(task.dueDate, task.status))) flags.push(flag("Overdue tasks exist", "One or more open tasks are past due.", "high"));
  if (daysSince(matter.updatedAt) > deadlineRuleConfig.inactiveMatterDays && matter.status !== "Closed") flags.push(flag("Matter inactive for more than 30 days", "The matter has not been updated recently.", "medium"));
  if (matter.people.some((person) => person.role === "creditor")) flags.push(flag("Creditor claim received", "A creditor is listed among interested parties.", "medium"));
  if (matter.estateType === "Ancillary" || matter.assets.some((asset) => /out-of-state|outside ct|non-ct/i.test(asset.notes))) flags.push(flag("Out-of-state asset or ancillary review", "The matter may require ancillary or out-of-state asset review.", "high"));
  if (matter.assets.some((asset) => asset.assetType === "business interest")) flags.push(flag("Business interest valuation review", "A business interest is listed and may require valuation review.", "medium"));

  return flags;
}
